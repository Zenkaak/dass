-- Backfill subdomains for existing DASNET shops without changing tenant IDs or data.
-- Safe to run repeatedly. Legacy /:slug routes remain supported by the application.

CREATE TABLE IF NOT EXISTS public.shop_domain_migration_report (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  legacy_path text NOT NULL,
  subdomain_hostname text NOT NULL,
  migration_status text NOT NULL CHECK (
    migration_status IN ('created', 'already_present', 'custom_primary_preserved', 'reserved_slug', 'hostname_conflict')
  ),
  checked_at timestamptz NOT NULL DEFAULT now()
);

WITH candidates AS (
  SELECT
    t.id AS tenant_id,
    t.slug,
    t.slug || '.dasmarket.co.ke' AS hostname,
    EXISTS (
      SELECT 1 FROM public.domains d
      WHERE d.tenant_id = t.id AND d.is_primary = true
        AND d.hostname <> t.slug || '.dasmarket.co.ke'
    ) AS has_custom_primary
  FROM public.tenants t
  WHERE t.status IN ('trial', 'active', 'past_due', 'suspended')
),
inserted AS (
  INSERT INTO public.domains (tenant_id, hostname, is_primary, verified_at)
  SELECT c.tenant_id, c.hostname, NOT c.has_custom_primary, NULL
  FROM candidates c
  WHERE c.slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'
    AND c.slug NOT IN ('www', 'app', 'api', 'admin', 'mail', 'support', 'help', 'status')
    AND NOT EXISTS (
      SELECT 1 FROM public.domains d
      WHERE d.tenant_id = c.tenant_id AND d.hostname = c.hostname
    )
  ON CONFLICT (hostname) DO NOTHING
  RETURNING tenant_id, hostname
),
classified AS (
  SELECT
    c.tenant_id,
    c.slug,
    c.hostname,
    CASE
      WHEN c.slug IN ('www', 'app', 'api', 'admin', 'mail', 'support', 'help', 'status')
        THEN 'reserved_slug'
      WHEN EXISTS (SELECT 1 FROM inserted i WHERE i.tenant_id = c.tenant_id)
        THEN 'created'
      WHEN EXISTS (
        SELECT 1 FROM public.domains d
        WHERE d.tenant_id = c.tenant_id AND d.hostname = c.hostname
      ) AND c.has_custom_primary
        THEN 'custom_primary_preserved'
      WHEN EXISTS (
        SELECT 1 FROM public.domains d
        WHERE d.tenant_id = c.tenant_id AND d.hostname = c.hostname
      )
        THEN 'already_present'
      ELSE 'hostname_conflict'
    END AS migration_status
  FROM candidates c
)
INSERT INTO public.shop_domain_migration_report
  (tenant_id, legacy_path, subdomain_hostname, migration_status, checked_at)
SELECT tenant_id, '/' || slug, hostname, migration_status, now()
FROM classified
ON CONFLICT (tenant_id) DO UPDATE SET
  legacy_path = EXCLUDED.legacy_path,
  subdomain_hostname = EXCLUDED.subdomain_hostname,
  migration_status = EXCLUDED.migration_status,
  checked_at = now();

-- Summary for operators:
-- SELECT migration_status, count(*) FROM public.shop_domain_migration_report GROUP BY migration_status;
