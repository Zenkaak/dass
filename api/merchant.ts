import storeHandler from './store.js';

const MERCHANT_ACTIONS=new Set([
 'store-settings','coupons','coupon','payment-settings','payout-settings','subscription','subscription-stk',
 'api-credentials','transactions','tickets','ticket','profile','settings',
 'products','orders','product-image-upload','products-bulk','product',
 'product-status','order-chat','order-status','order-delivery-status',
 'products-test-seed'
]);

export default async function handler(req:any,res:any){
 const action=String(req.query?.action||req.body?.action||'');
 if(!MERCHANT_ACTIONS.has(action))return res.status(404).json({error:'Unknown merchant service action.'});
 return storeHandler(req,res);
}
