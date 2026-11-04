-- Durable post-settlement reconciliation for verified M-PESA order payments.
-- Callback settlement and job creation occur in one SQL statement.
CREATE TABLE IF NOT EXISTS public.payment_reconciliation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_reconciliation_pending_idx
  ON public.payment_reconciliation_jobs(status, created_at)
  WHERE status IN ('pending','processing');
