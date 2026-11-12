-- Enforce each shop's active subscription product limit at the database boundary.
-- This protects single-product creates, bulk imports and any future product insertion path.
CREATE OR REPLACE FUNCTION public.enforce_subscription_product_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_expiry timestamptz;
  v_limit integer;
  v_total integer;
BEGIN
  -- Serialize product inserts for the same shop before checking the shared count.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.tenant_id::text, 0));

  SELECT
    s.status,
    CASE
      WHEN s.status = 'trialing' THEN COALESCE(s.trial_ends_at, s.current_period_end)
      WHEN s.status = 'active' THEN s.current_period_end
      ELSE NULL
    END,
    COALESCE(NULLIF(p.features->>'product_limit', '')::integer, 50)
  INTO v_status, v_expiry, v_limit
  FROM public.subscriptions s
  JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.tenant_id = NEW.tenant_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_status NOT IN ('trialing', 'active') OR v_expiry IS NULL OR v_expiry <= now() THEN
    RAISE EXCEPTION 'SUBSCRIPTION_EXPIRED' USING ERRCODE = 'P0001';
  END IF;

  IF v_limit < 0 THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  -- A configured limit of zero means unlimited.
  IF v_limit = 0 THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer
  INTO v_total
  FROM public.products
  WHERE tenant_id = NEW.tenant_id;

  IF v_total >= v_limit THEN
    RAISE EXCEPTION 'PRODUCT_LIMIT_REACHED' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER products_subscription_limit_guard
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.enforce_subscription_product_limit();
