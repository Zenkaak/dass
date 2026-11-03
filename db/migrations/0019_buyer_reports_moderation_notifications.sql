-- Buyer report tracking, time-bound moderation, and durable buyer notifications.
ALTER TABLE public.store_customers
  ADD COLUMN IF NOT EXISTS banned_until timestamptz;
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ban_expires_at timestamptz;
ALTER TABLE public.shop_complaints
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.buyer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  buyer_phone text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  complaint_id uuid REFERENCES public.shop_complaints(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS buyer_notifications_inbox_idx
  ON public.buyer_notifications(tenant_id,buyer_phone,created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_buyer_order_update() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE title_text text; detail_text text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.delivery_status IS DISTINCT FROM OLD.delivery_status THEN
    title_text := CASE
      WHEN NEW.delivery_status='delivered' AND OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN 'Order delivered'
      WHEN NEW.delivery_status='in_transit' AND OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN 'Order in transit'
      ELSE 'Order status updated'
    END;
    detail_text := 'Order '||NEW.order_number||' is now '||COALESCE(NULLIF(NEW.delivery_status,''),NEW.status)||'.';
    INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,notification_type,title,detail)
    VALUES(NEW.tenant_id,NEW.customer_phone,NEW.id,'order_update',title_text,detail_text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS buyer_order_update_notification ON public.orders;
CREATE TRIGGER buyer_order_update_notification
AFTER UPDATE OF status,delivery_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_order_update();

CREATE OR REPLACE FUNCTION public.notify_buyer_payment_update() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE ord public.orders%ROWTYPE;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT * INTO ord FROM public.orders WHERE id=NEW.order_id AND tenant_id=NEW.tenant_id;
    IF FOUND THEN
      INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,notification_type,title,detail)
      VALUES(NEW.tenant_id,ord.customer_phone,ord.id,'payment_update',
        CASE WHEN NEW.status='succeeded' THEN 'Payment confirmed' WHEN NEW.status='failed' THEN 'Payment failed' ELSE 'Payment updated' END,
        'Payment for order '||ord.order_number||' is now '||NEW.status||'.');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS buyer_payment_update_notification ON public.payments;
CREATE TRIGGER buyer_payment_update_notification
AFTER UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_payment_update();

CREATE OR REPLACE FUNCTION public.notify_buyer_merchant_message() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE ord public.orders%ROWTYPE;
BEGIN
  IF NEW.sender_type IN ('merchant','admin') THEN
    SELECT * INTO ord FROM public.orders WHERE id=NEW.order_id AND tenant_id=NEW.tenant_id;
    IF FOUND THEN
      INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,notification_type,title,detail)
      VALUES(NEW.tenant_id,ord.customer_phone,ord.id,'chat_message','New shop message','You received a new message about order '||ord.order_number||'.');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS buyer_merchant_message_notification ON public.order_messages;
CREATE TRIGGER buyer_merchant_message_notification
AFTER INSERT ON public.order_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_merchant_message();

CREATE OR REPLACE FUNCTION public.notify_buyer_complaint_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,complaint_id,notification_type,title,detail)
    VALUES(NEW.tenant_id,NEW.buyer_phone,NEW.id,'complaint_update','Your report was updated',
      'DASNET has updated the status of your report to '||replace(NEW.status,'_',' ')||'.');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS buyer_complaint_update_notification ON public.shop_complaints;
CREATE TRIGGER buyer_complaint_update_notification
AFTER UPDATE OF status,admin_notes ON public.shop_complaints
FOR EACH ROW EXECUTE FUNCTION public.notify_buyer_complaint_update();

ALTER TABLE public.buyer_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.buyer_notifications;
CREATE POLICY tenant_isolation ON public.buyer_notifications
USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
