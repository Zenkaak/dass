-- Seller phone authentication and SMS OTPs for DAS.co.ke.
-- Apply after 0001_initial_schema.sql. Additive and safe to rerun.
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_salt text;
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON public.users(phone) WHERE phone IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('signup','password_reset')),
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  request_ip_hash text
);
CREATE INDEX IF NOT EXISTS auth_otp_phone_purpose_created_idx ON public.auth_otp_challenges(phone,purpose,created_at DESC);
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON public.auth_sessions(user_id);
