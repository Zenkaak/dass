CREATE TABLE IF NOT EXISTS public.store_customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 full_name text NOT NULL,
 email text,
 phone text NOT NULL,
 alternative_phone text,
 address text,
 password_hash text NOT NULL,
 password_salt text NOT NULL,
 phone_verified_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (tenant_id, phone)
);
CREATE INDEX IF NOT EXISTS store_customers_tenant_email_idx ON public.store_customers(tenant_id, lower(email));
CREATE TABLE IF NOT EXISTS public.store_customer_otp_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 phone text NOT NULL,
 purpose text NOT NULL CHECK (purpose IN ('signup','password_reset')),
 code_hash text NOT NULL,
 code_salt text NOT NULL,
 attempts integer NOT NULL DEFAULT 0,
 request_ip_hash text,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_customer_otp_lookup_idx ON public.store_customer_otp_challenges(tenant_id,phone,purpose,created_at DESC);
CREATE TABLE IF NOT EXISTS public.store_customer_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES public.store_customers(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_customer_sessions_customer_idx ON public.store_customer_sessions(tenant_id,customer_id,expires_at);
