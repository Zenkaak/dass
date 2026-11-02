import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(k:string)=>(process.env[k]||'').trim();
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const send=(res:any,status:number,body:any)=>res.status(status).json(body);
const db=()=>{const url=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!url)throw Error('DB_CONFIG');return neon(url)};
const phoneOf=(value:any)=>{let p=String(value||'').trim().replace(/[\s().+-]/g,'');if(/^0[17]\d{8}$/.test(p))p='+254'+p.slice(1);else if(/^254[17]\d{8}$/.test(p))p='+'+p;return /^\+254[17]\d{8}$/.test(p)?p:''};
const passwordHash=(password:string,salt:string)=>crypto.scryptSync(password,salt,64).toString('hex');
const equal=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
function cookie(res:any,value:string,maxAge:number){res.setHeader('Set-Cookie',[ `das_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`,`das_buyer_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` ])}
function cookieValue(req:any,name:string){const item=String(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith(name+'='));try{return item?decodeURIComponent(item.slice(name.length+1)):''}catch{return ''}}
function globalToken(req:any){return cookieValue(req,'das_session')}
function legacyToken(req:any){return cookieValue(req,'das_buyer_session')}
async function sendCode(phone:string,code:string,purpose:string,shop:string){
 const key=env('OTS_API_TOKEN')||env('SMS_OTS_API_TOKEN'),sender=env('SENDER_ID')||env('SMS_OTS_SENDER_ID');
 if(!key||!sender)throw Error('SMS_CONFIG');
 const response=await fetch('https://sms.ots.co.ke/api/v3/sms/send',{method:'POST',headers:{Authorization:'Bearer '+key,Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({recipient:phone,sender_id:sender.trim(),type:'plain',message:`Your ${shop} ${purpose==='signup'?'verification':'password reset'} code is ${code}. It expires in 10 minutes. Never share this code.`})});
 const data:any=await response.json().catch(()=>({}));
 if(!response.ok||data.status===false||data.success===false||data.error)throw Error('SMS_FAILED');
}
async function issue(sql:any,phone:string,purpose:'signup'|'password_reset',ip:string,shop:string){
 const recent=await sql`SELECT id FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND created_at>now()-interval '60 seconds' LIMIT 1`;
 if(recent.length)return false;
 const count=await sql`SELECT count(*)::int n FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND created_at>now()-interval '1 hour'`;
 if(Number(count[0]?.n||0)>=5)return false;
 const code=String(crypto.randomInt(0,1000000)).padStart(6,'0'),salt=crypto.randomBytes(16).toString('hex');
 const codeHash=hash(`${phone}:${purpose}:${salt}:${code}`);
 const row=await sql`INSERT INTO public.auth_otp_challenges(phone,purpose,code_hash,code_salt,request_ip_hash,expires_at) VALUES(${phone},${purpose},${codeHash},${salt},${hash(ip).slice(0,32)},now()+interval '10 minutes') RETURNING id`;
 try{await sendCode(phone,code,purpose,shop)}catch(error){await sql`UPDATE public.auth_otp_challenges SET consumed_at=now() WHERE id=${row[0].id}`;throw error}
 return true;
}
async function verify(sql:any,phone:string,purpose:'signup'|'password_reset',code:string){
 const rows=await sql`SELECT id,code_hash,code_salt FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND consumed_at IS NULL AND expires_at>now() AND attempts<5 ORDER BY created_at DESC LIMIT 1`;
 const challenge=rows[0];if(!challenge||!/^\d{6}$/.test(code))return false;
 if(!equal(hash(`${phone}:${purpose}:${challenge.code_salt}:${code}`),challenge.code_hash)){await sql`UPDATE public.auth_otp_challenges SET attempts=attempts+1 WHERE id=${challenge.id}`;return false}
 await sql`UPDATE public.auth_otp_challenges SET consumed_at=now() WHERE id=${challenge.id}`;return true;
}
function validPassword(p:string){return p.length>=10&&p.length<=128&&/[A-Za-z]/.test(p)&&/[0-9]/.test(p)}
function customer(row:any){return {id:row.id,name:row.full_name,email:row.email||'',phone:row.phone,alternativePhone:row.alternative_phone||'',address:row.address||''}}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
 const body=req.body||{},action=String(req.query?.action||body.action||''),slug=String(req.method==='GET'?req.query?.slug:body.slug||'').toLowerCase().trim();
 try{
  const sql=db();
  if(!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug))return send(res,400,{error:'Invalid shop.'});
  const shops=await sql`SELECT id,name FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
  if(!shops.length)return send(res,404,{error:'Shop not found.'});
  const tenant=shops[0],tenantId=tenant.id;

  if(req.method==='POST'&&action==='send-code'){
   const phone=phoneOf(body.phone);if(!phone)return send(res,400,{error:'Enter a valid Kenyan mobile number.'});
   if((await sql`SELECT id FROM public.store_customers WHERE tenant_id=${tenantId} AND phone=${phone} LIMIT 1`).length)return send(res,409,{error:'You already have a buyer profile in this shop. Please sign in.'});
   if((await sql`SELECT id FROM public.users WHERE phone=${phone} LIMIT 1`).length)return send(res,409,{error:'This phone already has a DASNET identity. Sign in instead; your buyer profile will be created for this shop.'});
   const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim();
   if(!await issue(sql,phone,'signup',ip,tenant.name))return send(res,429,{error:'Please wait before requesting another code.'});
   return send(res,200,{ok:true,message:'Verification code sent by SMS.'});
  }
  if(req.method==='POST'&&action==='send-reset-code'){
   const phone=phoneOf(body.phone);if(!phone)return send(res,400,{error:'Enter a valid Kenyan mobile number.'});
   const exists=await sql`SELECT id FROM public.users WHERE phone=${phone} LIMIT 1`;
   if(!exists.length)return send(res,200,{ok:true,message:'If an account exists, a code has been sent.'});
   const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim();
   if(!await issue(sql,phone,'password_reset',ip,tenant.name))return send(res,429,{error:'Please wait before requesting another code.'});
   return send(res,200,{ok:true,message:'Password reset code sent by SMS.'});
  }
  if(req.method==='POST'&&action==='signup'){
   const phone=phoneOf(body.phone),name=String(body.name||'').trim().slice(0,120),email=String(body.email||'').trim().toLowerCase().slice(0,254),altRaw=String(body.alternativePhone||'').trim(),alt=altRaw?phoneOf(altRaw):null,address=String(body.address||'').trim().slice(0,300),password=String(body.password||''),code=String(body.code||'');
   if(!phone||name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!address)return send(res,400,{error:'Complete your name, valid email, phone and delivery address.'});
   if(altRaw&&!alt)return send(res,400,{error:'Enter a valid Kenyan alternative phone number.'});
   if(!validPassword(password))return send(res,400,{error:'Use a password of at least 10 characters with letters and numbers.'});
   if((await sql`SELECT id FROM public.users WHERE phone=${phone} LIMIT 1`).length)return send(res,409,{error:'This phone already has a DASNET identity. Sign in instead.'});
   if(!await verify(sql,phone,'signup',code))return send(res,400,{error:'The SMS code is invalid or expired.'});
   const salt=crypto.randomBytes(16).toString('hex'),token=crypto.randomBytes(32).toString('base64url');
   const rows=await sql`
    WITH new_user AS (
     INSERT INTO public.users(email,display_name,password_hash,password_salt,phone,phone_verified_at)
     VALUES(NULL,${name},${passwordHash(password,salt)},${salt},${phone},now())
     ON CONFLICT(phone) WHERE phone IS NOT NULL DO NOTHING
     RETURNING id
    ), linked_profiles AS (
     UPDATE public.store_customers c SET user_id=u.id,updated_at=now()
     FROM new_user u WHERE c.phone=${phone} AND c.tenant_id<>${tenantId} AND c.user_id IS NULL
     RETURNING c.id
    ), profile AS (
     INSERT INTO public.store_customers(tenant_id,user_id,full_name,email,phone,alternative_phone,address,password_hash,password_salt,phone_verified_at)
     SELECT ${tenantId},u.id,${name},${email},${phone},${alt},${address},NULL,NULL,now() FROM new_user u
     ON CONFLICT(tenant_id,phone) DO UPDATE SET user_id=EXCLUDED.user_id,full_name=EXCLUDED.full_name,email=EXCLUDED.email,alternative_phone=EXCLUDED.alternative_phone,address=EXCLUDED.address,phone_verified_at=now(),updated_at=now()
     WHERE store_customers.user_id IS NULL OR store_customers.user_id=EXCLUDED.user_id
     RETURNING id,full_name,email,phone,alternative_phone,address,user_id
    ), session AS (
     INSERT INTO public.auth_sessions(token_hash,user_id,expires_at)
     SELECT ${hash(token)},p.user_id,now()+interval '7 days' FROM profile p
     RETURNING token_hash
    )
    SELECT p.* FROM profile p JOIN session s ON true
   `;
   if(!rows.length)return send(res,409,{error:'This phone could not be linked safely. Sign in to the existing DASNET account or contact support.'});
   cookie(res,token,604800);return send(res,201,{ok:true,customer:customer(rows[0])});
  }
  if(req.method==='POST'&&action==='login'){
   const phone=phoneOf(body.phone),password=String(body.password||'');if(!phone||!password)return send(res,400,{error:'Enter your mobile number and password.'});
   const users=await sql`SELECT id,display_name,password_hash,password_salt,phone_verified_at FROM public.users WHERE phone=${phone} LIMIT 1`,user=users[0];
   if(!user||!user.password_hash||!user.password_salt||!equal(passwordHash(password,user.password_salt),user.password_hash))return send(res,401,{error:'Invalid phone number or password.'});
   if(!user.phone_verified_at)return send(res,403,{error:'Verify your phone before signing in.'});
   const token=crypto.randomBytes(32).toString('base64url');
   const rows=await sql`
    WITH profile AS (
     INSERT INTO public.store_customers(tenant_id,user_id,full_name,email,phone,alternative_phone,address,password_hash,password_salt,phone_verified_at)
     VALUES(${tenantId},${user.id},${user.display_name},NULL,${phone},NULL,NULL,NULL,NULL,now())
     ON CONFLICT(tenant_id,phone) DO UPDATE SET user_id=COALESCE(store_customers.user_id,EXCLUDED.user_id),updated_at=now()
     WHERE store_customers.user_id IS NULL OR store_customers.user_id=EXCLUDED.user_id
     RETURNING id,full_name,email,phone,alternative_phone,address,user_id
    ), session AS (
     INSERT INTO public.auth_sessions(token_hash,user_id,expires_at)
     SELECT ${hash(token)},p.user_id,now()+interval '7 days' FROM profile p
     RETURNING token_hash
    )
    SELECT p.* FROM profile p JOIN session s ON true
   `;
   if(!rows.length)return send(res,409,{error:'A buyer profile for this phone is already linked to a different identity. Contact support to reconcile it.'});
   cookie(res,token,604800);return send(res,200,{ok:true,customer:customer(rows[0])});
  }
  if(req.method==='POST'&&action==='reset-password'){
   const phone=phoneOf(body.phone),password=String(body.password||''),code=String(body.code||'');
   if(!phone||!validPassword(password))return send(res,400,{error:'Use a valid Kenyan phone and a password of at least 10 characters with letters and numbers.'});
   const users=await sql`SELECT id FROM public.users WHERE phone=${phone} LIMIT 1`;
   if(!users.length||!await verify(sql,phone,'password_reset',code))return send(res,400,{error:'The SMS code is invalid or expired.'});
   const salt=crypto.randomBytes(16).toString('hex');
   await sql`UPDATE public.users SET password_hash=${passwordHash(password,salt)},password_salt=${salt},updated_at=now() WHERE id=${users[0].id}`;
   await sql`DELETE FROM public.auth_sessions WHERE user_id=${users[0].id}`;
   await sql`DELETE FROM public.store_customer_sessions WHERE customer_id IN (SELECT id FROM public.store_customers WHERE user_id=${users[0].id} OR phone=${phone})`;
   return send(res,200,{ok:true,message:'Password reset. Sign in again with your DASNET identity.'});
  }
  if(req.method==='POST'&&action==='change-password'){
   const session=globalToken(req);if(!session)return send(res,401,{error:'Sign in to change your password.'});
   const rows=await sql`SELECT u.id,u.password_hash,u.password_salt FROM public.auth_sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=${hash(session)} AND s.expires_at>now() LIMIT 1`,user=rows[0];
   const current=String(body.currentPassword||''),next=String(body.newPassword||''),confirm=String(body.confirmPassword||'');
   if(!user)return send(res,401,{error:'Your session has expired. Sign in again.'});
   if(!current||!user.password_hash||!equal(passwordHash(current,user.password_salt),user.password_hash))return send(res,400,{error:'Your current password is incorrect.'});
   if(!validPassword(next))return send(res,400,{error:'Use a password of at least 10 characters with letters and numbers.'});
   if(next!==confirm)return send(res,400,{error:'The new password and confirmation do not match.'});
   if(current===next)return send(res,400,{error:'Choose a password different from your current password.'});
   const salt=crypto.randomBytes(16).toString('hex');
   await sql`UPDATE public.users SET password_hash=${passwordHash(next,salt)},password_salt=${salt},updated_at=now() WHERE id=${user.id}`;
   await sql`DELETE FROM public.auth_sessions WHERE user_id=${user.id} AND token_hash<>${hash(session)}`;
   await sql`DELETE FROM public.store_customer_sessions WHERE customer_id IN (SELECT id FROM public.store_customers WHERE user_id=${user.id})`;
   return send(res,200,{ok:true,message:'Password changed. Other signed-in sessions have been closed.'});
  }
  if(req.method==='POST'&&action==='update-profile'){
   const session=globalToken(req);if(!session)return send(res,401,{error:'Sign in to update your profile.'});
   const sessions=await sql`SELECT u.id AS user_id FROM public.auth_sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=${hash(session)} AND s.expires_at>now() LIMIT 1`;
   if(!sessions.length)return send(res,401,{error:'Your session has expired. Sign in again.'});
   const name=String(body.name||'').trim().slice(0,120),email=String(body.email||'').trim().toLowerCase().slice(0,254),altRaw=String(body.alternativePhone||'').trim(),alt=altRaw?phoneOf(altRaw):null,address=String(body.address||'').trim().slice(0,300);
   if(name.length<2)return send(res,400,{error:'Enter your full name.'});
   if(!/^\S+@\S+\.\S+$/.test(email))return send(res,400,{error:'Enter a valid email address.'});
   if(altRaw&&!alt)return send(res,400,{error:'Enter a valid Kenyan alternative phone number.'});
   if(!address)return send(res,400,{error:'Enter your default delivery address.'});
   const rows=await sql`UPDATE public.store_customers SET full_name=${name},email=${email},alternative_phone=${alt},address=${address},updated_at=now() WHERE tenant_id=${tenantId} AND user_id=${sessions[0].user_id} RETURNING id,full_name,email,phone,alternative_phone,address`;
   if(!rows.length)return send(res,404,{error:'Buyer profile not found in this shop. Sign in as a buyer first.'});
   return send(res,200,{ok:true,customer:customer(rows[0])});
  }
  if(req.method==='GET'&&action==='session'){
   const current=globalToken(req);
   if(current){
    const rows=await sql`SELECT c.id,c.full_name,c.email,c.phone,c.alternative_phone,c.address FROM public.auth_sessions s JOIN public.store_customers c ON c.user_id=s.user_id AND c.tenant_id=${tenantId} JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=${hash(current)} AND s.expires_at>now() LIMIT 1`;
    if(!rows.length)return send(res,401,{error:'No buyer profile exists for this shop. Sign in to create one.'});
    return send(res,200,{customer:customer(rows[0])});
   }
   const legacy=legacyToken(req);
   if(legacy){
    const rows=await sql`SELECT c.id,c.user_id,c.full_name,c.email,c.phone,c.alternative_phone,c.address FROM public.store_customer_sessions s JOIN public.store_customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id WHERE s.tenant_id=${tenantId} AND s.token_hash=${hash(legacy)} AND s.expires_at>now() AND c.user_id IS NOT NULL LIMIT 1`;
    if(rows.length){
     const token=crypto.randomBytes(32).toString('base64url');
     await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES(${hash(token)},${rows[0].user_id},now()+interval '7 days')`;
     cookie(res,token,604800);return send(res,200,{customer:customer(rows[0])});
    }
   }
   return send(res,401,{error:'Sign in required'});
  }
  if(req.method==='POST'&&action==='logout'){
   const current=globalToken(req),legacy=legacyToken(req);let userId='';
   if(current){const rows=await sql`SELECT user_id FROM public.auth_sessions WHERE token_hash=${hash(current)} LIMIT 1`;userId=rows[0]?.user_id||'';if(userId)await sql`DELETE FROM public.store_customer_sessions WHERE customer_id IN (SELECT id FROM public.store_customers WHERE user_id=${userId})`;await sql`DELETE FROM public.auth_sessions WHERE token_hash=${hash(current)}`;}
   if(legacy){const rows=await sql`SELECT c.user_id FROM public.store_customer_sessions s JOIN public.store_customers c ON c.id=s.customer_id WHERE s.tenant_id=${tenantId} AND s.token_hash=${hash(legacy)} LIMIT 1`;if(!userId)userId=rows[0]?.user_id||'';if(userId)await sql`DELETE FROM public.store_customer_sessions WHERE customer_id IN (SELECT id FROM public.store_customers WHERE user_id=${userId})`;else await sql`DELETE FROM public.store_customer_sessions WHERE tenant_id=${tenantId} AND token_hash=${hash(legacy)}`;}
   res.setHeader('Set-Cookie',[`das_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,`das_buyer_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`]);
   return send(res,200,{ok:true});
  }
  return send(res,404,{error:'Unknown buyer authentication action'});
 }catch(error:any){
  if(error?.message==='SMS_CONFIG')return send(res,503,{error:'OTS SMS credentials are not configured.'});
  if(error?.message==='SMS_FAILED')return send(res,502,{error:'The SMS provider could not send the code. Check OTS sender ID and credits.'});
  if(error?.message==='DB_CONFIG')return send(res,503,{error:'DASNET database connection is not configured.'});
  if(error?.code==='23505')return send(res,409,{error:'This account is already linked to a profile or shop. Sign in or contact support.'});
  console.error('Buyer auth error',error);return send(res,500,{error:'Buyer authentication failed. Check database migration and configuration.'});
 }
}
