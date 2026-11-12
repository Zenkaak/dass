ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings(setting_key, setting_value)
VALUES
  ('subscription', '{"trial_days":7,"sales_commission_bps":0}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

UPDATE public.subscription_plans
SET description = COALESCE(description, ''),
    sort_order = CASE code
      WHEN 'starter-monthly' THEN 10
      ELSE sort_order
    END;
