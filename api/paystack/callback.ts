import { getDb, hasDatabaseConfig } from '../../server/db.js';

const env=(key:string)=>(process.env[key]||'').trim();
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).send('Method not allowed');
 const reference=String(req.query?.reference||'').trim();
 if(!/^[A-Za-z0-9.=:_-]{8,100}$/.test(reference))return res.status(400).send('Invalid payment reference.');
 if(!hasDatabaseConfig())return res.status(503).send('Payment service temporarily unavailable.');
 const secret=env('PAYSTACK_SECRET_KEY');
 if(!secret)return res.status(503).send('Payment verification is not configured.');
 try{
  const sql=getDb();
  const rows=await sql`SELECT p.amount_minor,p.currency,p.status,o.order_number,t.slug,d.hostname FROM public.payments p JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id JOIN public.tenants t ON t.id=p.tenant_id LEFT JOIN public.domains d ON d.tenant_id=t.id AND d.is_primary=true WHERE p.provider='paystack' AND p.provider_reference=${reference} LIMIT 1`;
  if(!rows.length)return res.status(404).send('We could not find this payment. Please contact the shop.');
  const p=rows[0];
  const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+secret,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const result:any=await response.json().catch(()=>({})),tx=result?.data;
  const verified=Boolean(response.ok&&result?.status&&tx?.status==='success'&&String(tx.reference)===reference&&Number(tx.amount)===Number(p.amount_minor)&&String(tx.currency||'').toUpperCase()===String(p.currency||'KES').trim().toUpperCase());
  const host=String(p.hostname||'').trim()||String(p.slug).toLowerCase()+'.dasmarket.co.ke';
  if(!/^[a-z0-9.-]+$/i.test(host))return res.status(500).send('Shop redirect could not be resolved.');
  const destination='https://'+host+'/orders?payment='+(verified?'processing':'pending')+'&order='+encodeURIComponent(String(p.order_number));
  return res.redirect(303,destination);
 }catch(error:any){
  console.error('Paystack callback verification failed',String(error?.message||error).slice(0,180));
  return res.status(503).send('Payment verification is temporarily unavailable. Refresh your order status shortly.');
 }
}
