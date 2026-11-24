import crypto from 'node:crypto';
import { getDb, hasDatabaseConfig } from '../../server/db.js';
import { getCentralPaystackCredentials, getSellerPaystackCredentials } from '../../server/paystack.js';

export const config = { api: { bodyParser: false } };
const send=(res:any,status:number,body:any)=>res.status(status).json(body);
async function rawBody(req:any):Promise<Buffer>{
 if(Buffer.isBuffer(req.body))return req.body;
 if(typeof req.body==='string')return Buffer.from(req.body);
 const chunks:Buffer[]=[];
 for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
 return Buffer.concat(chunks);
}
function safeEqualHex(expected:Buffer,value:string){
 if(!/^[a-f0-9]{128}$/i.test(value))return false;
 const actual=Buffer.from(value,'hex');
 return actual.length===expected.length&&crypto.timingSafeEqual(expected,actual);
}
async function verifySignature(raw:Buffer,req:any,credentials:any){
 const modern=String(req.headers['paystack-signature']||'');
 if(modern&&credentials.webhookSecret){
  let timestamp=0,entries:string[]=[];
  for(const part of modern.split(',')){
   const [key,...rest]=part.trim().split('='),value=rest.join('=').trim();
   if(key==='t'){if(timestamp||!/^[0-9]+$/.test(value))return false;timestamp=Number(value);}
   if(key==='v1'){const colon=value.indexOf(':');if(colon>=0)entries.push(value.slice(colon+1));}
  }
  if(!timestamp||Math.abs(Date.now()/1000-timestamp)>300)return false;
  const expected=crypto.createHmac('sha512',credentials.webhookSecret).update(String(timestamp)+'.').update(raw).digest();
  return entries.some(signature=>safeEqualHex(expected,signature));
 }
 const legacy=String(req.headers['x-paystack-signature']||'');
 if(!legacy)return false;
 return safeEqualHex(crypto.createHmac('sha512',credentials.secretKey).update(raw).digest(),legacy);
}
async function verifyTransaction(reference:string,secret:string){
 const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+secret,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
 const payload:any=await response.json().catch(()=>({}));
 return {ok:response.ok&&Boolean(payload?.status),data:payload?.data};
}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 if(!hasDatabaseConfig())return send(res,503,{error:'Payment service unavailable'});
 let raw:Buffer;
 try{raw=await rawBody(req);}catch{return send(res,400,{error:'Invalid webhook body'});}
 if(raw.length>1024*1024)return send(res,413,{error:'Webhook payload too large'});
 let event:any;
 try{event=JSON.parse(raw.toString('utf8'));}catch{return send(res,400,{error:'Invalid JSON'});}
 if(event?.event!=='charge.success')return res.status(200).json({received:true,ignored:true});
 const data=event.data||{},reference=String(data.reference||'').trim();
 if(!reference)return send(res,400,{error:'Missing transaction reference'});
 try{
  const sql=getDb();
  const existing=await sql`SELECT p.id,p.tenant_id,p.order_id,p.amount_minor,p.currency,p.status,p.payment_route,p.provider_result,o.order_number FROM public.payments p LEFT JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id WHERE p.provider='paystack' AND p.provider_reference=${reference} LIMIT 1`;
  if(!existing.length)return res.status(200).json({received:true,unmatched:true});
  const payment=existing[0];
  const credentials=payment.payment_route==='own_paystack'?await getSellerPaystackCredentials(String(payment.tenant_id)):await getCentralPaystackCredentials();
  if(!await verifySignature(raw,req,credentials))return send(res,401,{error:'Invalid Paystack signature'});
  if(payment.status==='succeeded')return res.status(200).json({received:true,duplicate:true});
  const verification=await verifyTransaction(reference,credentials.secretKey),tx=verification.data;
  const matches=verification.ok&&tx?.status==='success'&&String(tx.reference)===reference&&String(tx.currency||'').toUpperCase()==='KES'&&String(payment.currency||'').trim().toUpperCase()==='KES'&&Number(tx.amount)===Number(payment.amount_minor);
  if(!matches){
   await sql`UPDATE public.payments SET provider_result=COALESCE(provider_result,'{}'::jsonb)||${JSON.stringify({paystackVerification:'mismatch_or_pending',reference})}::jsonb,updated_at=now() WHERE id=${payment.id} AND tenant_id=${payment.tenant_id} AND status IN ('initiated','pending')`;
   return res.status(200).json({received:true,verified:false,reviewRequired:true});
  }
  const source=String(payment.provider_result?.source||'');
  if(['seller_subscription','seller_lifetime_license'].includes(source)){
   const planId=String(payment.provider_result?.planId||''),intervalDays=Number(payment.provider_result?.intervalDays),lifetime=source==='seller_lifetime_license';
   if(!/^[0-9a-f-]{36}$/i.test(planId)||(lifetime?intervalDays!==36500:![30,90,180,365].includes(intervalDays)))return res.status(200).json({received:true,verified:true,reviewRequired:true,reason:'subscription_metadata_invalid'});
   const marked=await sql`UPDATE public.payments SET status='succeeded',provider_receipt=${String(tx.id||reference)},verified_at=now(),provider_result=COALESCE(provider_result,'{}'::jsonb)||${JSON.stringify({paystack:{reference,channel:tx.channel||null,paidAt:tx.paid_at||null}})}::jsonb,updated_at=now() WHERE id=${payment.id} AND tenant_id=${payment.tenant_id} AND status IN ('initiated','pending') RETURNING id`;
   if(!marked.length)return res.status(200).json({received:true,duplicate:true});
   const current=await sql`SELECT id FROM public.subscriptions WHERE tenant_id=${payment.tenant_id} ORDER BY created_at DESC LIMIT 1`;
   if(current.length){
    if(lifetime)await sql`UPDATE public.subscriptions SET plan_id=${planId},status='active',trial_ends_at=NULL,current_period_start=now(),current_period_end='9999-12-31 23:59:59+00'::timestamptz,provider_payment_id=${payment.id},updated_at=now() WHERE id=${current[0].id}`;
    else await sql`UPDATE public.subscriptions SET plan_id=${planId},status='active',trial_ends_at=NULL,current_period_start=now(),current_period_end=now()+make_interval(days=>${intervalDays}),provider_payment_id=${payment.id},updated_at=now() WHERE id=${current[0].id}`;
   }else{
    if(lifetime)await sql`INSERT INTO public.subscriptions(tenant_id,plan_id,status,trial_ends_at,current_period_start,current_period_end,provider_payment_id) VALUES(${payment.tenant_id},${planId},'active',NULL,now(),'9999-12-31 23:59:59+00'::timestamptz,${payment.id})`;
    else await sql`INSERT INTO public.subscriptions(tenant_id,plan_id,status,trial_ends_at,current_period_start,current_period_end,provider_payment_id) VALUES(${payment.tenant_id},${planId},'active',NULL,now(),now()+make_interval(days=>${intervalDays}),${payment.id})`;
   }
   await sql`UPDATE public.tenants SET status='active',updated_at=now() WHERE id=${payment.tenant_id} AND status IN ('trial','past_due')`;
   return res.status(200).json({received:true,verified:true,subscriptionActivated:true});
  }
  if(!payment.order_id)return res.status(200).json({received:true,verified:true,reviewRequired:true,reason:'payment_order_missing'});
  await sql`SELECT public.consume_inventory_reservations(${payment.id})`;
  const settlement=await sql`WITH wanted AS (
    SELECT product_id,SUM(quantity)::integer AS quantity FROM public.order_items WHERE tenant_id=${payment.tenant_id} AND order_id=${payment.order_id} AND product_id IS NOT NULL GROUP BY product_id
   ), payment_mark AS (
    UPDATE public.payments SET status='succeeded',provider_receipt=${String(tx.id||reference)},verified_at=now(),provider_result=COALESCE(provider_result,'{}'::jsonb)||${JSON.stringify({paystack:{reference,channel:tx.channel||null,paidAt:tx.paid_at||null}})}::jsonb,updated_at=now()
    WHERE id=${payment.id} AND tenant_id=${payment.tenant_id} AND status IN ('initiated','pending') RETURNING id,tenant_id,order_id
   ), stock_update AS (
    UPDATE public.products pr SET stock_quantity=CASE WHEN pr.stock_quantity IS NULL THEN NULL ELSE pr.stock_quantity-w.quantity END,updated_at=now()
    FROM wanted w,payment_mark pm WHERE pr.id=w.product_id AND pr.tenant_id=${payment.tenant_id} AND (pr.stock_quantity IS NULL OR pr.stock_quantity>=w.quantity)
    AND NOT EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=pm.id) RETURNING pr.id
   ), inventory_finalize AS (
    UPDATE public.payments p2 SET provider_result=p2.provider_result||jsonb_build_object(
     'inventoryApplied',(EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id AND ir.status='consumed') OR ((SELECT COUNT(*) FROM stock_update)=(SELECT COUNT(*) FROM wanted) AND NOT EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id))),
     'inventoryIssue',CASE WHEN EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id) AND NOT EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id AND ir.status='consumed') THEN 'Payment confirmed after stock reservation was released. Seller review required.' WHEN (SELECT COUNT(*) FROM stock_update)=(SELECT COUNT(*) FROM wanted) THEN NULL ELSE 'Payment confirmed, but stock changed during checkout. Seller review required.' END
    ),updated_at=now() FROM payment_mark pm WHERE p2.id=pm.id RETURNING p2.id,p2.tenant_id,p2.order_id
   ), queued AS (
    INSERT INTO public.payment_reconciliation_jobs(payment_id,tenant_id,order_id,status)
    SELECT id,tenant_id,order_id,'pending' FROM inventory_finalize ON CONFLICT(payment_id) DO NOTHING RETURNING id
   ) SELECT (SELECT COUNT(*) FROM payment_mark)::int AS payment_count,(SELECT COUNT(*) FROM queued)::int AS queued_count,(SELECT COUNT(*) FROM wanted)::int AS wanted_count,(SELECT COUNT(*) FROM stock_update)::int AS stock_count`;
  if(Number(settlement[0]?.payment_count||0)===0)return res.status(200).json({received:true,duplicate:true});
  if(Number(settlement[0]?.stock_count||0)!==Number(settlement[0]?.wanted_count||0))console.error('Verified Paystack payment requires inventory review',{paymentId:payment.id,orderId:payment.order_id});
  return res.status(200).json({received:true,verified:true,reconciliationQueued:Number(settlement[0]?.queued_count||0)>0});
 }catch(error:any){
  console.error('Paystack webhook processing failed',String(error?.message||error).slice(0,180));
  return send(res,500,{error:'Webhook processing failed'});
 }
}
