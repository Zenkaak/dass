CREATE INDEX IF NOT EXISTS products_tenant_active_created_idx
  ON public.products (tenant_id, is_active, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS products_active_category_created_idx
  ON public.products (tenant_id, lower(trim(COALESCE(metadata->>'category', ''))), created_at DESC, id DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS products_active_parent_category_created_idx
  ON public.products (tenant_id, lower(trim(COALESCE(metadata->>'parent_category', ''))), created_at DESC, id DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_reviews_product_status_idx
  ON public.product_reviews (product_id, status);
