-- Storefront templates are now fixed; the saved setting is an accent colour only.
UPDATE public.sites
SET storefront_theme = '#e47a13'
WHERE storefront_theme IS NULL
   OR storefront_theme !~* '^#[0-9a-f]{6}$';
ALTER TABLE public.sites
  ALTER COLUMN storefront_theme SET DEFAULT '#e47a13';
