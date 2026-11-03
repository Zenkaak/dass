-- Record privacy-preserving signup identity signals so moderation can enforce restrictions across re-registration.
CREATE TABLE IF NOT EXISTS public.auth_identity_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.store_customers(id) ON DELETE CASCADE,
  identity_type text NOT NULL CHECK (identity_type IN ('phone','email','ip')),
  identity_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((user_id IS NOT NULL)::int + (customer_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS auth_identity_signals_user_idx ON public.auth_identity_signals(user_id,identity_type);
CREATE INDEX IF NOT EXISTS auth_identity_signals_customer_idx ON public.auth_identity_signals(customer_id,identity_type);
ALTER TABLE public.auth_identity_signals ENABLE ROW LEVEL SECURITY;
