import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(key:string)=>(process.env[key]||'').trim();
const send=(res:any,status:number,body:unknown)=>res.status(status).json(body);
const hash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
const db=()=>{const url=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!url)throw Error('DB_CONFIG');return neon(url)};
function session(req:any){const raw=String(req.headers.cookie||'').split(';').map((v:string)=>v.trim()).find((v:string)=>v.startsWith('das_session='));try{return raw?decodeURIComponent(raw.slice('das_session='.length)):''}catch{return ''}}
async function seller(sql:any,req:any){const value=session(req);if(!value)return null;const rows=await sql`SELECT u.id AS user_id,m.tenant_id,t.slug,t.name AS shop_name,m.role FROM public.auth_sessions a JOIN public.users u ON u.id=a.user_id JOIN public.memberships m ON m.user_id=u.id JOIN public.tenants t ON t.id=m.tenant_id WHERE a.token_hash=${hash(value)} AND a.expires_at>now() AND t.status IN ('trial','active') AND (SELECT count(*) FROM public.memberships x WHERE x.user_id=u.id)=1 LIMIT 1`;return rows[0]||null}
function cleanHost(value:string){let host=value.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\/$/,'').replace(/:\d+$/,'');if(host.includes('/')||host.includes('@')||host.includes('*')||host.length>253)return '';try{host=new URL('https://'+host).hostname.toLowerCase()}catch{return ''}if(!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/.test(host))return '';if(host==='dasmarket.co.ke'||host.endsWith('.dasmarket.co.ke'))return '';return host}
function vercelConfig(){const token=env('VERCEL_API_TOKEN')||env('VERCEL_TOKEN'),project=env('VERCEL_PROJECT_ID')||'prj_vZuYn5UoOgZbJ9NGLvyiTAFHfWPe',team=env('VERCEL_TEAM_ID')||'team_FUjJJLDSAITzmg32U4dQzNwD';if(!token)throw Error('VERCEL_DOMAIN_CONFIG');return {token,project,team}}
async function vercel(path:string,method='GET',body?:any){const c=vercelConfig(),url=new URL('https://api.vercel.com'+path);url.searchParams.set('teamId',c.team);const response=await fetch(url.toString(),{method,headers:{Authorization:'Bearer '+c.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const raw=await response.text();let data:any={};try{data=raw?JSON.parse(raw):{}}catch{}if(!response.ok){const error=String(data.error?.message||data.message||'Vercel domain request failed').slice(0,300);throw Error('VERCEL_API_'+response.status+':'+error)}return data}
function dnsInstructions(host:string){const labels=host.split('.'),isApex=labels.length===2||(labels.length===3&&['co','com','org','net','ac','go','or','ne','me'].includes(labels[1]));return isApex?[{type:'A',name:'@',value:'76.76.21.21'}]:[{type:'CNAME',name:labels.slice(0,-2).join('.'),value:'cname.vercel-dns.com'}]}
async function domainConfig(host:string){try{return await vercel('/v6/domains/'+encodeURIComponent(host)+'/config','GET')}catch{return {misconfigured:true}}}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return send(res,405,{error:'Method not allowed'})}
 try{
  const sql=db(),me=await seller(sql,req);if(!me)return send(res,401,{error:'Sign in to manage your shop domains.'});
  if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can manage custom domains.'});
  await sql`ALTER TABLE public.domains ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending', ADD COLUMN IF NOT EXISTS verification_data jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS last_checked_at timestamptz, ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
  if(req.method==='GET'){
   const rows=await sql`SELECT hostname,is_primary,verified_at,status,verification_data,last_checked_at,created_at FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname NOT LIKE '%.dasmarket.co.ke' ORDER BY is_primary DESC,created_at DESC`;
   const domains=[];
   for(const r of rows){let verified=false,verification=r.verification_data||{};try{const projectDomain=await vercel('/v9/projects/'+encodeURIComponent(vercelConfig().project)+'/domains/'+encodeURIComponent(r.hostname),'GET');const configStatus=await domainConfig(r.hostname);verified=Boolean((projectDomain.domain||projectDomain).verified)&&!configStatus.misconfigured;verification={...verification,config:configStatus};}catch{verified=false;}
    await sql`UPDATE public.domains SET verified_at=CASE WHEN ${verified} THEN COALESCE(verified_at,now()) ELSE NULL END,status=${verified?'active':'pending'},verification_data=${JSON.stringify(verification)}::jsonb,last_checked_at=now(),updated_at=now() WHERE tenant_id=${me.tenant_id} AND hostname=${r.hostname}`;
    domains.push({hostname:r.hostname,isPrimary:r.is_primary,verified,verifiedAt:verified?(r.verified_at||new Date().toISOString()):null,status:verified?'active':'pending',verification,lastCheckedAt:r.last_checked_at});}
   return send(res,200,{domains});
  }
  const body=req.body||{},hostname=cleanHost(String(body.hostname||body.domain||''));
  if(req.method==='POST'&&String(body.action||'')==='verify'){
   if(!hostname)return send(res,400,{error:'Select a domain to verify.'});
   const existing=await sql`SELECT hostname FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname} AND hostname NOT LIKE '%.dasmarket.co.ke' LIMIT 1`;if(!existing.length)return send(res,404,{error:'Custom domain not found.'});
   const config=vercelConfig();let verified:any;
   try{verified=await vercel('/v9/projects/'+encodeURIComponent(config.project)+'/domains/'+encodeURIComponent(hostname)+'/verify','POST',{})}
   catch(error:any){const current=await vercel('/v9/projects/'+encodeURIComponent(config.project)+'/domains/'+encodeURIComponent(hostname),'GET');verified=current}
   const domain=verified.domain||verified,ownershipVerified=Boolean(domain.verified),configStatus=await domainConfig(hostname),configured=!configStatus.misconfigured;
   const ok=ownershipVerified&&configured,challenges=Array.isArray(domain.verification)?domain.verification:[];
   await sql`UPDATE public.domains SET verified_at=CASE WHEN ${ok} THEN COALESCE(verified_at,now()) ELSE NULL END,status=${ok?'active':'pending'},verification_data=${JSON.stringify({verification:challenges,config:configStatus})}::jsonb,last_checked_at=now(),updated_at=now() WHERE tenant_id=${me.tenant_id} AND hostname=${hostname}`;
   return send(res,200,{ok:true,verified:ok,ownershipVerified,configured,domain:hostname,status:ok?'active':'pending',challenge:challenges,dns:{records:dnsInstructions(hostname)},message:ok?'Domain is connected and DNS is correctly pointing to this shop. SSL provisioning may take a few minutes.':!ownershipVerified?'Domain ownership is not verified yet. Complete any TXT verification record shown below, then try again.':'Domain ownership is verified, but its DNS is not pointing to this shop yet. Add the DNS record below, wait for it to update, then verify again.'});
  }
  if(req.method==='POST'){
   if(!hostname)return send(res,400,{error:'Enter a valid public domain, for example www.yourshop.com.'});
   const owned=await sql`SELECT tenant_id FROM public.domains WHERE hostname=${hostname} LIMIT 1`;if(owned.length&&owned[0].tenant_id!==me.tenant_id)return send(res,409,{error:'This domain is already connected to another shop.'});
   const config=vercelConfig();
   let added:any;
   try{added=await vercel('/v10/projects/'+encodeURIComponent(config.project)+'/domains','POST',{name:hostname})}
   catch(error:any){if(!String(error.message).includes('already')&&!String(error.message).includes('409'))throw error;added=await vercel('/v9/projects/'+encodeURIComponent(config.project)+'/domains/'+encodeURIComponent(hostname),'GET')}
   const verify=Array.isArray(added.verification)?added.verification:[],dns=added.config||{};
   const domain=added.domain||added;
   const configStatus=await domainConfig(hostname),connected=Boolean(domain.verified)&&!configStatus.misconfigured;
   await sql`INSERT INTO public.domains(tenant_id,hostname,is_primary,verified_at,status,verification_data,last_checked_at,updated_at) VALUES(${me.tenant_id},${hostname},false,${connected?new Date().toISOString():null},${connected?'active':'pending'},${JSON.stringify({verification:verify,config:configStatus})}::jsonb,now(),now()) ON CONFLICT(hostname) DO UPDATE SET verified_at=CASE WHEN ${connected} THEN COALESCE(public.domains.verified_at,now()) ELSE NULL END,status=${connected?'active':'pending'},verification_data=EXCLUDED.verification_data,last_checked_at=now(),updated_at=now() WHERE public.domains.tenant_id=EXCLUDED.tenant_id`;
   const rows=await sql`SELECT hostname,is_primary,verified_at,status,verification_data FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname} LIMIT 1`;
   return send(res,200,{ok:true,domain:{hostname,isPrimary:Boolean(rows[0]?.is_primary),verified:Boolean(rows[0]?.verified_at),status:rows[0]?.status||'pending',verification:rows[0]?.verification_data||{}},dns:{...dns,records:dnsInstructions(hostname)},challenge:verify,message:connected?'Domain is already correctly configured and connected to this shop.':'Domain added. Complete the DNS setup below, then click Verify domain.'});
  }

  if(req.method==='DELETE'){
   if(!hostname)return send(res,400,{error:'Select a domain to disconnect.'});
   const existing=await sql`SELECT hostname FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname} AND hostname NOT LIKE '%.dasmarket.co.ke' LIMIT 1`;if(!existing.length)return send(res,404,{error:'Custom domain not found.'});
   const config=vercelConfig();
   try{await vercel('/v9/projects/'+encodeURIComponent(config.project)+'/domains/'+encodeURIComponent(hostname),'DELETE')}catch(error:any){if(!String(error.message).includes('404'))throw error}
   await sql`DELETE FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname}`;
   return send(res,200,{ok:true,message:'Custom domain disconnected. Your DASMARKET subdomain remains active.'});
  }

  return send(res,400,{error:'Unsupported domain action.'});
 }catch(error:any){console.error('custom domain API',error);const message=String(error?.message||'');if(message==='VERCEL_DOMAIN_CONFIG')return send(res,503,{error:'Custom-domain automation is not configured yet. Add VERCEL_API_TOKEN to the DASMARKET production environment.'});if(message.startsWith('VERCEL_API_'))return send(res,502,{error:message.replace(/^VERCEL_API_\d+:/,'Vercel: ')});return send(res,500,{error:message==='DB_CONFIG'?'Database is not configured.':'Could not manage this domain. Please retry.'})}
}
