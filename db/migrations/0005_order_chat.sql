-- Order-linked customer/merchant messaging with opaque customer access tokens.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_chat_token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_chat_token_hash_uq
  ON public.orders(customer_chat_token_hash) WHERE customer_chat_token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('merchant','customer')),
  sender_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id,order_id) REFERENCES public.orders(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS order_messages_thread_idx
  ON public.order_messages(tenant_id,order_id,created_at);
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.order_messages;
CREATE POLICY tenant_isolation ON public.order_messages
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
