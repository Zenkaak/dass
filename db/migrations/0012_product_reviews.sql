CREATE TABLE IF NOT EXISTS public.product_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 customer_name text NOT NULL,
 rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
 review_body text NOT NULL CHECK (char_length(review_body) BETWEEN 8 AND 1200),
 status text NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_id,product_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_public_idx ON public.product_reviews(tenant_id,product_id,status,created_at DESC);
