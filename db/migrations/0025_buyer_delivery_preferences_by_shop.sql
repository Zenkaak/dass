-- Keep buyer delivery defaults scoped to the shop-specific buyer identity.
-- The older unscoped table is intentionally not used by the storefront.
CREATE TABLE IF NOT EXISTS public.buyer_delivery_preferences_by_shop (
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  buyer_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('home','pickup')),
  delivery_county text NOT NULL,
  delivery_sub_county text NOT NULL,
  delivery_estate text NOT NULL,
  delivery_address text NOT NULL,
  delivery_directions text,
  pickup_station text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, buyer_user_id),
  CONSTRAINT buyer_delivery_preferences_by_shop_pickup_check
    CHECK (delivery_method <> 'pickup' OR NULLIF(btrim(pickup_station),'') IS NOT NULL)
);
