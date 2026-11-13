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
export async function sendUsingResendConfig(apiKey:string,fromEmail:string,fromName:string,replyTo:string,input:EmailInput){return sendWithResend({...input,apiKey,from:fromName.trim()?fromName.trim()+' <'+fromEmail+'>':fromEmail,replyTo});}
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
  let shopInput=input;
  try{
   const branding=await sql`SELECT logo_url,contact_email FROM public.sites WHERE tenant_id=${tenantId} LIMIT 1`;
   const logo=safeHttpUrl(String(branding[0]?.logo_url||''));
   if(logo&&shopInput.html.includes('SHOP UPDATE')){
    const logoMarkup='<img src="'+escapeEmailHtml(logo)+'" alt="Shop logo" width="150" style="display:block;max-width:150px;max-height:56px;object-fit:contain;border:0">';
    shopInput={...shopInput,html:shopInput.html.replace(/<span style="font-size:22px;line-height:1\.2;font-weight:800;letter-spacing:-\.5px;color:[^"]+">[^<]*<\\/span>/,logoMarkup)};
   }
  }catch(error:any){console.warn('Shop email branding lookup skipped',String(error?.message||error).slice(0,160));}
  if(row?.enabled&&row.encrypted_config?.ciphertext){
   const secret=decryptTenantEmailConfig(row.encrypted_config);
   const result=await sendWithResend({...shopInput,apiKey:String(secret.apiKey||''),from:String(secret.fromName||'').trim()?String(secret.fromName).trim()+' <'+row.from_email+'>':row.from_email,replyTo:row.reply_to_email});
   if(result.sent)return result;
   console.warn('Seller Resend delivery failed; attempting platform sender fallback.',{tenantId,reason:result.reason});
  }
 }catch(error:any){console.error('Seller email configuration could not be loaded; using platform sender fallback.',String(error?.message||error).slice(0,200));}
 return sendWithResend(shopInput);
}
type EmailTemplateOptions={logoUrl?:string;accentColor?:string;buttonLabel?:string;buttonUrl?:string;productImageUrl?:string;productName?:string;preheader?:string;supportEmail?:string};
function safeHttpUrl(value:string|undefined){const v=String(value||'').trim();return /^https?:\/\/[^\s"'<>]+$/i.test(v)?v:'';}
function emailShell(brand:string,heading:string,intro:string,details:Record<string,string>,options:EmailTemplateOptions,platform:boolean){
 const safeBrand=escapeEmailHtml(brand),title=escapeEmailHtml(heading),message=escapeEmailHtml(intro);
 const accent=/^#[0-9a-f]{6}$/i.test(options.accentColor||'')?options.accentColor!:(platform?'#123b8a':'#123b8a');
 const logo=safeHttpUrl(options.logoUrl),productImage=safeHttpUrl(options.productImageUrl),buttonUrl=safeHttpUrl(options.buttonUrl);
 const rows=Object.entries(details).map(([key,value])=>'<tr><td style="padding:12px 8px;color:#667085;border-bottom:1px solid #e8edf5;font-size:14px">'+escapeEmailHtml(key)+'</td><td style="padding:12px 8px;text-align:right;font-weight:700;color:#17233c;border-bottom:1px solid #e8edf5;font-size:14px">'+escapeEmailHtml(value)+'</td></tr>').join('');
 const preheader=escapeEmailHtml(options.preheader||intro);
 const brandMark=logo?'<img src="'+escapeEmailHtml(logo)+'" alt="'+safeBrand+' logo" width="150" style="display:block;max-width:150px;max-height:56px;object-fit:contain;border:0">':'<span style="font-size:22px;line-height:1.2;font-weight:800;letter-spacing:-.5px;color:'+(platform?'#102b63':'#17233c')+'">'+safeBrand+'</span>';
 const product=productImage?'<div style="margin:20px 0;text-align:center"><img src="'+escapeEmailHtml(productImage)+'" alt="'+escapeEmailHtml(options.productName||'Ordered product')+'" width="220" style="display:inline-block;width:100%;max-width:220px;height:auto;border-radius:12px"></div>':'';
 const cta=buttonUrl?'<div style="padding:22px 0 8px;text-align:center"><a href="'+escapeEmailHtml(buttonUrl)+'" style="display:inline-block;background:#ffc400;color:#102b63;text-decoration:none;font-weight:800;padding:14px 25px;border-radius:9px">'+escapeEmailHtml(options.buttonLabel||'View details')+' &rarr;</a></div>':'';
 const footer=platform
  ?'<div style="padding:20px 28px;background:#102b63;color:#fff;text-align:center;font-size:12px;line-height:1.7">DASMARKET · Shop Smart. Live Better.<br><a href="https://dasmarket.co.ke" style="color:#ffd34e;text-decoration:underline">Visit DASMARKET</a></div>'
  :'<div style="padding:20px 28px;background:#102b63;color:#fff;text-align:center;font-size:12px;line-height:1.7">You received this email because you interacted with '+safeBrand+'.<br><span style="color:#ffd34e;font-weight:700">Powered by DASMARKET</span></div>';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title></head><body style="margin:0;padding:0;background:#f2f5fa;font-family:Arial,Helvetica,sans-serif;color:#17233c"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">'+preheader+'</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f5fa;padding:26px 10px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e4eaf3;border-radius:14px;overflow:hidden"><tr><td style="padding:22px 28px;border-bottom:1px solid #edf0f5"><table role="presentation" width="100%"><tr><td>'+brandMark+'</td><td align="right" style="font-size:11px;color:#667085">'+(platform?'PLATFORM NOTICE':'SHOP UPDATE')+'</td></tr></table></td></tr><tr><td style="padding:30px 28px 12px"><div style="height:4px;width:52px;background:'+accent+';border-radius:4px;margin-bottom:20px"></div><h1 style="font-size:25px;line-height:1.25;margin:0 0 14px;color:#102b63">'+title+'</h1><p style="font-size:15px;line-height:1.7;margin:0;color:#39465c">'+message+'</p>'+product+(rows?'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;margin:22px 0;background:#f7f9fc;border:1px solid #e8edf5;border-radius:10px">'+rows+'</table>':'')+cta+'<p style="font-size:12px;line-height:1.6;color:#8490a3;margin:26px 0 8px">'+(platform?'This is an official service email from DASMARKET.':'This is an automatic transactional email from '+safeBrand+'. For questions, contact the shop directly.')+'</p></td></tr>'+ (options.supportEmail?'<tr><td style="padding:0 28px 20px;font-size:12px;color:#667085">Support: <a href="mailto:'+escapeEmailHtml(options.supportEmail)+'" style="color:#123b8a">'+escapeEmailHtml(options.supportEmail)+'</a></td></tr>':'')+'<tr><td>'+footer+'</td></tr></table><p style="font-size:11px;color:#98a2b3;margin:14px 0">Please do not reply with passwords, PINs or one-time security codes.</p></td></tr></table></body></html>';
 const text=[heading,intro,...Object.entries(details).map(([k,v])=>k+': '+v),buttonUrl?((options.buttonLabel||'View details')+': '+buttonUrl):'',platform?'DASMARKET · Shop Smart. Live Better.':'Powered by DASMARKET'].filter(Boolean).join('\n\n');
 return {html,text};
}
export function platformBrandedEmail(heading:string,intro:string,details:Record<string,string>={},options:EmailTemplateOptions={}){return emailShell('DASMARKET',heading,intro,details,{...options,supportEmail:options.supportEmail||'support@dasnet.co.ke'},true);}
export function shopBrandedEmail(shopName:string,heading:string,intro:string,details:Record<string,string>={},options:EmailTemplateOptions={}){return emailShell(shopName,heading,intro,details,options,false);}
export function brandedEmail(brandName:string,heading:string,intro:string,details:Record<string,string>={},options:EmailTemplateOptions={}){
 return String(brandName||'').trim().toLowerCase()==='dasmarket'
  ?platformBrandedEmail(heading,intro,details,options)
  :shopBrandedEmail(brandName||'Your shop',heading,intro,details,options);
}
