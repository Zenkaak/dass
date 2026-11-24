import { getDb, hasDatabaseConfig } from '../../server/db.js';

const env=(key:string)=>(process.env[key]||'').trim();
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).send('Method not allowed');
 const reference=String(req.query?.reference||'').trim();
 if(!/^[A-Za-z0-9.=:-]{8,100}$/.test(reference))return res.status(400).send('Invalid payment reference.');
 if(!hasDatabaseConfig())return res.status(503).send('Payment service temporarily unavailable.');
 const secret=env('PAYSTACK_SECRET_KEY');
 if(!secret)return res.status(503).send('Payment verification is not configured.');
 try{
  const sql=getDb();
  const rows=await sql`SELECT p.id,p.tenant_id,p.order_id,p.amount_minor,p.currency,p.status,o.order_number,t.slug FROM public.payments p JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id JOIN public.tenants t ON t.id=p.tenant_id WHERE p.provider='paystack' AND p.provider_reference=${reference} LIMIT 1`;
  if(!rows.length)return res.status(404).send('We could not find this payment. Please contact the shop.');
  const p=rows[0];
  const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+secret,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const result:any=await response.json().catch(()=>({}));
  const tx=result?.data;
  const verified=Boolean(response.ok&&result?.status&&tx?.status==='success'&&String(tx.reference)===reference&&Number(tx.amount)===Number(p.amount_minor)&&String(tx.currency||'').toUpperCase()===String(p.currency||'KES').trim().toUpperCase());
  if(verified){
   await sql`UPDATE public.payments SET status='succeeded',provider_receipt=${String(tx.id||reference)},verified_at=now(),provider_result=${JSON.stringify({channel:tx.channel||null,paid_at:tx.paid_at||null,reference})}::jsonb,updated_at=now() WHERE id=${p.id} AND tenant_id=${p.tenant_id} AND status<>'succeeded'`;
   await sql`UPDATE public.orders SET status='confirmed',updated_at=now() WHERE id=${p.order_id} AND tenant_id=${p.tenant_id} AND status='pending'`;
  }
  const destination='https://'+String(p.slug).toLowerCase()+'.dasmarket.co.ke/order-detail?order='+encodeURIComponent(String(p.order_number))+'&payment='+(verified?'success':'pending');
  return res.redirect(303,destination);
 }catch(error:any){
  console.error('Paystack callback verification failed',String(error?.message||error).slice(0,180));
  return res.status(503).send('Payment verification is temporarily unavailable. Refresh your order status shortly.');
 }
}
