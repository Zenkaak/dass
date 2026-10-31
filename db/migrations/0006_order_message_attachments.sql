-- Private file attachments for customer/merchant order conversations.
CREATE TABLE IF NOT EXISTS public.order_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  uploader_type text NOT NULL CHECK (uploader_type IN ('merchant','customer')),
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 160),
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  scan_status text NOT NULL DEFAULT 'unscanned' CHECK (scan_status IN ('unscanned','clean','infected','failed')),
  upload_status text NOT NULL DEFAULT 'pending' CHECK (upload_status IN ('pending','ready')),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,order_id) REFERENCES public.orders(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS order_message_attachments_thread_idx
  ON public.order_message_attachments(tenant_id,order_id,created_at);
ALTER TABLE public.order_message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.order_message_attachments;
CREATE POLICY tenant_isolation ON public.order_message_attachments
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
