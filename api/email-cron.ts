import { neon } from '@neondatabase/serverless';
import { brandedEmail, sendTransactionalEmail } from '../server/email.js';
const env=(key:string)=>(process.env[key]||'').trim();
const send=(res:any,status:number,body:any)=>res.status(status).json(body);
const db=()=>{const url=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!url)throw Error('DB_CONFIG');return neon(url)};
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
 const secret=env('CRON_SECRET'),authorization=String(req.headers.authorization||'');
 if(!secret||authorization!=='Bearer '+secret)return send(res,401,{error:'Unauthorized'});
 try{
  const sql=db();
  await sql`CREATE TABLE IF NOT EXISTS public.platform_email_events (
   id bigserial PRIMARY KEY,
   tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
   event_key text NOT NULL,
   created_at timestamptz NOT NULL DEFAULT now(),
   UNIQUE(tenant_id,event_key)
  )`;
  const due=await sql`SELECT s.id AS subscription_id,s.tenant_id,s.status,s.current_period_end,t.name AS shop_name,u.email AS owner_email,p.name AS plan_name,
   CASE WHEN s.current_period_end<=now()+interval '1 day' THEN 'renewal-1-day' ELSE 'renewal-3-day' END AS notice_type
   FROM public.subscriptions s
   JOIN public.tenants t ON t.id=s.tenant_id
   JOIN public.users u ON u.id=t.created_by
   JOIN public.subscription_plans p ON p.id=s.plan_id
   WHERE s.status IN ('active','trialing')
   AND s.current_period_end>now()
   AND s.current_period_end<=now()+interval '3 days'
   AND u.email IS NOT NULL AND BTRIM(u.email)<>''
   ORDER BY s.current_period_end ASC LIMIT 200`;
  let sent=0,skipped=0,failed=0;
  for(const row of due){
   const eventKey=String(row.notice_type)+'-'+String(row.subscription_id)+'-'+new Date(row.current_period_end).toISOString();
   const claim=await sql`INSERT INTO public.platform_email_events(tenant_id,event_key) VALUES(${row.tenant_id},${eventKey}) ON CONFLICT(tenant_id,event_key) DO NOTHING RETURNING id`;
   if(!claim.length){skipped++;continue;}
   const days=Math.max(1,Math.ceil((new Date(row.current_period_end).getTime()-Date.now())/86400000));
   const amount=(Number((await sql`SELECT price_minor FROM public.subscription_plans WHERE id=(SELECT plan_id FROM public.subscriptions WHERE id=${row.subscription_id}) LIMIT 1`)[0]?.price_minor||0)/100).toLocaleString('en-KE',{style:'currency',currency:'KES'});
   const mail=brandedEmail('DASMARKET','Your shop access is due for renewal','Your current '+String(row.plan_name||'subscription')+' access is due to expire in approximately '+days+' day(s). Sign in to your seller dashboard to renew and avoid interruption.',{'Shop':String(row.shop_name||''),'Plan':String(row.plan_name||''),'Renewal date':new Date(row.current_period_end).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}),'Current plan price':amount});
   try{
    const result=await sendTransactionalEmail({to:String(row.owner_email),subject:'DASMARKET renewal reminder — '+String(row.shop_name||'your shop'),...mail,idempotencyKey:'subscription-renewal-'+eventKey});
    if(result.sent)sent++;else{failed++;await sql`DELETE FROM public.platform_email_events WHERE id=${claim[0].id}`;}
   }catch(error:any){failed++;await sql`DELETE FROM public.platform_email_events WHERE id=${claim[0].id}`;console.error('Subscription renewal email failed',String(error?.message||error).slice(0,200));}
  }
  return send(res,200,{ok:true,checked:due.length,sent,skipped,failed});
 }catch(error:any){console.error('Email cron failed',String(error?.message||error).slice(0,300));return send(res,500,{error:'Email reminder job failed'});}
}
