-- DASMARKET now sells one full-access subscription with four payment durations.
-- Keep historical plan rows for existing subscription foreign keys, but make every
-- historical subscription full-access and offer only the four standard durations.
UPDATE public.subscription_plans
SET features='{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb,
    is_active=false,
    is_featured=false;

INSERT INTO public.subscription_plans
  (code,name,description,price_minor,currency,interval_days,is_active,is_featured,sort_order,features)
VALUES
  ('access-monthly','Monthly access','Full DASMARKET access for one month.',78000,'KES',30,true,false,10,'{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb),
  ('access-3-months','3-month access','Full DASMARKET access for three months.',180000,'KES',90,true,false,20,'{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb),
  ('access-6-months','6-month access','Full DASMARKET access for six months.',470000,'KES',180,true,false,30,'{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb),
  ('access-annual','Annual access','Full DASMARKET access for twelve months.',800000,'KES',365,true,true,40,'{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb)
ON CONFLICT(code) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  price_minor=EXCLUDED.price_minor,
  currency=EXCLUDED.currency,
  interval_days=EXCLUDED.interval_days,
  is_active=true,
  is_featured=EXCLUDED.is_featured,
  sort_order=EXCLUDED.sort_order,
  features=EXCLUDED.features;
