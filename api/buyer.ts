import storeHandler from './store';

const BUYER_ACTIONS=new Set([
 'coupons-public','coupon-validate','complaint-attachment','buyer-reports',
 'buyer-notifications','complaint','customer-orders','customer-chat',
 'product-reviews','order'
]);

export default async function handler(req:any,res:any){
 const action=String(req.query?.action||req.body?.action||'');
 if(!BUYER_ACTIONS.has(action))return res.status(404).json({error:'Unknown buyer service action.'});
 return storeHandler(req,res);
}
