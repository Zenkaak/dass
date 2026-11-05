-- Persistent buyer delivery preference. One default per DASNET buyer identity.
CREATE TABLE public.buyer_delivery_preferences (
  buyer_user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  delivery_method text NOT NULL CHECK (delivery_method IN ('home','pickup')),
  delivery_county text NOT NULL,
  delivery_sub_county text NOT NULL,
  delivery_estate text NOT NULL,
  delivery_address text NOT NULL,
  delivery_directions text,
  pickup_station text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buyer_delivery_preferences_pickup_station_check
    CHECK (delivery_method <> 'pickup' OR NULLIF(btrim(pickup_station),'') IS NOT NULL)
);
