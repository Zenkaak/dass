import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
const env=(k:string)=>(process.env[k]||'').trim();
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const send=(res:any,status:number,data:any)=>res.status(status).json(data);
function sessionToken(req:any){const c=String(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('das_session='));try{return c?decodeURIComponent(c.slice(12)):''}catch{return ''}}
function phone(v:string){let p=v.trim().replace(/[^0-9+]/g,'');if(/^0[17]\d{8}$/.test(p))p='254'+p.slice(1);else if(/^\+?254[17]\d{8}$/.test(p))p=p.replace(/^\+/,'');return p}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
 try{
  const allow=env('DAS_PLATFORM_ADMIN_PHONES').split(',').map(phone).filter(Boolean);
  if(!allow.length)return send(res,503,{error:'Platform admin access is not configured.'});
  const token=sessionToken(req);if(!token)return send(res,401,{error:'Sign in required.'});
  const sql=db(),users=await sql\`SELECT u.id,u.phone,u.display_name FROM public.users u JOIN public.auth_sessions s ON s.user_id=u.id WHERE s.token_hash=\${hash(token)} AND s.expires_at>now() LIMIT 1\`;
  if(!users.length||!allow.includes(phone(users[0].phone||'')))return send(res,403,{error:'Platform administrator access required.'});
  if(req.method==='GET'){
   const [summary,tenants]=await Promise.all([
    sql\`SELECT (SELECT count(*)::int FROM public.tenants) AS sellers,(SELECT count(*)::int FROM public.products) AS products,(SELECT count(*)::int FROM public.orders) AS orders,(SELECT count(*)::int FROM public.orders WHERE status='pending') AS pending_orders\`,
    sql\`SELECT t.id,t.name,t.slug,t.status,t.created_at,u.display_name AS owner_name,u.phone AS owner_phone,(SELECT count(*)::int FROM public.products p WHERE p.tenant_id=t.id) AS products,(SELECT count(*)::int FROM public.orders o WHERE o.tenant_id=t.id) AS orders FROM public.tenants t LEFT JOIN public.users u ON u.id=t.created_by ORDER BY t.created_at DESC LIMIT 200\`
   ]);
   return send(res,200,{summary:summary[0],tenants});
  }
  const id=String(req.body?.tenantId||''),status=String(req.body?.status||'');
  if(!/^[0-9a-f-]{36}$/i.test(id)||!['active','suspended'].includes(status))return send(res,400,{error:'Invalid seller or status.'});
  const updated=await sql\`UPDATE public.tenants SET status=\${status},updated_at=now() WHERE id=\${id} RETURNING id,name\`;
  if(!updated.length)return send(res,404,{error:'Seller not found.'});
  await sql\`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(\${id},\${users[0].id},'platform.tenant.status.updated','tenant',\${id},\${JSON.stringify({status})}::jsonb)\`;
  return send(res,200,{ok:true});
 }catch(e:any){console.error('DAS platform admin error',e);return send(res,500,{error:'Platform admin operation failed.'})}
}