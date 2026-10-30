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
  const sql=db(),users=await sql`SELECT u.id,u.phone,u.display_name FROM public.users u JOIN public.auth_sessions s ON s.user_id=u.id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() LIMIT 1`;
  if(!users.length||!allow.includes(phone(users[0].phone||'')))return send(res,403,{error:'Platform administrator access required.'});
  if(req.method==='GET'){
   const [summary,tenants,cfg]=await Promise.all([
    sql`SELECT (SELECT count(*)::int FROM public.tenants) AS sellers,(SELECT count(*)::int FROM public.products) AS products,(SELECT count(*)::int FROM public.orders) AS orders,(SELECT count(*)::int FROM public.orders WHERE status='pending') AS pending_orders`,
    sql`SELECT t.id,t.name,t.slug,t.status,t.created_at,u.display_name AS owner_name,u.phone AS owner_phone,(SELECT count(*)::int FROM public.products p WHERE p.tenant_id=t.id) AS products,(SELECT count(*)::int FROM public.orders o WHERE o.tenant_id=t.id) AS orders FROM public.tenants t LEFT JOIN public.users u ON u.id=t.created_by ORDER BY t.created_at DESC LIMIT 200`,
    sql`SELECT shortcode,environment,account_type,encrypted_credentials FROM public.platform_payment_config WHERE id=1 LIMIT 1`
   ]);
   const secrets=cfg[0]?.encrypted_credentials||{};
   return send(res,200,{summary:summary[0],tenants,daraja:{configured:!!(secrets.data&&cfg[0]?.shortcode&&cfg[0]?.account_type),shortcode:cfg[0]?.shortcode||'',environment:cfg[0]?.environment||'sandbox',accountType:cfg[0]?.account_type||'CustomerPayBillOnline'}});
  }
  if(req.body?.action==='save_daraja'){
   const key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
   if(!key)return send(res,503,{error:'Credential encryption is not configured. Add DASNET_CREDENTIALS_ENCRYPTION_KEY (32-byte base64 or 64-character hex) to the server runtime; Daraja credentials themselves are entered here.'});
   const keyBytes=/^[0-9a-f]{64}$/i.test(key)?Buffer.from(key,'hex'):Buffer.from(key,'base64');
   if(keyBytes.length!==32)return send(res,503,{error:'DASNET_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes.'});
   const existing=await sql`SELECT encrypted_credentials,shortcode,party_b FROM public.platform_payment_config WHERE id=1 LIMIT 1`;
   let old:any={};
   const stored=existing[0]?.encrypted_credentials;
   if(stored?.data&&stored?.iv&&stored?.tag){
    try{const decipher=crypto.createDecipheriv('aes-256-gcm',keyBytes,Buffer.from(stored.iv,'base64'));decipher.setAuthTag(Buffer.from(stored.tag,'base64'));old=JSON.parse(Buffer.concat([decipher.update(Buffer.from(stored.data,'base64')),decipher.final()]).toString('utf8'));}catch{return send(res,500,{error:'Stored Daraja credentials could not be decrypted. Check the encryption key.'});}
   }
   const next:any={...old};
   for(const field of ['consumerKey','consumerSecret','passkey']){const value=String(req.body?.[field]||'').trim();if(value)next[field]=value;}
   const shortcode=String(req.body?.shortcode||'').trim()||null,partyB=String(req.body?.partyB||'').trim()||null;
   const accountType=String(req.body?.accountType||'CustomerPayBillOnline'),environment=String(req.body?.environment||'sandbox');
   if(!['CustomerPayBillOnline','CustomerBuyGoodsOnline'].includes(accountType)||!['sandbox','production'].includes(environment))return send(res,400,{error:'Invalid Daraja account type or environment.'});
   if(!next.consumerKey||!next.consumerSecret||!next.passkey||!(shortcode||existing[0]?.shortcode)||!(partyB||existing[0]?.party_b))return send(res,400,{error:'Complete all credential fields, shortcode and Party B before saving for the first time.'});
   const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',keyBytes,iv);
   const encrypted=Buffer.concat([cipher.update(JSON.stringify(next),'utf8'),cipher.final()]);
   const blob={v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
   await sql`INSERT INTO public.platform_payment_config(id,shortcode,party_b,account_type,environment,encrypted_credentials,updated_at) VALUES(1,${shortcode||existing[0]?.shortcode},${partyB||existing[0]?.party_b},${accountType},${environment},${JSON.stringify(blob)}::jsonb,now()) ON CONFLICT(id) DO UPDATE SET shortcode=EXCLUDED.shortcode,party_b=EXCLUDED.party_b,account_type=EXCLUDED.account_type,environment=EXCLUDED.environment,encrypted_credentials=EXCLUDED.encrypted_credentials,updated_at=now()`;
   await sql`INSERT INTO public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) VALUES(${users[0].id},'platform.daraja.credentials.updated','payment_config','central',${JSON.stringify({shortcode:shortcode||existing[0]?.shortcode,environment,accountType})}::jsonb)`;
   return send(res,200,{ok:true});
  }
  const id=String(req.body?.tenantId||''),status=String(req.body?.status||'');
  if(!/^[0-9a-f-]{36}$/i.test(id)||!['active','suspended'].includes(status))return send(res,400,{error:'Invalid seller or status.'});
  const updated=await sql`UPDATE public.tenants SET status=${status},updated_at=now() WHERE id=${id} RETURNING id,name`;
  if(!updated.length)return send(res,404,{error:'Seller not found.'});
  await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${id},${users[0].id},'platform.tenant.status.updated','tenant',${id},${JSON.stringify({status})}::jsonb)`;
  return send(res,200,{ok:true});
 }catch(e:any){console.error('DAS platform admin error',e);return send(res,500,{error:'Platform admin operation failed.'})}
}