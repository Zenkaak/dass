import crypto from 'node:crypto';
import { getDb, hasDatabaseConfig } from '../../server/db.js';

export const config = { api: { bodyParser: false } };
const env=(key:string)=>(process.env[key]||'').trim();
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
function verifySignature(raw:Buffer,req:any){
 const modern=String(req.headers['paystack-signature']||'');
 const signingSecret=env('PAYSTACK_WEBHOOK_SIGNING_SECRET');
 if(modern&&signingSecret){
  const fields=modern.split(',').map((x:string)=>x.trim());
  const t=Number(fields.find((x:string)=>x.startsWith('t='))?.slice(2)||0);
  if(!Number.isFinite(t)||Math.abs(Date.now()/1000-t)>300)return false;
  const expected=crypto.createHmac('sha512',signingSecret).update(String(t)+'.').update(raw).digest();
  return fields.filter((x:string)=>x.startsWith('v1=')).some((x:string)=>{
   const signature=x.slice(3).split(':').pop()||'';
   return safeEqualHex(expected,signature);
  });
 }
 const legacy=String(req.headers['x-paystack-signature']||'');
 const secret=env('PAYSTACK_SECRET_KEY');
 if(!legacy||!secret)return false;
 return safeEqualHex(crypto.createHmac('sha512',secret).update(raw).digest(),legacy);
}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return send(res,405,{error:'Method not allowed'});
 if(!hasDatabaseConfig())return send(res,503,{error:'Payment service unavailable'});
 let raw:Buffer;
 try{raw=await rawBody(req);}catch{return send(res,400,{error:'Invalid webhook body'});}
 if(raw.length>1024*1024)return send(res,413,{error:'Webhook payload too large'});
 if(!verifySignature(raw,req))return send(res,401,{error:'Invalid Paystack signature'});
 let event:any;
 try{event=JSON.parse(raw.toString('utf8'));}catch{return send(res,400,{error:'Invalid JSON'});}
 if(event?.event!=='charge.success')return res.status(200).json({received:true,ignored:true});
 const data=event.data||{},reference=String(data.reference||'').trim();
 if(!reference)return send(res,400,{error:'Missing transaction reference'});
 try{
  const sql=getDb();
  const existing=await sql`SELECT p.id,p.tenant_id,p.order_id,p.amount_minor,p.currency,p.status,o.order_number FROM public.payments p JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id WHERE p.provider='paystack' AND p.provider_reference=${reference} LIMIT 1`;
  if(!existing.length)return res.status(200).json({received:true,unmatched:true});
  const payment=existing[0];
  if(payment.status==='succeeded')return res.status(200).json({received:true,duplicate:true});
  const secret=env('PAYSTACK_SECRET_KEY');
  if(!secret)return send(res,503,{error:'Payment verification is not configured'});
  const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+secret,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const verified:any=await response.json().catch(()=>({}));
  const tx=verified?.data;
  const expectedAmount=Number(payment.amount_minor);
  if(!response.ok||!verified?.status||tx?.status!=='success'||Number(tx.amount)!==expectedAmount||String(tx.currency||'').toUpperCase()!==String(payment.currency||'KES').trim().toUpperCase()||String(tx.reference)!==reference){
   await sql`UPDATE public.payments SET status='failed',provider_result=${JSON.stringify({event:'charge.success',verification:'failed'})}::jsonb,updated_at=now() WHERE id=${payment.id} AND tenant_id=${payment.tenant_id} AND status<>'succeeded'`;
   return res.status(200).json({received:true,verified:false});
  }
  await sql`UPDATE public.payments SET status='succeeded',provider_receipt=${String(tx.id||reference)},verified_at=now(),provider_result=${JSON.stringify({channel:tx.channel||null,paid_at:tx.paid_at||null,reference})}::jsonb,updated_at=now() WHERE id=${payment.id} AND tenant_id=${payment.tenant_id} AND status<>'succeeded'`;
  await sql`UPDATE public.orders SET status='confirmed',updated_at=now() WHERE id=${payment.order_id} AND tenant_id=${payment.tenant_id} AND status='pending'`;
  return res.status(200).json({received:true,verified:true});
 }catch(error:any){
  console.error('Paystack webhook processing failed',String(error?.message||error).slice(0,180));
  return send(res,500,{error:'Webhook processing failed'});
 }
}
