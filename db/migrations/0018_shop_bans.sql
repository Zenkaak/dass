ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ban_reason text, ADD COLUMN IF NOT EXISTS status_before_ban text;
