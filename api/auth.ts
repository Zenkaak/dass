import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
const env=(k:string)=>(process.env[k]||'').trim();
const send=(res:any,s:number,b:unknown)=>res.status(s).json(b);
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const pw=(p:string,s:string)=>crypto.scryptSync(p,s,64).toString('hex');
const equal=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
function phoneOf(v:unknown){const p=String(v||'').replace(/[\s()+-]/g,'');if(/^0[17]\d{8}$/.test(p))return '+254'+p.slice(1);if(/^254[17]\d{8}$/.test(p))return '+'+p;return ''}
function cookie(res:any,t:string,a:number){res.setHeader('Set-Cookie',`das_session=${encodeURIComponent(t)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${a}`)}
function getToken(req:any){const c=String(req.headers.cookie||'').split(';').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('das_session='));return c?decodeURIComponent(c.slice('das_session='.length)):''}
async function sms(phone:string,code:string,purpose:string){
 const tokenName=env('SMS_OTS_API_TOKEN')?'SMS_OTS_API_TOKEN':'OTS_API_TOKEN';
 const senderName=env('SMS_OTS_SENDER_ID')?'SMS_OTS_SENDER_ID':'SENDER_ID';
 const key=env(tokenName),senderLines=env(senderName).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const distinctSenders=[...new Set(senderLines)];
 // Tolerate a sender ID pasted twice on separate lines, but reject conflicting values.
 const sender=distinctSenders.length===1?distinctSenders[0]:'';
 if(!key||!sender)throw Error('SMS_CONFIG');
 const r=await fetch('https://sms.ots.co.ke/api/v3/sms/send',{
  method:'POST',
  headers:{Authorization:'Bearer '+key,Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({recipient:phone,sender_id:sender,type:'plain',message:`DASNET ${purpose==='signup'?'verification':'password reset'} code: ${code}. Expires in 10 minutes. Never share this code.`})
 });
 const raw=await r.text();
 let d:any=null;
 try{d=JSON.parse(raw)}catch{}
 if(!r.ok||!d||d.status===false||d.success===false||d.error){
  const safeFields:any={};
  if(d&&typeof d==='object'){
   for(const k of ['status','success','code','message','error']){
    const v=d[k];
    if(typeof v==='string'||typeof v==='number'||typeof v==='boolean'){
     let s=String(v).slice(0,240);
     s=s.replace(/\+254[17]\d{8}|0[17]\d{8}/g,'[phone]').replace(/\b\d{6}\b/g,'[code]').replace(/Bearer\s+\S+/gi,'Bearer [redacted]');
     safeFields[k]=s;
    }
   }
  }
  console.error('DAS OTS SMS diagnostic',{
   httpStatus:r.status,
   contentType:r.headers.get('content-type')||'',
   tokenSource:tokenName,
   tokenFingerprint:hash(key).slice(0,8),
   senderSource:senderName,
   senderId:sender,
   recipientFormat:phone.startsWith('+254')?'E.164 +254':'unexpected',
   recipientLast4:phone.slice(-4),
   providerResponse:safeFields,
   responseWasJson:!!d
  });
  throw Error('SMS_FAILED');
 }
}
async function issue(sql:any,phone:string,purpose:'signup'|'password_reset',ip:string){const recent=await sql`SELECT id FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND created_at>now()-interval '60 seconds' LIMIT 1`;if(recent.length)return false;const count=await sql`SELECT count(*)::int n FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND created_at>now()-interval '1 hour'`;if(Number(count[0]?.n||0)>=5)return false;const code=String(crypto.randomInt(0,1000000)).padStart(6,'0'),salt=crypto.randomBytes(16).toString('hex'),ch=hash(`${phone}:${purpose}:${salt}:${code}`);const row=await sql`INSERT INTO public.auth_otp_challenges(phone,purpose,code_hash,code_salt,request_ip_hash,expires_at) VALUES(${phone},${purpose},${ch},${salt},${hash(ip).slice(0,32)},now()+interval '10 minutes') RETURNING id`;try{await sms(phone,code,purpose)}catch(e){await sql`UPDATE public.auth_otp_challenges SET consumed_at=now() WHERE id=${row[0].id}`;throw e}return true}
async function verify(sql:any,phone:string,purpose:'signup'|'password_reset',code:string){const rows=await sql`SELECT id,code_hash,code_salt FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND consumed_at IS NULL AND expires_at>now() AND attempts<5 ORDER BY created_at DESC LIMIT 1`;const c=rows[0];if(!c||!/^\d{6}$/.test(code))return false;if(!equal(hash(`${phone}:${purpose}:${c.code_salt}:${code}`),c.code_hash)){await sql`UPDATE public.auth_otp_challenges SET attempts=attempts+1 WHERE id=${c.id}`;return false}await sql`UPDATE public.auth_otp_challenges SET consumed_at=now() WHERE id=${c.id}`;return true}
function validPassword(p:string){return p.length>=10&&p.length<=128&&/[A-Za-z]/.test(p)&&/\d/.test(p)}
export default async function handler(req:any,res:any){res.setHeader('Cache-Control','no-store');if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed'})}const action=String(req.query?.action||req.body?.action||''),b=req.body||{};try{const sql=db();
if(req.method==='POST'&&(action==='signup-code'||action==='reset-code')){const p=phoneOf(b.phone);if(!p)return send(res,400,{error:'Enter a valid Kenyan mobile number.'});const purpose=action==='signup-code'?'signup':'password_reset';const found=await sql`SELECT id FROM public.users WHERE phone=${p} LIMIT 1`;if(purpose==='signup'&&found.length)return send(res,409,{error:'This phone is already registered. Sign in or reset your password.'});if(purpose==='password_reset'&&!found.length)return send(res,200,{ok:true,message:'If an account exists, a code will be sent.'});const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim();if(!await issue(sql,p,purpose,ip))return send(res,429,{error:'Please wait before requesting another code.'});return send(res,200,{ok:true,message:'SMS code sent. It expires in 10 minutes.'})}
if(req.method==='POST'&&action==='signup'){const p=phoneOf(b.phone),code=String(b.code||''),password=String(b.password||''),name=String(b.displayName||'').trim().slice(0,100),shop=String(b.shopName||'').trim().slice(0,100),slug=String(b.slug||'').trim().toLowerCase();if(!p||!name||!shop||!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug))return send(res,400,{error:'Provide phone, name, shop name and a valid 3–50 character shop slug.'});if(!validPassword(password))return send(res,400,{error:'Use at least 10 characters with letters and numbers.'});if((await sql`SELECT id FROM public.users WHERE phone=${p} LIMIT 1`).length)return send(res,409,{error:'This phone is already registered.'});if(!await verify(sql,p,'signup',code))return send(res,400,{error:'Code invalid, expired, or attempts exceeded.'});const salt=crypto.randomBytes(16).toString('hex');const u=await sql`INSERT INTO public.users(email,display_name,password_hash,password_salt,phone,phone_verified_at) VALUES(NULL,${name},${pw(password,salt)},${salt},${p},now()) RETURNING id`;let t:any;try{t=(await sql`INSERT INTO public.tenants(name,slug,created_by) VALUES(${shop},${slug},${u[0].id}) RETURNING id`)[0];await sql`INSERT INTO public.memberships(tenant_id,user_id,role) VALUES(${t.id},${u[0].id},'owner')`;await sql`INSERT INTO public.sites(tenant_id,title) VALUES(${t.id},${shop})`}catch(e){await sql`DELETE FROM public.users WHERE id=${u[0].id}`;throw e}const session=crypto.randomBytes(32).toString('base64url');await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES(${hash(session)},${u[0].id},now()+interval '7 days')`;cookie(res,session,604800);return send(res,201,{ok:true,user:{id:u[0].id,displayName:name},shop:{id:t.id,slug}})}
if(req.method==='POST'&&action==='login'){const p=phoneOf(b.phone),password=String(b.password||'');if(!p||!password)return send(res,400,{error:'Enter phone and password'});const rows=await sql`SELECT id,display_name,password_hash,password_salt,phone_verified_at FROM public.users WHERE phone=${p} LIMIT 1`,u=rows[0];if(!u||!u.password_hash||!u.password_salt||!equal(pw(password,u.password_salt),u.password_hash))return send(res,401,{error:'Invalid phone or password'});if(!u.phone_verified_at)return send(res,403,{error:'Verify your phone first'});const s=crypto.randomBytes(32).toString('base64url');await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES(${hash(s)},${u.id},now()+interval '7 days')`;cookie(res,s,604800);return send(res,200,{ok:true,user:{id:u.id,displayName:u.display_name}})}
if(req.method==='POST'&&action==='change-password'){
 const session=getToken(req);if(!session)return send(res,401,{error:'Sign in to change your password.'});
 const body=req.body||{},current=String(body.currentPassword||''),next=String(body.newPassword||''),confirm=String(body.confirmPassword||'');
 if(!current)return send(res,400,{error:'Enter your current password.'});
 if(!validPassword(next))return send(res,400,{error:'Use at least 10 characters with letters and numbers.'});
 if(next!==confirm)return send(res,400,{error:'The new password and confirmation do not match.'});
 if(current===next)return send(res,400,{error:'Choose a password different from your current password.'});
 const sessions=await sql`SELECT u.id,u.password_hash,u.password_salt FROM public.auth_sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=${hash(session)} AND s.expires_at>now() LIMIT 1`;
 const user=sessions[0];if(!user)return send(res,401,{error:'Your session has expired. Sign in again.'});
 if(!user.password_hash||!user.password_salt||!equal(pw(current,user.password_salt),user.password_hash))return send(res,400,{error:'Your current password is incorrect.'});
 const salt=crypto.randomBytes(16).toString('hex');
 await sql`UPDATE public.users SET password_hash=${pw(next,salt)},password_salt=${salt},updated_at=now() WHERE id=${user.id}`;
 await sql`DELETE FROM public.auth_sessions WHERE user_id=${user.id} AND token_hash<>${hash(session)}`;
 return send(res,200,{ok:true,message:'Password changed. Other signed-in sessions have been closed.'});
}
if(req.method==='POST'&&action==='reset-password'){const p=phoneOf(b.phone),code=String(b.code||''),password=String(b.password||'');if(!p||!validPassword(password))return send(res,400,{error:'Enter a valid phone and password of at least 10 characters with letters and numbers.'});const users=await sql`SELECT id FROM public.users WHERE phone=${p} LIMIT 1`;if(!users.length||!await verify(sql,p,'password_reset',code))return send(res,400,{error:'Invalid or expired reset code.'});const salt=crypto.randomBytes(16).toString('hex');await sql`UPDATE public.users SET password_hash=${pw(password,salt)},password_salt=${salt},updated_at=now() WHERE id=${users[0].id}`;await sql`DELETE FROM public.auth_sessions WHERE user_id=${users[0].id}`;return send(res,200,{ok:true,message:'Password reset. Sign in again.'})}
if(req.method==='GET'&&action==='session'){const t=getToken(req);if(!t)return send(res,401,{error:'Sign in required'});const rows=await sql`SELECT u.id,u.display_name,u.phone FROM public.auth_sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=${hash(t)} AND s.expires_at>now() LIMIT 1`;if(!rows.length)return send(res,401,{error:'Session expired'});return send(res,200,{ok:true,user:{id:rows[0].id,displayName:rows[0].display_name,phone:rows[0].phone}})}
if(req.method==='POST'&&action==='logout'){const t=getToken(req);if(t)await sql`DELETE FROM public.auth_sessions WHERE token_hash=${hash(t)}`;cookie(res,'',0);return send(res,200,{ok:true})}return send(res,404,{error:'Unknown authentication action'})}catch(e:any){if(e?.message==='SMS_CONFIG')return send(res,503,{error:'DAS OTS SMS credentials are not configured in Vercel.'});if(e?.message==='SMS_FAILED')return send(res,502,{error:'SMS provider rejected the message. Check OTS account, sender ID and credits.'});if(e?.message==='DB_CONFIG')return send(res,503,{error:'DAS database connection is not configured.'});console.error('DAS auth API error',e);return send(res,500,{error:'Authentication failed. Check schema migration and server configuration.'})}}
