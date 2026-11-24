ALTER TABLE public.tenant_paystack_configs
  DROP CONSTRAINT IF EXISTS tenant_paystack_configs_settlement_status_check;
ALTER TABLE public.tenant_paystack_configs
  ADD CONSTRAINT tenant_paystack_configs_settlement_status_check
  CHECK (settlement_status IN ('not_submitted','pending','pending_verification','action_required','verified','failed'));
ALTER TABLE public.tenant_paystack_configs
  DROP CONSTRAINT IF EXISTS tenant_paystack_configs_subaccount_status_check;
ALTER TABLE public.tenant_paystack_configs
  ADD CONSTRAINT tenant_paystack_configs_subaccount_status_check
  CHECK (subaccount_status IN ('not_created','pending','pending_verification','active','inactive','failed'));