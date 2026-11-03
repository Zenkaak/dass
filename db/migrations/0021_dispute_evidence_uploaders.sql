-- Add uploader identity to the existing verified complaint-evidence pipeline.
ALTER TABLE public.shop_complaint_attachments
  ADD COLUMN IF NOT EXISTS uploader_role text NOT NULL DEFAULT 'buyer',
  ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.shop_complaint_attachments
  DROP CONSTRAINT IF EXISTS shop_complaint_attachments_uploader_role_check;
ALTER TABLE public.shop_complaint_attachments
  ADD CONSTRAINT shop_complaint_attachments_uploader_role_check
  CHECK (uploader_role IN ('buyer','seller','admin'));
