import storeHandler from './store.js';

const PAYMENT_ACTIONS=new Set(['customer-payment-retry','order-prompt','daraja-callback','reconcile-payments']);

export default async function handler(req:any,res:any){
 const action=String(req.query?.action||req.body?.action||'');
 if(!PAYMENT_ACTIONS.has(action))return res.status(404).json({error:'Unknown payment service action.'});
 return storeHandler(req,res);
}
