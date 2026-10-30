ALTER TABLE public.payment_configs ADD COLUMN IF NOT EXISTS payout_method text NOT NULL DEFAULT 'till';
ALTER TABLE public.payment_configs ADD COLUMN IF NOT EXISTS account_reference text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE IF NOT EXISTS public.support_tickets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE, user_id uuid REFERENCES public.users(id) ON DELETE SET NULL, ticket_number text NOT NULL, subject text NOT NULL, category text NOT NULL DEFAULT 'general', priority text NOT NULL DEFAULT 'normal', status text NOT NULL DEFAULT 'open', message text NOT NULL, response text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,ticket_number));
CREATE INDEX IF NOT EXISTS support_tickets_tenant_created_idx ON public.support_tickets(tenant_id,created_at DESC);
