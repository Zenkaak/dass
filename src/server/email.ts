import crypto from 'node:crypto';

type EmailInput={to:string;subject:string;html:string;text:string;replyTo?:string;from?:string;apiKey?:string;idempotencyKey?:string};
const env=(key:string)=>String((globalThis as any).process?.env?.[key]||'').trim();
export function escapeEmailHtml(value:unknown){
 return String(value??'').replace(/[&<>"']/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character] as string));
}
function encryptionKey(){
 const value=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
 const raw=/^[0-9a-f]{64}$/i.test(value)?Buffer.from(value,'hex'):Buffer.from(value,'base64');
 if(raw.length!==32)throw Error('Email credential encryption is not configured correctly.');
 return raw;
}
export function encryptTenantEmailConfig(value:any){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
 return {iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')};
}
export function decryptTenantEmailConfig(blob:any){
 const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(blob.iv,'base64'));
 decipher.setAuthTag(Buffer.from(blob.tag,'base64'));
 return JSON.parse(Buffer.concat([decipher.update(Buffer.from(blob.ciphertext,'base64')),decipher.final()]).toString('utf8'));
}
async function sendWithResend(input:EmailInput){
 const apiKey=input.apiKey||env('RESEND_API_KEY');
 if(!apiKey){console.warn('Transactional email skipped: no Resend API key is configured.');return {sent:false,reason:'not_configured'} as const;}
 const from=input.from||env('RESEND_FROM_EMAIL')||'DASMARKET <notifications@dasmarket.co.ke>';
 const replyTo=input.replyTo||env('RESEND_REPLY_TO')||'support@dasnet.co.ke';
 const headers:Record<string,string>={Authorization:'Bearer '+apiKey,'Content-Type':'application/json',Accept:'application/json'};
 if(input.idempotencyKey)headers['Idempotency-Key']=input.idempotencyKey.slice(0,256);
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',headers,
  body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html,text:input.text,reply_to:replyTo}),
  signal:AbortSignal.timeout(10000)
 });
 const result:any=await response.json().catch(()=>({}));
 if(!response.ok){
  console.error('Resend email delivery failed',{status:response.status,error:String(result?.message||result?.name||'Provider rejected email').slice(0,240)});
  return {sent:false,reason:'provider_error',status:response.status} as const;
 }
 return {sent:true,id:String(result?.id||'')} as const;
}
export async function sendTransactionalEmail(input:EmailInput){return sendWithResend(input);}
export async function sendTenantTransactionalEmail(sql:any,tenantId:string,input:EmailInput){
 try{
  await sql`CREATE TABLE IF NOT EXISTS public.tenant_email_configs (
   tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
   encrypted_config jsonb NOT NULL,
   from_email text NOT NULL,
   reply_to_email text NOT NULL,
   enabled boolean NOT NULL DEFAULT true,
   updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  const rows=await sql`SELECT encrypted_config,from_email,reply_to_email,enabled FROM public.tenant_email_configs WHERE tenant_id=${tenantId} LIMIT 1`;
  const row=rows[0];
  if(row?.enabled&&row.encrypted_config?.ciphertext){
   const secret=decryptTenantEmailConfig(row.encrypted_config);
   const result=await sendWithResend({...input,apiKey:String(secret.apiKey||''),from:String(secret.fromName||'').trim()?String(secret.fromName).trim()+' <'+row.from_email+'>':row.from_email,replyTo:row.reply_to_email});
   if(result.sent)return result;
   console.warn('Seller Resend delivery failed; attempting platform sender fallback.',{tenantId,reason:result.reason});
  }
 }catch(error:any){console.error('Seller email configuration could not be loaded; using platform sender fallback.',String(error?.message||error).slice(0,200));}
 return sendWithResend(input);
}
export function brandedEmail(shopName:string,heading:string,intro:string,details:Record<string,string>={}){
 const shop=escapeEmailHtml(shopName),title=escapeEmailHtml(heading),message=escapeEmailHtml(intro);
 const rows=Object.entries(details).map(([key,value])=>'<tr><td style="padding:10px 0;color:#667085;border-bottom:1px solid #eaecf0">'+escapeEmailHtml(key)+'</td><td style="padding:10px 0;text-align:right;font-weight:600;border-bottom:1px solid #eaecf0">'+escapeEmailHtml(value)+'</td></tr>').join('');
 const html='<div style="background:#f5f7fa;padding:24px 12px;font-family:Arial,sans-serif;color:#202124"><div style="max-width:600px;margin:auto;background:#fff;border:1px solid #eaecf0;border-radius:14px;overflow:hidden"><div style="padding:22px 24px;background:#161616;color:#fff"><strong style="font-size:18px">'+shop+'</strong></div><div style="padding:26px 24px"><h1 style="font-size:22px;margin:0 0 14px">'+title+'</h1><p style="font-size:15px;line-height:1.6">'+message+'</p>'+(rows?'<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0">'+rows+'</table>':'')+'<p style="font-size:12px;color:#667085;margin-top:28px">This is an automatic transactional message from '+shop+'.</p><p style="font-size:12px;color:#667085">Powered by DASMARKET</p></div></div></div>';
 const text=[heading,intro,...Object.entries(details).map(([k,v])=>k+': '+v),'Powered by DASMARKET'].join('\n\n');
 return {html,text};
}
