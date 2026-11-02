-- DASNET global identity and one-shop seller invariant.
-- Additive migration: preserve legacy buyer hashes/sessions for rollback compatibility.
-- Existing seller passwords always win when a global users row already exists.

ALTER TABLE public.store_customers
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- New profiles no longer store password material; legacy columns remain nullable
-- during the rollback window and existing hashes are retained for reconciliation.
ALTER TABLE public.store_customers ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.store_customers ALTER COLUMN password_salt DROP NOT NULL;

-- Create global identities only for legacy buyer phones that have one unambiguous,
-- verified password source. Existing global seller identities are never overwritten.
WITH safe_legacy AS (
  SELECT
    phone,
    (array_agg(full_name ORDER BY created_at ASC, id ASC))[1] AS display_name,
    (array_agg(password_hash ORDER BY created_at ASC, id ASC))[1] AS password_hash,
    (array_agg(password_salt ORDER BY created_at ASC, id ASC))[1] AS password_salt
  FROM public.store_customers
  GROUP BY phone
  HAVING COUNT(DISTINCT password_hash || ':' || password_salt) = 1
     AND bool_and(phone_verified_at IS NOT NULL)
)
INSERT INTO public.users (email, display_name, password_hash, password_salt, phone, phone_verified_at)
SELECT NULL, s.display_name, s.password_hash, s.password_salt, s.phone, now()
FROM safe_legacy s
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.phone = s.phone)
ON CONFLICT (phone) WHERE phone IS NOT NULL DO NOTHING;

-- Link every profile to the canonical global identity for its verified phone.
-- Do not copy or modify password material on an existing global user.
UPDATE public.store_customers c
SET user_id = u.id, updated_at = now()
FROM public.users u
WHERE c.user_id IS NULL
  AND c.phone = u.phone
  AND u.phone_verified_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS store_customers_tenant_user_unique
  ON public.store_customers (tenant_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_customers_user_tenant_idx
  ON public.store_customers (user_id, tenant_id)
  WHERE user_id IS NOT NULL;

-- A seller identity may own/join only one shop. Buyer profiles remain unlimited
-- across tenants because they live in store_customers, not memberships.
CREATE UNIQUE INDEX IF NOT EXISTS memberships_one_shop_per_user
  ON public.memberships (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_one_shop_per_creator
  ON public.tenants (created_by)
  WHERE created_by IS NOT NULL;

-- Preserve a privacy-safe report of any legacy profiles that need verified
-- account recovery before they can be linked to a global identity.
CREATE TABLE IF NOT EXISTS public.identity_migration_issues (
  id bigserial PRIMARY KEY,
  phone_hash text NOT NULL,
  issue_code text NOT NULL,
  profile_count integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (phone_hash, issue_code)
);

INSERT INTO public.identity_migration_issues (phone_hash, issue_code, profile_count)
SELECT encode(digest(c.phone, 'sha256'), 'hex'),
       'UNLINKED_PROFILE_REQUIRES_VERIFIED_RECONCILIATION',
       count(*)::int
FROM public.store_customers c
WHERE c.user_id IS NULL
GROUP BY c.phone
ON CONFLICT (phone_hash, issue_code)
DO UPDATE SET profile_count = EXCLUDED.profile_count;
