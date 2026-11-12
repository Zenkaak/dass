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
function dnsZoneParts(labels:string[]){const suffix=labels.slice(-2).join('.');return ['co.ke','or.ke','ac.ke','go.ke','ne.ke','me.ke','com.ke','org.ke','net.ke','co.ug','com.ug','co.tz','co.za','com.au','co.uk','org.uk','com.ng','com.gh','com.in','co.in'].includes(suffix)?3:2}
function dnsInstructions(host:string,config:any={}){const labels=host.split('.'),zoneParts=dnsZoneParts(labels),relative=labels.slice(0,-zoneParts).join('.'),isApex=labels.length===zoneParts;if(isApex){const recommended=Array.isArray(config.recommendedIPv4)?config.recommendedIPv4.find((item:any)=>item.rank===1)?.value:undefined;const values=Array.isArray(recommended)&&recommended.length?recommended:['216.198.79.1','64.29.17.1'];return values.map((value:string)=>({type:'A',name:'@',value}));}const recommended=Array.isArray(config.recommendedCNAME)?config.recommendedCNAME.find((item:any)=>item.rank===1)?.value:undefined;return [{type:'CNAME',name:relative,value:String(recommended||'cname.vercel-dns.com').replace(/\.$/,'')}]}

async function domainConfig(host:string){try{return await vercel('/v6/domains/'+encodeURIComponent(host)+'/config','GET')}catch{return {misconfigured:true}}}
function adminHost(host:string){return 'adm.'+host}
async function ensureProjectDomain(host:string){const project=vercelConfig().project;try{return await vercel('/v10/projects/'+encodeURIComponent(project)+'/domains','POST',{name:host})}catch(error:any){if(!/already|409|domain is already|assigned/i.test(String(error.message)))throw error;return await vercel('/v9/projects/'+encodeURIComponent(project)+'/domains/'+encodeURIComponent(host),'GET')}}
async function inspectDomain(host:string){const project=vercelConfig().project;const item=await vercel('/v9/projects/'+encodeURIComponent(project)+'/domains/'+encodeURIComponent(host),'GET');const config=await domainConfig(host),domain=item.domain||item;return {verified:Boolean(domain.verified),configured:config.misconfigured===false,config,verification:Array.isArray(domain.verification)?domain.verification:[]}}
function combinedDns(host:string,rootConfig:any,admConfig:any){const labels=host.split('.'),zoneParts=dnsZoneParts(labels),relative=labels.slice(0,-zoneParts).join('.'),isApex=labels.length===zoneParts;const recommended=Array.isArray(admConfig.recommendedCNAME)?admConfig.recommendedCNAME.find((item:any)=>item.rank===1)?.value:undefined;const dashboardRecord={type:'CNAME',name:isApex?'adm':'adm.'+relative,value:String(recommended||'cname.vercel-dns.com').replace(/\.$/,''),purpose:'Seller dashboard'};return [...dnsInstructions(host,rootConfig).map((r:any)=>({...r,purpose:'Storefront'})),dashboardRecord]}
function combinedChallenges(...items:any[]){const all=items.flatMap(x=>Array.isArray(x)?x:[]),seen=new Set<string>();return all.filter((r:any)=>{const k=[r.type,r.domain||r.name,r.value||r.key].join('|');if(seen.has(k))return false;seen.add(k);return true})}
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
   for(const r of rows){const saved=r.verification_data||{},admin=String(saved.adminHostname||adminHost(r.hostname));let root:any,adm:any;
    try{root=await inspectDomain(r.hostname);adm=await inspectDomain(admin)}catch{root={verified:false,configured:false,config:{misconfigured:true},verification:[]};adm={verified:false,configured:false,config:{misconfigured:true},verification:[]}}
    const verified=root.verified&&root.configured&&adm.verified&&adm.configured,verification={...saved,adminHostname:admin,config:root.config,adminConfig:adm.config};
    await sql`UPDATE public.domains SET verified_at=CASE WHEN ${verified} THEN COALESCE(verified_at,now()) ELSE NULL END,status=${verified?'active':'pending'},verification_data=${JSON.stringify(verification)}::jsonb,last_checked_at=now(),updated_at=now() WHERE tenant_id=${me.tenant_id} AND hostname=${r.hostname}`;
    domains.push({hostname:r.hostname,adminHostname:admin,isPrimary:r.is_primary,verified,storefrontVerified:root.verified&&root.configured,adminVerified:adm.verified&&adm.configured,verifiedAt:verified?(r.verified_at||new Date().toISOString()):null,status:verified?'active':'pending',verification,lastCheckedAt:r.last_checked_at});}
   return send(res,200,{domains});
  }
  const body=req.body||{},hostname=cleanHost(String(body.hostname||body.domain||''));
  if(req.method==='POST'&&String(body.action||'')==='verify'){
   if(!hostname)return send(res,400,{error:'Select a domain to verify.'});
   const existing=await sql`SELECT hostname,verification_data FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname} AND hostname NOT LIKE '%.dasmarket.co.ke' LIMIT 1`;if(!existing.length)return send(res,404,{error:'Custom domain not found.'});
   const admin=adminHost(hostname),project=vercelConfig().project;await ensureProjectDomain(hostname);await ensureProjectDomain(admin);
   for(const host of [hostname,admin]){try{await vercel('/v9/projects/'+encodeURIComponent(project)+'/domains/'+encodeURIComponent(host)+'/verify','POST',{})}catch{}}
   const [root,adm]=await Promise.all([inspectDomain(hostname),inspectDomain(admin)]),ok=root.verified&&root.configured&&adm.verified&&adm.configured;
   const challenges=combinedChallenges(root.verification,adm.verification),verification={...(existing[0].verification_data||{}),adminHostname:admin,verification:challenges,config:root.config,adminConfig:adm.config};
   await sql`UPDATE public.domains SET verified_at=CASE WHEN ${ok} THEN COALESCE(verified_at,now()) ELSE NULL END,status=${ok?'active':'pending'},verification_data=${JSON.stringify(verification)}::jsonb,last_checked_at=now(),updated_at=now() WHERE tenant_id=${me.tenant_id} AND hostname=${hostname}`;
   return send(res,200,{ok:true,verified:ok,storefrontVerified:root.verified&&root.configured,adminVerified:adm.verified&&adm.configured,domain:hostname,adminHostname:admin,status:ok?'active':'pending',challenge:challenges,dns:{records:combinedDns(hostname,root.config,adm.config)},message:ok?'Both your storefront and seller dashboard domains are connected. SSL provisioning may take a few minutes.':!root.verified||!root.configured?'The storefront is still pending DNS or ownership verification. Check the DNS records below.':'The storefront is ready, but the adm seller-dashboard record is still pending. Check the adm record below, then verify once more.'});
  }
  if(req.method==='POST'){
   if(!hostname)return send(res,400,{error:'Enter a valid public domain, for example www.yourshop.com.'});
   const admin=adminHost(hostname),owned=await sql`SELECT tenant_id FROM public.domains WHERE hostname IN (${hostname},${admin}) LIMIT 1`;if(owned.length&&owned[0].tenant_id!==me.tenant_id)return send(res,409,{error:'This domain or its adm subdomain is already connected to another shop.'});
   const rootAdded=await ensureProjectDomain(hostname),adminAdded=await ensureProjectDomain(admin);
   const [rootConfig,admConfig]=await Promise.all([domainConfig(hostname),domainConfig(admin)]),rootDomain=rootAdded.domain||rootAdded,admDomain=adminAdded.domain||adminAdded;
   const connected=Boolean(rootDomain.verified)&&rootConfig.misconfigured===false&&Boolean(admDomain.verified)&&admConfig.misconfigured===false;
   const challenges=combinedChallenges(rootAdded.verification,adminAdded.verification),verification={adminHostname:admin,verification:challenges,config:rootConfig,adminConfig:admConfig};
   await sql`INSERT INTO public.domains(tenant_id,hostname,is_primary,verified_at,status,verification_data,last_checked_at,updated_at) VALUES(${me.tenant_id},${hostname},false,${connected?new Date().toISOString():null},${connected?'active':'pending'},${JSON.stringify(verification)}::jsonb,now(),now()) ON CONFLICT(hostname) DO UPDATE SET verified_at=CASE WHEN ${connected} THEN COALESCE(public.domains.verified_at,now()) ELSE NULL END,status=${connected?'active':'pending'},verification_data=EXCLUDED.verification_data,last_checked_at=now(),updated_at=now() WHERE public.domains.tenant_id=EXCLUDED.tenant_id`;
   const rows=await sql`SELECT hostname,is_primary,verified_at,status,verification_data FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname} LIMIT 1`;
   return send(res,200,{ok:true,domain:{hostname,adminHostname:admin,isPrimary:Boolean(rows[0]?.is_primary),verified:Boolean(rows[0]?.verified_at),status:rows[0]?.status||'pending',verification:rows[0]?.verification_data||{}},dns:{records:combinedDns(hostname,rootConfig,admConfig)},challenge:challenges,message:connected?'Both storefront and seller dashboard domains are already connected.':'Domain added. Add every DNS record below, then click Verify domain once to check both addresses.'});
  }
  if(req.method==='DELETE'){
   if(!hostname)return send(res,400,{error:'Select a domain to disconnect.'});
   const existing=await sql`SELECT hostname FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname} AND hostname NOT LIKE '%.dasmarket.co.ke' LIMIT 1`;if(!existing.length)return send(res,404,{error:'Custom domain not found.'});
   const project=vercelConfig().project;for(const host of [hostname,adminHost(hostname)]){try{await vercel('/v9/projects/'+encodeURIComponent(project)+'/domains/'+encodeURIComponent(host),'DELETE')}catch(error:any){if(!String(error.message).includes('404'))throw error}}
   await sql`DELETE FROM public.domains WHERE tenant_id=${me.tenant_id} AND hostname=${hostname}`;
   return send(res,200,{ok:true,message:'Storefront and adm seller-dashboard domains disconnected. Your DASMARKET subdomain remains active.'});
  }

  return send(res,400,{error:'Unsupported domain action.'});
 }catch(error:any){console.error('custom domain API',error);const message=String(error?.message||'');if(message==='VERCEL_DOMAIN_CONFIG')return send(res,503,{error:'Custom-domain automation is not configured yet. Add VERCEL_API_TOKEN to the DASMARKET production environment.'});if(message.startsWith('VERCEL_API_'))return send(res,502,{error:message.replace(/^VERCEL_API_\d+:/,'Vercel: ')});return send(res,500,{error:message==='DB_CONFIG'?'Database is not configured.':'Could not manage this domain. Please retry.'})}
}
