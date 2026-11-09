import storeHandler from './store.js';

const BUYER_ACTIONS=new Set([
 'coupons-public','coupon-validate','complaint-attachment','buyer-reports',
 'buyer-notifications','complaint','customer-orders','customer-chat',
 'buyer-account-data','buyer-delivery-preference','buyer-follow-shop','buyer-wishlist','buyer-newsletter','buyer-close-account',
 'product-reviews','order','chat-attachment','customer-payment-status'
]);

export default async function handler(req:any,res:any){
 const action=String(req.query?.action||req.body?.action||'');
 if(!BUYER_ACTIONS.has(action))return res.status(404).json({error:'Unknown buyer service action.'});
 return storeHandler(req,res);
}
