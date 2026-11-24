import authHandler from '../server/api-handlers/auth.js';
import buyerAuthHandler from '../server/api-handlers/buyer-auth.js';
import buyerHandler from '../server/api-handlers/buyer.js';
import customDomainHandler from '../server/api-handlers/custom-domain.js';
import disputeCronHandler from '../server/api-handlers/dispute-cron.js';
import disputesHandler from '../server/api-handlers/disputes.js';
import emailCronHandler from '../server/api-handlers/email-cron.js';
import merchantHandler from '../server/api-handlers/merchant.js';
import paymentsHandler from '../server/api-handlers/payments.js';
import platformAdminHandler from '../server/api-handlers/platform-admin.js';
import storeHandler from '../server/api-handlers/store.js';
import storefrontHandler from '../server/api-handlers/storefront.js';
import paystackCallbackHandler from '../server/api-handlers/paystack-callback.js';

const routes: Record<string, (req:any,res:any)=>unknown> = {
  auth: authHandler,
  'buyer-auth': buyerAuthHandler,
  buyer: buyerHandler,
  'custom-domain': customDomainHandler,
  'dispute-cron': disputeCronHandler,
  disputes: disputesHandler,
  'email-cron': emailCronHandler,
  merchant: merchantHandler,
  payments: paymentsHandler,
  'platform-admin': platformAdminHandler,
  store: storeHandler,
  storefront: storefrontHandler,
  'paystack/callback': paystackCallbackHandler,
};

export default async function handler(req:any,res:any) {
  const pathname = new URL(String(req.url || '/'), 'https://dasmarket.internal').pathname;
  const route = pathname.replace(/^\\/api\\/?/, '').replace(/\\/+$/, '');
  const target = routes[route];
  if (!target) return res.status(404).json({ error: 'Unknown API route.' });
  return target(req,res);
}
