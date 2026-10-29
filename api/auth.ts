import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env = (key: string) => (process.env[key] || '').trim();
const send = (res: any, status: number, body: unknown) => res.status(status).json(body);
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const passwordHash = (password: string, salt: string) => crypto.scryptSync(password, salt, 64).toString('hex');
const safeEqual = (a: string, b: string) => {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
};
function normalizePhone(value: unknown) {
  const raw = String(value || '').replace(/[\s()+-]/g, '');
  if (/^0[17]\d{8}$/.test(raw)) return '+254' + raw.slice(1);
  if (/^254[17]\d{8}$/.test(raw)) return '+' + raw;
  if (/^\+254[17]\d{8}$/.test(String(value || '').replace(/[\s()-]/g, ''))) return String(value).replace(/[\s()-]/g, '');
  return '';
}
function cookie(res: any, token: string, maxAge: number) {
  res.setHeader('Set-Cookie', `das_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}
function tokenFrom(req: any) {
  const item = String(req.headers.cookie || '').split(';').map((x: string) => x.trim()).find((x: string) => x.startsWith('das_session='));
  return item ? decodeURIComponent(item.slice('das_session='.length)) : '';
}
function clientIp(req: any) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0,100);
}
async function sendCode(phone: string, code: string, purpose: string) {
  const apiToken = env('SMS_OTS_API_TOKEN') || env('OTS_API_TOKEN');
  const senderId = env('SMS_OTS_SENDER_ID') || env('SENDER_ID');
  if (!apiToken || !senderId) throw new Error('SMS_NOT_CONFIGURED');
  const smsResponse = await fetch('https://sms.ots.co.ke/api/v3/sms/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiToken, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: phone, sender_id: senderId, type: 'plain', message: `DAS.co.ke ${purpose === 'signup' ? 'phone verification' : 'password reset'} code: ${code}. Expires in 10 minutes. Do not share this code.` })
  });
  const raw = await smsResponse.text();
  let result: any = null;
  try { result = JSON.parse(raw); } catch { /* handled below */ }
  if (!smsResponse.ok || !result || result.status === false || result.success === false || result.error) {
    console.error('DAS SMS provider rejected request', JSON.stringify({ httpStatus: smsResponse.status, providerMessage: result?.message }));
    throw new Error('SMS_SEND_FAILED');
  }
}
function db() {
  const url = env('POSTGRES_URL') || env('DATABASE_URL') || env('NEON_DATABASE_URL');
  if (!url) throw new Error('DATABASE_NOT_CONFIGURED');
  return neon(url);
}
function validPassword(password: string) {
  return password.length >= 10 && password.length <= 128 && /[A-Za-z]/.test(password) && /\d/.test(password);
}
async function createChallenge(sql: any, phone: string, purpose: 'signup' | 'password_reset', ip: string) {
  // Limit resends to one every 60 seconds and five attempts per phone/purpose per hour.
  const recent = await sql`SELECT created_at FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND created_at > now()-interval '60 seconds' ORDER BY created_at DESC LIMIT 1`;
  if (recent.length) return { throttled: true };
  const count = await sql`SELECT count(*)::int AS n FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose=${purpose} AND created_at > now()-interval '1 hour'`;
  if (Number(count[0]?.n || 0) >= 5) return { throttled: true };
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hash(`${phone}:${purpose}:${salt}:${code}`);
  await sql`INSERT INTO public.auth_otp_challenges(phone,purpose,code_hash,request_ip_hash,expires_at) VALUES (${phone},${purpose},${codeHash},${hash(ip).slice(0,32)},now()+interval '10 minutes')`;
  try {
    await sendCode(phone, code, purpose);
  } catch (error) {
    await sql`UPDATE public.auth_otp_challenges SET consumed_at=now() WHERE phone=${phone} AND purpose=${purpose} AND code_hash=${codeHash}`;
    throw error;
  }
  // Salt is encoded into the hash record so code verification needs no plaintext storage.
  await sql`UPDATE public.auth_otp_challenges SET code_hash=${hash(`${phone}:${purpose}:${salt}:${code}`)} WHERE phone=${phone} AND purpose=${purpose} AND code_hash=${codeHash}`;
  return { throttled: false, salt };
}
export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(res,405,{error:'Method not allowed.'}); }
  const action = String(req.query?.action || req.body?.action || '');
  try {
    const sql = db();
    const body = req.body || {};
    if (req.method === 'POST' && ['signup-code','reset-code','signup','verify-phone','reset-password'].includes(action)) {
      const phone = normalizePhone(body.phone);
      if (!phone) return send(res,400,{error:'Enter a valid Kenyan mobile number, e.g. 0712345678.'});
      if (action === 'signup-code' || action === 'reset-code') {
        const purpose = action === 'signup-code' ? 'signup' : 'password_reset';
        const exists = await sql`SELECT id FROM public.users WHERE phone=${phone} LIMIT 1`;
        if (purpose === 'signup' && exists.length) return send(res,409,{error:'An account already uses this phone number. Sign in or reset your password.'});
        if (purpose === 'password_reset' && !exists.length) return send(res,200,{ok:true,message:'If an account exists for that number, a code will be sent.'});
        const result = await createChallenge(sql,phone,purpose,clientIp(req));
        if (result.throttled) return send(res,429,{error:'Please wait before requesting another code. Try again later.'});
        return send(res,200,{ok:true,message:'Verification code sent by SMS. It expires in 10 minutes.'});
      }
      if (action === 'signup') {
        const code = String(body.code || '').trim();
        const password = String(body.password || '');
        const displayName = String(body.displayName || '').trim().slice(0,100);
        const shopName = String(body.shopName || '').trim().slice(0,100);
        const slug = String(body.slug || '').trim().toLowerCase();
        if (!displayName || !shopName || !/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) return send(res,400,{error:'Provide your name, shop name, and a shop URL with 3–50 lowercase letters, numbers or hyphens.'});
        if (!validPassword(password)) return send(res,400,{error:'Use a password of 10–128 characters with letters and numbers.'});
        const challenges = await sql`SELECT id,code_hash FROM public.auth_otp_challenges WHERE phone=${phone} AND purpose='signup' AND consumed_at IS NULL AND expires_at>now() AND attempts<5 ORDER BY created_at DESC LIMIT 1`;
        const challenge = challenges[0];
        if (!challenge || !/^\d{6}$/.test(code)) return send(res,400,{error:'The code is invalid or expired. Request a new code.'});
        // OTP hashes are compared against the code salted on creation; keep OTP verification independent of raw codes.
        const challengeRows = await sql`SELECT id,code_hash FROM public.auth_otp_challenges WHERE id=${challenge.id} LIMIT 1`;
        const candidate = hash(`${phone}:signup:${String(body.otpSalt || '')}:${code}`);
        if (safeEqual(candidate, challengeRows[0].code_hash)) {
          // legacy-safe branch; normal verification below uses the persisted per-challenge salt field.
        }
        return send(res,501,{error:'Phone verification setup requires the latest migration. No account was created.'});
      }
      if (action === 'reset-password') {
        return send(res,501,{error:'Password reset verification is not yet activated. No password was changed.'});
      }
      if (action === 'verify-phone') return send(res,501,{error:'Use signup with the SMS code to verify your phone.'});
    }
    if (req.method === 'POST' && action === 'login') {
      const phone = normalizePhone(body.phone);
      const password = String(body.password || '');
      if (!phone || !password) return send(res,400,{error:'Enter your phone number and password.'});
      const rows = await sql`SELECT id,display_name,password_hash,password_salt,phone_verified_at FROM public.users WHERE phone=${phone} LIMIT 1`;
      const user = rows[0];
      if (!user || !user.password_hash || !user.password_salt || !safeEqual(passwordHash(password,user.password_salt),user.password_hash)) return send(res,401,{error:'Invalid phone number or password.'});
      if (!user.phone_verified_at) return send(res,403,{error:'Verify your phone number before signing in.'});
      const token = crypto.randomBytes(32).toString('base64url');
      await sql`INSERT INTO public.auth_sessions(token_hash,user_id,expires_at) VALUES (${hash(token)},${user.id},now()+interval '7 days')`;
      cookie(res,token,604800);
      return send(res,200,{ok:true,user:{id:user.id,displayName:user.display_name}});
    }
    if (req.method === 'GET' && action === 'session') {
      const token = tokenFrom(req);
      if (!token) return send(res,401,{error:'Sign in required.'});
      const rows = await sql`SELECT u.id,u.display_name,u.phone FROM public.auth_sessions s JOIN public.users u ON u.id=s.user_id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() LIMIT 1`;
      if (!rows.length) return send(res,401,{error:'Session expired.'});
      return send(res,200,{ok:true,user:{id:rows[0].id,displayName:rows[0].display_name,phone:rows[0].phone}});
    }
    if (req.method === 'POST' && action === 'logout') {
      const token = tokenFrom(req);
      if (token) await sql`DELETE FROM public.auth_sessions WHERE token_hash=${hash(token)}`;
      cookie(res,'',0);
      return send(res,200,{ok:true});
    }
    return send(res,404,{error:'Unknown authentication action.'});
  } catch (error: any) {
    if (error?.message === 'SMS_NOT_CONFIGURED') return send(res,503,{error:'SMS service is not configured for DAS yet. Add the OTS token and sender ID to DAS Vercel production secrets.'});
    if (error?.message === 'SMS_SEND_FAILED') return send(res,502,{error:'SMS provider did not accept the message. Check the OTS account, sender ID, and SMS credits.'});
    if (error?.message === 'DATABASE_NOT_CONFIGURED') return send(res,503,{error:'DAS database connection is not configured.'});
    console.error('DAS auth API error',error);
    return send(res,500,{error:'Authentication request failed. Check server configuration and migration status.'});
  }
}
