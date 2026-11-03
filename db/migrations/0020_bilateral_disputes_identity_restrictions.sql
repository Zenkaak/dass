-- Bilateral buyer/seller dispute workflow with auditable resolution and identity restrictions.
ALTER TABLE public.shop_complaints
  ADD COLUMN IF NOT EXISTS dispute_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS dispute_initiated_by text NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS dispute_deadline_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_proposed_by text,
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS resolution_proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_closed_at timestamptz;

UPDATE public.shop_complaints
SET dispute_deadline_at = COALESCE(dispute_deadline_at, created_at + interval '1 hour')
WHERE dispute_deadline_at IS NULL;

ALTER TABLE public.shop_complaints
  DROP CONSTRAINT IF EXISTS shop_complaints_dispute_status_check;
ALTER TABLE public.shop_complaints
  ADD CONSTRAINT shop_complaints_dispute_status_check
  CHECK (dispute_status IN ('open','resolution_pending','resolved','escalated','closed'));

CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  complaint_id uuid NOT NULL REFERENCES public.shop_complaints(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','seller','admin','system')),
  sender_id uuid,
  sender_name text NOT NULL,
  message text NOT NULL CHECK (length(message) BETWEEN 1 AND 4000),
  mentions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dispute_messages_case_idx
  ON public.dispute_messages(tenant_id,complaint_id,created_at);

CREATE TABLE IF NOT EXISTS public.dispute_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  complaint_id uuid NOT NULL REFERENCES public.shop_complaints(id) ON DELETE CASCADE,
  recipient_role text NOT NULL CHECK (recipient_role IN ('buyer','seller','admin')),
  recipient_phone text,
  recipient_user_id uuid,
  title text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS dispute_notifications_inbox_idx
  ON public.dispute_notifications(tenant_id,recipient_role,created_at DESC);

CREATE TABLE IF NOT EXISTS public.identity_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_type text NOT NULL CHECK (identity_type IN ('phone','email','ip')),
  identity_hash text NOT NULL,
  restriction_scope text NOT NULL CHECK (restriction_scope IN ('buyer','seller','all')),
  reason text NOT NULL,
  source_complaint_id uuid REFERENCES public.shop_complaints(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE(identity_type,identity_hash,restriction_scope)
);
CREATE INDEX IF NOT EXISTS identity_restrictions_active_idx
  ON public.identity_restrictions(identity_type,identity_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_restrictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.dispute_messages;
CREATE POLICY tenant_isolation ON public.dispute_messages
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
DROP POLICY IF EXISTS tenant_isolation ON public.dispute_notifications;
CREATE POLICY tenant_isolation ON public.dispute_notifications
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
