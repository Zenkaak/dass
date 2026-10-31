ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS storefront_theme text NOT NULL DEFAULT 'marketplace';
