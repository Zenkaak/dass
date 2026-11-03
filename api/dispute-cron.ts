import { neon } from '@neondatabase/serverless';
const env=(k:string)=>(process.env[k]||'').trim();
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const secret=env('CRON_SECRET');
 if(!secret||String(req.headers.authorization||'')!=='Bearer '+secret)return res.status(401).json({error:'Unauthorized'});
 try{
  const url=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!url)return res.status(503).json({error:'Database not configured'});
  const sql=neon(url);
  const expired=await sql`UPDATE public.shop_complaints SET dispute_status='escalated',status='under_review',dispute_escalated_at=now(),updated_at=now() WHERE dispute_status IN ('open','resolution_pending') AND dispute_deadline_at<=now() RETURNING id,tenant_id,buyer_phone`;
  for(const c of expired){
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,title,detail) VALUES(${c.tenant_id},${c.id},'buyer',${c.buyer_phone},'Dispute escalated to DASNET support','The one-hour resolution window has ended. DASNET support will review the case.')`;
   const seller=await sql`SELECT created_by FROM public.tenants WHERE id=${c.tenant_id}`;
   if(seller[0]?.created_by)await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_user_id,title,detail) VALUES(${c.tenant_id},${c.id},'seller',${seller[0].created_by},'Dispute escalated to DASNET support','The one-hour resolution window has ended. DASNET support will review the case.')`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,title,detail) VALUES(${c.tenant_id},${c.id},'admin','Dispute requires support review','A dispute has reached its one-hour deadline.')`;
  }
  return res.status(200).json({ok:true,escalated:expired.length});
 }catch(e:any){console.error('Dispute deadline cron',e?.message||e);return res.status(500).json({error:'Could not process dispute deadlines'});}
}
