CREATE TABLE IF NOT EXISTS public.payment_email_deliveries (
 id bigserial PRIMARY KEY,
 tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
 payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
 recipient_type text NOT NULL CHECK(recipient_type IN ('buyer','seller')),
 recipient_email text NOT NULL,
 subject text NOT NULL,
 html text NOT NULL,
 text text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent')),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 last_error text,
 sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(payment_id,recipient_type)
);
CREATE INDEX IF NOT EXISTS payment_email_deliveries_due_idx ON public.payment_email_deliveries(status,next_attempt_at);
