import { getDb, hasDatabaseConfig } from '../../server/db.js';
import { getCentralPaystackCredentials, getSellerPaystackCredentials } from '../../server/paystack.js';

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).send('Method not allowed');
 const reference=String(req.query?.reference||'').trim();
 if(!/^[A-Za-z0-9.=:_-]{8,100}$/.test(reference))return res.status(400).send('Invalid payment reference.');
 if(!hasDatabaseConfig())return res.status(503).send('Payment service temporarily unavailable.');
 try{
  const sql=getDb();
  const rows=await sql`SELECT p.amount_minor,p.currency,p.status,p.payment_route,p.provider_result,p.tenant_id,o.order_number,t.slug,d.hostname FROM public.payments p LEFT JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id JOIN public.tenants t ON t.id=p.tenant_id LEFT JOIN public.domains d ON d.tenant_id=t.id AND d.is_primary=true WHERE p.provider='paystack' AND p.provider_reference=${reference} LIMIT 1`;
  if(!rows.length)return res.status(404).send('We could not find this payment. Please contact the shop.');
  const p=rows[0],credentials=p.payment_route==='own_paystack'?await getSellerPaystackCredentials(String(p.tenant_id)):await getCentralPaystackCredentials();
  const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+credentials.secretKey,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const result:any=await response.json().catch(()=>({})),tx=result?.data;
  const verified=Boolean(response.ok&&result?.status&&tx?.status==='success'&&String(tx.reference)===reference&&Number(tx.amount)===Number(p.amount_minor)&&String(tx.currency||'').toUpperCase()==='KES'&&String(p.currency||'').trim().toUpperCase()==='KES');
  const host=String(p.hostname||'').trim()||String(p.slug).toLowerCase()+'.dasmarket.co.ke';
  if(!/^[a-z0-9.-]+$/i.test(host))return res.status(500).send('Shop redirect could not be resolved.');
  const isSubscription=['seller_subscription','seller_lifetime_license'].includes(String(p.provider_result?.source||''));
  const destination=isSubscription?'https://dasmarket.co.ke/dashboard?payment='+(verified?'processing':'pending')+'&subscription=1':'https://'+host+'/orders?payment='+(verified?'processing':'pending')+'&order='+encodeURIComponent(String(p.order_number||''));
  return res.redirect(303,destination);
 }catch(error:any){
  console.error('Paystack callback verification failed',String(error?.message||error).slice(0,180));
  return res.status(503).send('Payment verification is temporarily unavailable. Refresh your order status shortly.');
 }
}
