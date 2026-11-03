import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
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
  if(String(claims.sub||'').toLowerCase()!=='repo:zenkaak/dass:ref:refs/heads/main')return false;
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
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,title,detail) VALUES(${c.tenant_id},${c.id},'buyer',${c.buyer_phone},'Dispute escalated to DASNET support','The one-hour resolution window has ended. DASNET support will review the case.')`;
   const seller=await sql`SELECT created_by FROM public.tenants WHERE id=${c.tenant_id}`;
   if(seller[0]?.created_by)await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_user_id,title,detail) VALUES(${c.tenant_id},${c.id},'seller',${seller[0].created_by},'Dispute escalated to DASNET support','The one-hour resolution window has ended. DASNET support will review the case.')`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,title,detail) VALUES(${c.tenant_id},${c.id},'admin','Dispute requires support review','A dispute has reached its one-hour deadline.')`;
  }
  return res.status(200).json({ok:true,escalated:expired.length});
 }catch(e:any){console.error('Dispute deadline cron',e?.message||e);return res.status(500).json({error:'Could not process dispute deadlines'});}
}
