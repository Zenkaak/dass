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

INSERT INTO public.subscription_plans(code,name,description,price_minor,currency,interval_days,is_active,is_featured,sort_order,features)
VALUES
 ('starter-30','Starter','For individuals and small businesses getting started online.',50000,'KES',30,true,false,10,'{"product_limit":50,"staff_limit":1,"custom_domain":false,"advanced_analytics":false,"coupons":false,"promotions":false,"priority_support":false}'::jsonb),
 ('growth-30','Growth','For established sellers who need more tools to grow.',100000,'KES',30,true,true,20,'{"product_limit":500,"staff_limit":2,"custom_domain":false,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb),
 ('business-30','Business','For larger shops and growing brands.',200000,'KES',30,true,false,30,'{"product_limit":0,"staff_limit":5,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb),
 ('enterprise-30','Enterprise','For high-volume retailers and complex operations.',500000,'KES',30,true,false,40,'{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb)
ON CONFLICT (code) DO NOTHING;
