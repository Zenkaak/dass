-- Add the optional one-time lifetime-use licence alongside recurring subscriptions.
-- Hosting, domains, third-party services and maintenance remain separately billable.
INSERT INTO public.subscription_plans
  (code,name,description,price_minor,currency,interval_days,is_active,is_featured,sort_order,features)
VALUES
  ('lifetime-license','Lifetime platform licence','One-time payment for lifetime use of the full DASMARKET platform for this shop. Hosting, domain renewals, third-party services and optional maintenance are billed separately.',25000000,'KES',36500,true,false,50,
   '{"product_limit":0,"staff_limit":0,"custom_domain":true,"advanced_analytics":true,"coupons":true,"promotions":true,"priority_support":true}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  price_minor=EXCLUDED.price_minor,
  currency=EXCLUDED.currency,
  interval_days=EXCLUDED.interval_days,
  is_active=true,
  features=EXCLUDED.features;
