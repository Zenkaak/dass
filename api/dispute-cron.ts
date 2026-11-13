import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
import { sendTenantTransactionalEmail, brandedEmail } from '../server/email.js';
const env=(k:string)=>(process.env[k]||'').trim();
async function verifyGitHubOidc(token:string){
 try{
  const parts=token.split('.');if(parts.length!==3)return false;
  const header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
  const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  if(header.alg!=='RS256'||!header.kid)return false;
  const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!=='https://token.actions.githubusercontent.com'||!aud.includes('dasnet-dispute-escalation'))return false;
  if(String(claims.repository||'').toLowerCase()!=='zenkaak/dass'||claims.ref!=='refs/heads/main')return false;
  if(String(claims.workflow_ref||'').toLowerCase()!=='zenkaak/dass/.github/workflows/escalate-disputes.yml@refs/heads/main')return false;
  const subject=String(claims.sub||'').toLowerCase();if(!['repo:zenkaak/dass:ref:refs/heads/main','repo:zenkaak@262563148/dass@1438529271:ref:refs/heads/main'].includes(subject))return false;
  if(String(claims.repository_id||'')!=='1438529271'||String(claims.repository_owner_id||'')!=='262563148')return false;
  if(!Number.isFinite(claims.exp)||claims.exp<now-15||!Number.isFinite(claims.iat)||claims.iat>now+30)return false;
  const response=await fetch('https://token.actions.githubusercontent.com/.well-known/jwks',{headers:{'Accept':'application/json'}});
  if(!response.ok)return false;
  const jwks=await response.json() as any;
  const jwk=(jwks.keys||[]).find((key:any)=>key.kid===header.kid&&key.kty==='RSA');
  if(!jwk)return false;
  const publicKey=crypto.createPublicKey({key:jwk,format:'jwk'});
  return crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),publicKey,Buffer.from(parts[2],'base64url'));
 }catch{return false;}
}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
 const authorization=String(req.headers.authorization||''),provided=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 const configuredSecret=env('CRON_SECRET');
 const authorized=(configuredSecret&&provided===configuredSecret)||await verifyGitHubOidc(provided);
 if(!authorized)return res.status(401).json({error:'Unauthorized'});
 try{
  const url=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!url)return res.status(503).json({error:'Database not configured'});
  const sql=neon(url);
  const expired=await sql`UPDATE public.shop_complaints SET dispute_status='escalated',status='under_review',dispute_escalated_at=now(),updated_at=now() WHERE dispute_status IN ('open','resolution_pending') AND dispute_deadline_at<=now() RETURNING id,tenant_id,buyer_phone`;
  for(const c of expired){
   const title='Dispute escalated to DASNET support',detail='The one-hour resolution window has ended. DASMARKET support will review the case.';
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,title,detail) VALUES(${c.tenant_id},${c.id},'buyer',${c.buyer_phone},${title},${detail})`;
   const seller=await sql`SELECT t.created_by,t.name AS shop_name,u.email AS seller_email,sc.email AS buyer_email FROM public.tenants t LEFT JOIN public.users u ON u.id=t.created_by LEFT JOIN public.store_customers sc ON sc.tenant_id=t.id AND right(regexp_replace(sc.phone,'[^0-9]','','g'),9)=right(regexp_replace(${c.buyer_phone},'[^0-9]','','g'),9) WHERE t.id=${c.tenant_id} LIMIT 1`;
   if(seller[0]?.created_by)await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_user_id,title,detail) VALUES(${c.tenant_id},${c.id},'seller',${seller[0].created_by},${title},${detail})`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,title,detail) VALUES(${c.tenant_id},${c.id},'admin','Dispute requires support review','A dispute has reached its one-hour deadline.')`;
   try{
    const shop=String(seller[0]?.shop_name||'DASMARKET shop'),reference=String(c.id).slice(0,8).toUpperCase();
    if(seller[0]?.buyer_email){const mail=brandedEmail(shop,title,detail,{'Report reference':reference});await sendTenantTransactionalEmail(sql,String(c.tenant_id),{to:String(seller[0].buyer_email),subject:title+' — '+reference,...mail,idempotencyKey:'dispute-cron-buyer-'+c.id});}
    if(seller[0]?.seller_email){const mail=brandedEmail(shop,title,detail,{'Report reference':reference});await sendTenantTransactionalEmail(sql,String(c.tenant_id),{to:String(seller[0].seller_email),subject:title+' — '+reference,...mail,idempotencyKey:'dispute-cron-seller-'+c.id});}
    const admins=(env('DAS_PLATFORM_ADMIN_EMAILS')||'').split(',').map((v:string)=>v.trim()).filter((v:string)=>/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v));
    for(const to of admins){const mail=brandedEmail('DASMARKET','Dispute requires support review','A dispute has reached its one-hour deadline and requires platform review.',{'Shop':shop,'Report reference':reference});await sendTenantTransactionalEmail(sql,String(c.tenant_id),{to,subject:'Dispute escalated — '+reference,...mail,idempotencyKey:'dispute-cron-admin-'+c.id+'-'+crypto.createHash('sha256').update(to).digest('hex').slice(0,8)});}
   }catch(emailError:any){console.error('Dispute escalation email failed',String(emailError?.message||emailError).slice(0,200));}
  }
  return res.status(200).json({ok:true,escalated:expired.length});
 }catch(e:any){console.error('Dispute deadline cron',e?.message||e);return res.status(500).json({error:'Could not process dispute deadlines'});}
}
