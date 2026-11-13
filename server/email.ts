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
   const branding=await sql`SELECT t.name AS shop_name,s.logo_url,s.contact_email FROM public.tenants t LEFT JOIN public.sites s ON s.tenant_id=t.id WHERE t.id=${tenantId} LIMIT 1`;
   const logo=safeHttpUrl(String(branding[0]?.logo_url||''));
   const shopLabel=String(branding[0]?.shop_name||'Shop').replace(/[<>\\r\\n]/g,'').slice(0,80);
   const configuredFrom=env('RESEND_FROM_EMAIL')||'DASMARKET <notifications@dasmarket.co.ke>';
   const senderAddress=configuredFrom.match(/<([^>]+)>/)?.[1]||configuredFrom;
   var shopFallbackFrom=shopLabel+' via DASMARKET <'+senderAddress+'>';
   if(logo&&shopInput.html.includes('<!--SHOP_LOGO_SLOT-->')){
    const logoMarkup='<img src="'+escapeEmailHtml(logo)+'" alt="'+escapeEmailHtml(shopLabel)+' logo" width="34" height="34" style="display:inline-block;width:34px;height:34px;object-fit:contain;vertical-align:middle;border-radius:7px;border:1px solid #e5eaf3;background:#fff">';
    shopInput={...shopInput,html:shopInput.html.replace('<!--SHOP_LOGO_SLOT-->',logoMarkup)};
   }else{
    shopInput={...shopInput,html:shopInput.html.replace('<!--SHOP_LOGO_SLOT-->','')};
   }
  }catch(error:any){console.warn('Shop email branding lookup skipped',String(error?.message||error).slice(0,160));}
  if(row?.enabled&&row.encrypted_config?.ciphertext){
   const secret=decryptTenantEmailConfig(row.encrypted_config);
   const result=await sendWithResend({...shopInput,apiKey:String(secret.apiKey||''),from:String(secret.fromName||'').trim()?String(secret.fromName).trim()+' <'+row.from_email+'>':row.from_email,replyTo:row.reply_to_email});
   if(result.sent)return result;
   console.warn('Seller Resend delivery failed; attempting platform sender fallback.',{tenantId,reason:result.reason});
  }
 }catch(error:any){console.error('Seller email configuration could not be loaded; using platform sender fallback.',String(error?.message||error).slice(0,200));}
 return sendWithResend({...shopInput,from:(typeof shopFallbackFrom==='string'&&shopFallbackFrom)||undefined});
}
type EmailLineItem={name:string;quantity:number;lineTotal:string;imageUrl?:string};
type EmailTemplateOptions={logoUrl?:string;accentColor?:string;buttonLabel?:string;buttonUrl?:string;productImageUrl?:string;productName?:string;items?:EmailLineItem[];preheader?:string;supportEmail?:string};
function safeHttpUrl(value:string|undefined){const v=String(value||'').trim();return /^https?:\/\/[^\s"'<>]+$/i.test(v)?v:'';}
function templateKind(heading:string,brand:string){
 const h=String(heading||'').toLowerCase(),b=String(brand||'').toLowerCase();
 if(h.includes('new report received')||h.includes('dispute requires'))return 'admin-report';
 if(h.includes('password reset')||h.includes('reset code'))return 'password';
 if(h.includes('welcome'))return 'welcome';
 if(h.includes('shipped')||h.includes('dispatch')||h.includes('in transit'))return 'shipped';
 if(h.includes('report')||h.includes('support case')||h.includes('support ticket'))return 'report';
 if(h.includes('low stock')||h.includes('stock alert'))return 'low-stock';
 if(h.includes('new message')||h.includes('message from a buyer'))return 'message';
 if(h.includes('payout'))return 'payout';
 if(h.includes('subscription')||h.includes('renewal')||h.includes('licence'))return 'subscription';
 if(h.includes('new order received')||h.includes('new order'))return 'seller-order';
 if(h.includes('payment received'))return 'seller-payment';
 if(h.includes('order confirmed')||h.includes('order received')||h.includes('we received your order')||h.includes('payment confirmed'))return 'order';
 if(h.includes('order updated')||h.includes('order status'))return 'order-update';
 return b==='dasmarket'?'platform':'shop';
}
function emailShell(brand:string,heading:string,intro:string,details:Record<string,string>,options:EmailTemplateOptions,platform:boolean){
 const kind=templateKind(heading,brand),safeBrand=escapeEmailHtml(brand),title=escapeEmailHtml(heading),message=escapeEmailHtml(intro);
 const buttonUrl=safeHttpUrl(options.buttonUrl),buttonLabel=escapeEmailHtml(options.buttonLabel||'View details');
 const accent=kind==='seller-payment'||kind==='payout'?'#07833b':kind==='admin-report'||kind==='low-stock'?'#e21b23':kind==='subscription'?'#6b20c9':kind==='message'?'#1d63df':'#0645ad';
 const logo=safeHttpUrl(options.logoUrl),productImage=safeHttpUrl(options.productImageUrl);
 const preheader=escapeEmailHtml(options.preheader||intro);
 const items=options.items||[];
 const firstImage=productImage||(items.length?safeHttpUrl(items[0].imageUrl):'');
 const rows=Object.entries(details||{}).map(([key,value])=>'<tr><td style="padding:8px 10px;color:#172b62;font-size:13px;border-bottom:1px solid #e7edf8">'+escapeEmailHtml(key)+'</td><td align="right" style="padding:8px 10px;color:#101b3d;font-size:13px;font-weight:700;border-bottom:1px solid #e7edf8">'+escapeEmailHtml(value)+'</td></tr>').join('');
 const detailCard=rows?'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:18px 0;background:#f1f5ff;border:1px solid #dce6fb;border-radius:12px;overflow:hidden">'+rows+'</table>':'';
 const productRows=items.slice(0,8).map(item=>{const image=safeHttpUrl(item.imageUrl);return '<tr><td width="82" style="padding:9px;border-bottom:1px solid #e3eafa">'+(image?'<img src="'+escapeEmailHtml(image)+'" alt="" width="70" height="70" style="display:block;width:70px;height:70px;object-fit:contain;border-radius:9px;background:#fff">':'<div style="width:70px;height:70px;border-radius:9px;background:#eaf0fc"></div>')+'</td><td style="padding:9px;border-bottom:1px solid #e3eafa;color:#101b3d;font-size:13px;font-weight:700">'+escapeEmailHtml(item.name)+'<div style="font-size:12px;font-weight:400;margin-top:5px">Qty: '+Math.max(1,Math.min(999,Math.floor(Number(item.quantity)||1)))+'</div></td><td align="right" style="padding:9px;border-bottom:1px solid #e3eafa;font-size:13px;font-weight:700;white-space:nowrap">'+escapeEmailHtml(item.lineTotal)+'</td></tr>';}).join('');
 const products=productRows?'<div style="margin-top:20px;font-size:14px;font-weight:800;color:#102b63">Ordered Products</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border-collapse:collapse;background:#f5f8ff;border:1px solid #dfe8fb;border-radius:12px;overflow:hidden">'+productRows+'</table>':(firstImage?'<div style="margin:18px 0;padding:10px;background:#f1f5ff;border-radius:12px"><img src="'+escapeEmailHtml(firstImage)+'" alt="'+escapeEmailHtml(options.productName||'Product')+'" width="150" style="display:block;width:100%;max-width:150px;height:auto;margin:auto;border-radius:9px"></div>':'');
 const cta=buttonUrl?'<div style="padding:20px 0 8px;text-align:center"><a href="'+escapeEmailHtml(buttonUrl)+'" style="display:inline-block;background:'+(kind==='shipped'?'#0645ad':kind==='seller-payment'||kind==='payout'?'#07833b':kind==='admin-report'?'#e21b23':'#ffbd00')+';color:'+(kind==='shipped'||kind==='seller-payment'||kind==='payout'||kind==='admin-report'?'#fff':'#102b63')+';text-decoration:none;font-size:14px;font-weight:800;padding:13px 28px;border-radius:11px">'+buttonLabel+' &rarr;</a></div>':'';
 const codeMatch=String(intro||'').match(/\b\d{6}\b/);
 const codeBlock=kind==='password'&&codeMatch?'<div style="margin:20px auto;padding:14px 18px;max-width:240px;text-align:center;background:#f1f5ff;border:1px dashed #9ab4e7;border-radius:12px;font-size:28px;font-weight:800;letter-spacing:7px;color:#102b63">'+codeMatch[0]+'</div>':'';
 const logoMark=logo?'<img src="'+escapeEmailHtml(logo)+'" alt="DASMARKET" width="170" style="display:inline-block;max-width:170px;max-height:52px;object-fit:contain">':'<span style="display:inline-block;vertical-align:middle;background:#ffbd00;color:#07347e;border-radius:10px;padding:7px 9px;font-size:21px;font-weight:900">🛍</span> <span style="display:inline-block;vertical-align:middle;font-size:21px;line-height:1.1;font-weight:900;color:#071d55">DASMARKET<small style="display:block;font-size:9px;letter-spacing:.1px;font-weight:700;color:#071d55">Shop Smart. Live Better.</small></span>';
 const shopLogoSlot=platform?'':'<!--SHOP_LOGO_SLOT-->';
 const header='<tr><td style="padding:18px 24px;background:#fff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td>'+logoMark+'</td><td align="right" style="font-size:11px;font-weight:700;color:#102b63">'+shopLogoSlot+(platform?'':'<span style="display:block;margin-top:4px">Seller Notification</span>')+'</td></tr></table></td></tr>';
 let hero='';
 if(kind==='password')hero='<tr><td style="padding:24px;background:#062e78;color:#fff;text-align:center">'+logoMark+'</td></tr><tr><td style="padding:24px 28px 10px;text-align:center"><div style="font-size:38px">🔒</div><h1 style="font-size:23px;color:#09245f;margin:8px 0 12px">'+title+'</h1><p style="font-size:14px;line-height:1.65;color:#27334b;margin:0">'+message+'</p>'+codeBlock+'</td></tr>';
 else if(kind==='order')hero='<tr><td style="padding:24px 28px 8px;text-align:center"><div style="font-size:42px;color:#19a64a">●</div><div style="font-size:32px;color:#fff;background:#20a653;border-radius:50%;width:54px;height:54px;line-height:54px;margin:0 auto 12px">✓</div><h1 style="font-size:22px;color:#081e57;margin:0 0 10px">'+title+'</h1><p style="font-size:14px;line-height:1.55;margin:0;color:#172033">'+message+'</p></td></tr>';
 else if(kind==='shipped')hero='<tr><td style="padding:24px 28px 8px;text-align:center"><div style="font-size:46px">🚚</div><h1 style="font-size:22px;color:#081e57;margin:8px 0 10px">'+title+'</h1><p style="font-size:14px;line-height:1.55;margin:0;color:#172033">'+message+'</p></td></tr>';
 else if(kind==='report')hero='<tr><td style="padding:24px 28px 8px"><div style="font-size:48px;text-align:right">🎧</div><h1 style="font-size:22px;color:#081e57;margin:0 0 12px">'+title+'</h1><p style="font-size:14px;line-height:1.6;color:#172033">'+message+'</p><div style="margin-top:18px;padding:16px;background:#eaf2ff;border:1px solid #d6e4ff;border-radius:12px;font-size:14px;color:#102b63">💬 &nbsp; View the latest update and continue the conversation in your dashboard.</div></td></tr>';
 else if(kind==='welcome')hero='<tr><td style="padding:24px 26px;background:#f7f9ff"><h1 style="font-size:22px;color:#081e57;margin:0 0 12px">'+title+'</h1><p style="font-size:14px;line-height:1.65;color:#172033;margin:0">'+message+'</p><div style="padding:16px 0 4px;color:#102b63;font-size:13px;line-height:2">🛍 &nbsp; Shop from trusted sellers<br>🛡 &nbsp; Secure payments<br>🏷 &nbsp; Get great deals</div></td></tr>';
 else {
  const icon=kind==='seller-order'?'🛒':kind==='seller-payment'?'✓':kind==='low-stock'?'⚠':kind==='message'?'💬':kind==='payout'?'💰':kind==='subscription'?'👑':kind==='admin-report'?'🔔':'✦';
  const bg=kind==='seller-payment'||kind==='payout'?'#087b3a':kind==='low-stock'||kind==='admin-report'?'#ffe0d6':kind==='message'?'#dceaff':kind==='subscription'?'#6818c7':'#062f85';
  const fg=kind==='low-stock'||kind==='admin-report'?'#a10e0e':'#fff';
  hero='<tr><td style="padding:24px 26px;background:'+bg+';color:'+fg+'"><div style="font-size:38px;margin-bottom:8px">'+icon+'</div><h1 style="font-size:23px;line-height:1.2;margin:0 0 8px;color:'+fg+'">'+title+'</h1><p style="font-size:14px;line-height:1.5;margin:0;color:'+fg+'">'+message+'</p></td></tr>';
 }
 const detailsBlock=kind==='order'||kind==='shipped'||kind==='welcome'||kind==='password'||kind==='report'?detailCard:detailCard;
 const extra=kind==='order'?'<div style="margin:16px 0;padding:13px;background:#eaf2ff;border:1px solid #d8e6ff;border-radius:10px;text-align:center;font-size:13px;color:#102b63">🚚 &nbsp; <b>Estimated Delivery</b><br>1–3 working days</div>':kind==='shipped'?'<div style="margin:16px 0;padding:13px;background:#eaf2ff;border:1px solid #d8e6ff;border-radius:10px;text-align:center;font-size:13px;color:#102b63"><b>Track Your Order</b><br>Click the button below to track your delivery in real-time.</div>':kind==='low-stock'?'<div style="margin:12px 0;color:#d20d17;font-size:16px;font-weight:800;text-align:center">Only a few units left in stock</div>':kind==='subscription'?'<div style="margin:16px 0;padding:13px;background:#eee6ff;border-radius:11px;text-align:center;color:#381078;font-size:13px">📅 &nbsp; Your subscription details are listed below.</div>':'';
 const adminFooter=kind==='admin-report'?'<tr><td style="padding:16px;text-align:center;border-top:1px solid #e5eaf4;font-size:12px;color:#102b63;font-weight:800">DASMARKET Admin Panel</td></tr>':'';
 const footer='<tr><td style="padding:15px 18px;background:#062e78;text-align:center;color:#fff;font-size:12px;font-weight:800">Powered by DASMARKET <span style="color:#ffbd00">♥</span></td></tr>';
 const social='<div style="padding:6px 0 12px;text-align:center;color:#092b70;font-size:14px;font-weight:800">f &nbsp; 𝕏 &nbsp; ▶ &nbsp; ♪</div>';
 const body='<tr><td style="padding:8px 26px 22px">'+(kind==='seller-order'||kind==='seller-payment'||kind==='message'||kind==='payout'||kind==='low-stock'||kind==='subscription'?'<p style="font-size:14px;font-weight:700;color:#081e57;margin:6px 0 10px">Hello '+escapeEmailHtml(String(details?.Shop||details?.Seller||brand||'there'))+',</p>':'')+detailsBlock+products+extra+cta+'</td></tr>';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title></head><body style="margin:0;padding:0;background:#edf3ff;font-family:Arial,Helvetica,sans-serif;color:#111b35"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">'+preheader+'</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf3ff;padding:22px 8px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #dce6f7;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(13,48,108,.08)">'+(kind==='password'?'':header)+hero+body+social+footer+adminFooter+'</table><p style="font-size:10px;color:#8190aa;text-align:center;margin:12px 0">Please do not share passwords, PINs or one-time security codes.</p></td></tr></table></body></html>';
 const text=[heading,intro,...Object.entries(details||{}).map(([k,v])=>k+': '+v),...items.map(item=>item.name+' × '+item.quantity+' — '+item.lineTotal),buttonUrl?((options.buttonLabel||'View details')+': '+buttonUrl):'',platform?'DASMARKET · Shop Smart. Live Better.':'Powered by DASMARKET'].filter(Boolean).join('\n\n');
 return {html,text};
}
export function platformBrandedEmail(heading:string,intro:string,details:Record<string,string>={},options:EmailTemplateOptions={}){return emailShell('DASMARKET',heading,intro,details,{...options,supportEmail:options.supportEmail||'support@dasnet.co.ke'},true);}
export function shopBrandedEmail(shopName:string,heading:string,intro:string,details:Record<string,string>={},options:EmailTemplateOptions={}){return emailShell(shopName,heading,intro,details,options,false);}
export function brandedEmail(brandName:string,heading:string,intro:string,details:Record<string,string>={},options:EmailTemplateOptions={}){
 return String(brandName||'').trim().toLowerCase()==='dasmarket'
  ?platformBrandedEmail(heading,intro,details,options)
  :shopBrandedEmail(brandName||'Your shop',heading,intro,details,options);
}
