CREATE OR REPLACE FUNCTION public.reserve_inventory_for_payment(p_payment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment record;
  v_item record;
  v_deduct integer;
BEGIN
  SELECT id, tenant_id, order_id INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;

  IF EXISTS (SELECT 1 FROM public.inventory_reservations WHERE payment_id = p_payment_id) THEN
    RETURN EXISTS (SELECT 1 FROM public.inventory_reservations WHERE payment_id = p_payment_id AND status = 'active');
  END IF;

  PERFORM 1
  FROM public.products pr
  WHERE pr.tenant_id = v_payment.tenant_id
    AND pr.id IN (
      SELECT DISTINCT product_id
      FROM public.order_items
      WHERE tenant_id = v_payment.tenant_id
        AND order_id = v_payment.order_id
        AND product_id IS NOT NULL
    )
  ORDER BY pr.id
  FOR UPDATE;

  FOR v_item IN
    SELECT oi.product_id, SUM(oi.quantity)::integer AS quantity, pr.stock_quantity
    FROM public.order_items oi
    JOIN public.products pr ON pr.id = oi.product_id AND pr.tenant_id = oi.tenant_id
    WHERE oi.tenant_id = v_payment.tenant_id
      AND oi.order_id = v_payment.order_id
      AND oi.product_id IS NOT NULL
    GROUP BY oi.product_id, pr.stock_quantity
    ORDER BY oi.product_id
  LOOP
    IF v_item.stock_quantity IS NOT NULL AND v_item.stock_quantity > 0 THEN
      v_deduct := LEAST(v_item.stock_quantity, v_item.quantity);
      UPDATE public.products
      SET stock_quantity = stock_quantity - v_deduct,
          updated_at = now()
      WHERE id = v_item.product_id
        AND tenant_id = v_payment.tenant_id;

      INSERT INTO public.inventory_reservations(
        tenant_id, order_id, payment_id, product_id, quantity, stock_tracked, status, expires_at
      ) VALUES (
        v_payment.tenant_id, v_payment.order_id, p_payment_id, v_item.product_id, v_deduct, true, 'active', now() + interval '20 minutes'
      );
    ELSE
      INSERT INTO public.inventory_reservations(
        tenant_id, order_id, payment_id, product_id, quantity, stock_tracked, status, expires_at
      ) VALUES (
        v_payment.tenant_id, v_payment.order_id, p_payment_id, v_item.product_id, v_item.quantity, false, 'active', now() + interval '20 minutes'
      );
    END IF;
  END LOOP;

  RETURN true;
END
$function$;
