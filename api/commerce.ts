import storeHandler from './store.js';

const ACTIONS:Record<string,Set<string>>={
 buyer:new Set([
  'coupons-public','coupon-validate','complaint-attachment','buyer-reports',
  'buyer-notifications','complaint','customer-orders','customer-chat',
  'buyer-account-data','buyer-delivery-preference','buyer-follow-shop','buyer-wishlist','buyer-newsletter','buyer-close-account',
  'product-reviews','order','chat-attachment','customer-payment-status'
 ]),
 merchant:new Set([
  'store-settings','coupons','coupon','payment-settings','payout-settings','subscription','subscription-stk','subscription-paystack','paystack-seller','card-kyc','card-kyc-otp','card-kyc-document-upload','card-kyc-document-confirm',
  'api-credentials','email-credentials','email-test','transactions','tickets','ticket','profile','settings',
  'products','orders','product-image-upload','products-bulk','product',
  'product-status','order-chat','order-status','order-delivery-status',
  'products-test-seed'
 ]),
 payments:new Set(['customer-payment-retry','order-prompt','daraja-callback','reconcile-payments'])
};

export default async function handler(req:any,res:any){
 const group=String(req.query?.group||'');
 const action=String(req.query?.action||req.body?.action||'');
 const allowed=ACTIONS[group];
 if(!allowed)return res.status(404).json({error:'Unknown commerce service.'});
 if(!allowed.has(action))return res.status(404).json({error:'Unknown '+group+' service action.'});
 return storeHandler(req,res);
}
