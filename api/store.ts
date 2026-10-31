import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(k:string)=>(process.env[k]||'').trim();
const send=(res:any,s:number,b:unknown)=>res.status(s).json(b);
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
function token(req:any){const c=String(req.headers.cookie||'').split(';').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('das_session='));try{return c?decodeURIComponent(c.slice(12)):''}catch{return ''}}
async function seller(sql:any,req:any){
 const t=token(req);if(!t)return null;
 const rows=await sql`SELECT u.id AS user_id,m.tenant_id,t.slug,t.name AS shop_name,m.role,si.description AS shop_description FROM public.auth_sessions ss JOIN public.users u ON u.id=ss.user_id JOIN public.memberships m ON m.user_id=u.id JOIN public.tenants t ON t.id=m.tenant_id LEFT JOIN public.sites si ON si.tenant_id=t.id WHERE ss.token_hash=${hash(t)} AND ss.expires_at>now() AND t.status IN ('trial','active') ORDER BY m.created_at LIMIT 1`;
 return rows[0]||null;
}
async function audit(sql:any,tenantId:string,actorId:string,action:string,type:string,id:string|null,metadata:any={}){await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${tenantId},${actorId},${action},${type},${id},${JSON.stringify(metadata)}::jsonb)`}
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
function normalizePhone(value:any){
 let p=String(value||'').trim().replace(/[\s().-]/g,'');
 if(/^0[17]\d{8}$/.test(p))p='+254'+p.slice(1);
 else if(/^254[17]\d{8}$/.test(p))p='+'+p;
 return /^\+254[17]\d{8}$/.test(p)?p:'';
}
function decryptBundle(blob:any,key:string,kind:'seller'|'platform') {
 const raw=/^[0-9a-f]{64}$/i.test(key)?Buffer.from(key,'hex'):Buffer.from(key,'base64');
 if(raw.length!==32)throw Error('Credential encryption key is invalid.');
 const iv=Buffer.from(blob.iv||'','base64'),tag=Buffer.from(blob.tag||'','base64'),data=Buffer.from(kind==='seller'?(blob.ciphertext||''):(blob.data||''),'base64');
 const d=crypto.createDecipheriv('aes-256-gcm',raw,iv);d.setAuthTag(tag);
 return JSON.parse(Buffer.concat([d.update(data),d.final()]).toString('utf8'));
}
async function darajaToken(c:any){
 const host=c.environment==='sandbox'?'https://sandbox.safaricom.co.ke':'https://api.safaricom.co.ke';
 const auth=Buffer.from(c.consumerKey+':'+c.consumerSecret).toString('base64');
 const r=await fetch(host+'/oauth/v1/generate?grant_type=client_credentials',{headers:{Authorization:'Basic '+auth}});
 const d:any=await r.json();if(!r.ok||!d.access_token)throw Error('Daraja authentication failed. Check the selected credentials and environment.');
 return {host,accessToken:d.access_token};
}
function darajaPassword(shortcode:string,passkey:string,stamp:string){return Buffer.from(shortcode+passkey+stamp).toString('base64')}
function timestamp(){const d=new Date();return d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0')+String(d.getUTCHours()).padStart(2,'0')+String(d.getUTCMinutes()).padStart(2,'0')+String(d.getUTCSeconds()).padStart(2,'0')}
async function startStk(c:any,order:any,phone:string,amount:number,reference:string,callbackUrl:string){
 const {host,accessToken}=await darajaToken(c),stamp=timestamp(),shortcode=String(c.shortcode),type=c.accountType;
 const payload:any={BusinessShortCode:shortcode,Password:darajaPassword(shortcode,c.passkey,stamp),Timestamp:stamp,TransactionType:type,Amount:Math.max(1,Math.round(amount)),PartyA:phone.replace('+',''),PartyB:String(c.partyB||shortcode),PhoneNumber:phone.replace('+',''),CallBackURL:callbackUrl,AccountReference:String(reference).slice(0,12),TransactionDesc:'Order '+order.order_number};
 const r=await fetch(host+'/mpesa/stkpush/v1/processrequest',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const d:any=await r.json();if(!r.ok||!d.CheckoutRequestID||String(d.ResponseCode)!=='0')throw Error(d.errorMessage||d.ResponseDescription||'Safaricom did not accept the STK request.');
 return {checkoutId:d.CheckoutRequestID,merchantRequestId:d.MerchantRequestID,response:d};
}
async function verifyStk(c:any,checkoutId:string){
 const {host,accessToken}=await darajaToken(c),stamp=timestamp(),shortcode=String(c.shortcode);
 const payload={BusinessShortCode:shortcode,Password:darajaPassword(shortcode,c.passkey,stamp),Timestamp:stamp,CheckoutRequestID:checkoutId};
 const r=await fetch(host+'/mpesa/stkpushquery/v1/query',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const d:any=await r.json();if(!r.ok)throw Error('Safaricom payment verification query failed.');
 return d;
}
function productOut(p:any){return {id:p.id,name:p.name,description:p.description,images:Array.isArray(p.images)?p.images:[],imageUrl:Array.isArray(p.images)?(p.images[0]||''):'',category:p.product_type==='data_bundle'?'Data bundles':p.product_type==='digital'?'Digital products':'Shop products',type:p.product_type,price:Number(p.price_minor)/100,currency:p.currency,stockQuantity:p.stock_quantity,active:p.is_active,sku:p.sku||''};}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return send(res,405,{error:'Method not allowed'});}
 let action='';
 try{
  const sql=db();action=String(req.query?.action||req.body?.action||'');
  if(req.method==='GET'&&action==='storefront'){
   const slug=String(req.query?.slug||'').toLowerCase();
   const rows=await sql`SELECT t.id AS tenant_id,t.name AS shop_name,t.slug,s.description,s.logo_url FROM public.tenants t LEFT JOIN public.sites s ON s.tenant_id=t.id WHERE t.slug=${slug} AND t.status IN ('trial','active') LIMIT 1`;
   if(!rows.length)return send(res,404,{error:'Shop not found'});
   const ps=await sql`SELECT id,name,description,product_type,price_minor,currency,stock_quantity,is_active,images FROM public.products WHERE tenant_id=${rows[0].tenant_id} AND is_active=true ORDER BY created_at DESC`;
   return send(res,200,{shop:{name:rows[0].shop_name,slug:rows[0].slug,description:rows[0].description||'',logoUrl:rows[0].logo_url||''},products:ps.map(productOut)});
  }
  if(req.method==='POST'&&action==='daraja-callback'){
   const cb=req.body?.Body?.stkCallback||{},checkout=String(cb.CheckoutRequestID||''),resultCode=Number(cb.ResultCode);
   if(!checkout)return send(res,200,{ResultCode:0,ResultDesc:'Accepted'});
   const rows=await sql`SELECT p.id,p.tenant_id,p.order_id,p.phone,p.amount_minor,p.status,pc.shortcode,pc.party_b,pc.account_type,pc.environment,pc.encrypted_credentials,pc.payout_method,pc.account_reference,pc.till_party_b,pc.paybill_party_b,pc.default_payout_method,pp.shortcode AS central_shortcode,pp.party_b AS central_party_b,pp.account_type AS central_type,pp.environment AS central_environment,pp.encrypted_credentials AS central_credentials FROM public.payments p LEFT JOIN public.payment_configs pc ON pc.tenant_id=p.tenant_id LEFT JOIN public.platform_payment_config pp ON pp.id=1 WHERE p.provider_checkout_id=${checkout} LIMIT 1`;
   if(!rows.length)return send(res,200,{ResultCode:0,ResultDesc:'Accepted'});
   const p=rows[0];if(p.status==='succeeded')return send(res,200,{ResultCode:0,ResultDesc:'Already processed'});
   const key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');let c:any=null;
   try{
    const method=(p.default_payout_method||p.payout_method||'till')==='paybill'?'paybill':'till';
    if(p.encrypted_credentials?.ciphertext){const bundle=decryptBundle(p.encrypted_credentials,key,'seller'),sec=bundle.credentialsByType?.[method]||{...bundle,shortcode:p.shortcode,environment:p.environment};c={...sec,partyB:method==='paybill'?(p.paybill_party_b||p.party_b):(p.till_party_b||p.party_b),accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};}
    else if(p.central_credentials?.data){const sec=decryptBundle(p.central_credentials,key,'platform');c={...sec,shortcode:p.central_shortcode,environment:p.central_environment,partyB:method==='paybill'?(p.paybill_party_b||p.party_b||p.central_party_b):(p.till_party_b||p.party_b||p.central_party_b),accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};}
    if(!c)throw Error('No payment credentials available');
    if(resultCode!==0){
     await sql`UPDATE public.payments SET status='failed',provider_result=${JSON.stringify(cb)}::jsonb,updated_at=now() WHERE id=${p.id} AND status IN ('initiated','pending')`;
     return send(res,200,{ResultCode:0,ResultDesc:'Payment failure recorded'});
    }
    const checked=await verifyStk(c,checkout);
    if(Number(checked.ResultCode)!==0||!checked.ResultCode&&checked.ResultCode!==0)throw Error('Provider has not confirmed successful payment.');
    const meta=cb.CallbackMetadata?.Item||[],val=(n:string)=>meta.find((x:any)=>x.Name===n)?.Value;
    const amount=Number(val('Amount')??checked.Amount),receipt=String(val('MpesaReceiptNumber')??checked.MpesaReceiptNumber??''),phone=String(val('PhoneNumber')??checked.PhoneNumber??'');
    if(!receipt||Math.round(amount*100)!==Number(p.amount_minor)||phone.replace(/^\+/, '')!==String(p.phone).replace(/^\+/,''))throw Error('Callback details do not match the pending order.');
    await sql`UPDATE public.payments SET status='succeeded',provider_receipt=${receipt},provider_result=${JSON.stringify({callback:cb,query:checked})}::jsonb,verified_at=now(),updated_at=now() WHERE id=${p.id} AND status IN ('initiated','pending')`;
    await sql`UPDATE public.orders SET status='confirmed',updated_at=now() WHERE id=${p.order_id} AND status='pending'`;
    await sql`UPDATE public.payment_configs SET callback_verified_at=now() WHERE tenant_id=${p.tenant_id}`;
   }catch(err:any){console.error('Daraja callback verification failed',err?.message||err);}
   return send(res,200,{ResultCode:0,ResultDesc:'Accepted'});
  }
  const me=await seller(sql,req);
  if(!me && action!=='order')return send(res,401,{error:'Please sign in to access your seller workspace.'});
  if(req.method==='POST'&&action==='order'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase(),name=String(b.customerName||'').trim().slice(0,120),phone=normalizePhone(b.customerPhone),items=Array.isArray(b.items)?b.items:[],idempotency=String(b.idempotencyKey||'').slice(0,100);
   const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   if(!name||!phone||!items.length||items.length>30)return send(res,400,{error:'Enter your name, valid phone number and at least one item.'});
   const tenantId=shops[0].id,ids=items.map((x:any)=>String(x.id||'')).filter(Boolean);
   const ps=await sql`SELECT id,name,price_minor,stock_quantity FROM public.products WHERE tenant_id=${tenantId} AND is_active=true AND id=ANY(${ids}::uuid[])`;
   if(ps.length!==new Set(ids).size)return send(res,400,{error:'One or more products are no longer available.'});
   let total=0;const lines=ps.map((p:any)=>{const qty=Math.max(1,Math.min(99,Math.floor(Number(items.find((x:any)=>x.id===p.id)?.quantity)||1)));if(p.stock_quantity!==null&&p.stock_quantity<qty)throw Error('OUT_OF_STOCK');const line=Number(p.price_minor)*qty;total+=line;return {p,qty,line};});
   if(total<=0)return send(res,400,{error:'Order total must be greater than zero.'});
   const configs=await sql`SELECT pc.*,pp.shortcode AS central_shortcode,pp.party_b AS central_party_b,pp.account_type AS central_type,pp.environment AS central_environment,pp.encrypted_credentials AS central_credentials FROM public.tenants t LEFT JOIN public.payment_configs pc ON pc.tenant_id=t.id LEFT JOIN public.platform_payment_config pp ON pp.id=1 WHERE t.id=${tenantId} LIMIT 1`;
   const cfg=configs[0]||{},key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');let payment:any=null;
   try{
    const method=(cfg.default_payout_method||cfg.payout_method||'till')==='paybill'?'paybill':'till';
    if(cfg.encrypted_credentials?.ciphertext){
     const bundle=decryptBundle(cfg.encrypted_credentials,key,'seller'),sec=bundle.credentialsByType?.[method]||{...bundle,shortcode:cfg.shortcode,environment:cfg.environment};
     payment={...sec,partyB:method==='paybill'?(cfg.paybill_party_b||cfg.party_b):(cfg.till_party_b||cfg.party_b),accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};
    }else if(cfg.central_credentials?.data){
     const sec=decryptBundle(cfg.central_credentials,key,'platform');
     payment={...sec,shortcode:cfg.central_shortcode,partyB:method==='paybill'?(cfg.paybill_party_b||cfg.party_b||cfg.central_party_b):(cfg.till_party_b||cfg.party_b||cfg.central_party_b),environment:cfg.central_environment,accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};
    }
   }catch(e:any){console.error('Daraja credential load failed',e?.message||e);return send(res,503,{error:'Payment credentials could not be loaded securely. Contact the shop owner.'});}
   if(!payment?.consumerKey||!payment?.consumerSecret||!payment?.passkey||!payment?.shortcode||!payment?.partyB)return send(res,503,{error:'This shop has not completed M-PESA payment setup yet.'});
   if(payment.environment!=='production')return send(res,503,{error:'This shop is configured for Daraja sandbox. Live checkout is disabled.'});
   const orderNo='DAS-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();
   const o=await sql`INSERT INTO public.orders(tenant_id,order_number,customer_name,customer_phone,subtotal_minor,total_minor,status) VALUES(${tenantId},${orderNo},${name},${phone},${total},${total},'pending') RETURNING id,order_number`;
   for(const l of lines){await sql`INSERT INTO public.order_items(tenant_id,order_id,product_id,product_name,quantity,unit_price_minor,line_total_minor) VALUES(${tenantId},${o[0].id},${l.p.id},${l.p.name},${l.qty},${Number(l.p.price_minor)},${l.line})`;}
   const idem=idempotency||crypto.randomUUID();
   const p=await sql`INSERT INTO public.payments(tenant_id,order_id,provider,phone,amount_minor,currency,status,idempotency_key,provider_result) VALUES(${tenantId},${o[0].id},'mpesa_daraja',${phone},${total},'KES','initiated',${idem},'{}'::jsonb) RETURNING id`;
   try{
    const callbackBase=env('DASNET_PUBLIC_URL')||('https://'+(env('VERCEL_URL')||'dass-gamma.vercel.app'));
    const callbackUrl=callbackBase.replace(/\/$/,'')+'/api/store?action=daraja-callback';
    const stk=await startStk(payment,o[0],phone,total/100,payment.accountType==='CustomerPayBillOnline'?(cfg.account_reference||''):orderNo.slice(-12),callbackUrl);
    await sql`UPDATE public.payments SET provider_checkout_id=${stk.checkoutId},status='pending',provider_result=${JSON.stringify({merchantRequestId:stk.merchantRequestId,response:stk.response})}::jsonb,updated_at=now() WHERE id=${p[0].id}`;
    return send(res,201,{ok:true,orderNumber:o[0].order_number,paymentStatus:'pending',checkoutRequestId:stk.checkoutId,message:'M-PESA prompt sent. Enter your PIN on your phone to complete payment.'});
   }catch(e:any){
    await sql`UPDATE public.payments SET status='failed',provider_result=${JSON.stringify({error:String(e?.message||'STK request failed')})}::jsonb,updated_at=now() WHERE id=${p[0].id}`;
    console.error('Daraja STK initiation failed',e?.message||e);
    return send(res,502,{error:e?.message||'Could not start M-PESA payment. No payment was confirmed.'});
   }
  }
  if(!me)return send(res,401,{error:'Sign in to manage your shop.'});

  if(req.method==='GET'&&action==='payment-settings'){
   const rows=await sql`SELECT payout_method,party_b,account_reference,shortcode,account_type,environment,encrypted_credentials,till_party_b,paybill_party_b,default_payout_method FROM public.payment_configs WHERE tenant_id=${me.tenant_id} LIMIT 1`;
   const c=rows[0]||{};
   let credentialFlags:any={consumerKey:false,consumerSecret:false,passkey:false};
   if(c.encrypted_credentials&&c.encrypted_credentials.ciphertext)credentialFlags={consumerKey:true,consumerSecret:true,passkey:true};
   return send(res,200,{payoutMethod:c.payout_method||'till',partyB:c.party_b||'',accountReference:c.account_reference||'',tillPartyB:c.till_party_b||((c.payout_method||'till')==='till'?c.party_b||'':''),paybillPartyB:c.paybill_party_b||((c.payout_method||'till')==='paybill'?c.party_b||'':''),defaultPayoutMethod:c.default_payout_method||c.payout_method||'till',shortcode:c.shortcode||'',accountType:c.account_type||null,environment:c.environment||'production',credentialsConfigured:credentialFlags});
  }
  if(req.method==='POST'&&action==='payout-settings'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can update payout settings.'});
   const b=req.body||{},till=String(b.tillPartyB||'').replace(/\s/g,'').slice(0,20),paybill=String(b.paybillPartyB||'').replace(/\s/g,'').slice(0,20),account=String(b.accountReference||'').trim().slice(0,32),method=b.defaultPayoutMethod==='paybill'?'paybill':'till';
   if(till&&!/^\d{5,12}$/.test(till))return send(res,400,{error:'Enter a valid Till number (5–12 digits).'});
   if(paybill&&!/^\d{5,12}$/.test(paybill))return send(res,400,{error:'Enter a valid PayBill number (5–12 digits).'});
   if(!till&&!paybill)return send(res,400,{error:'Enter at least one Till or PayBill destination.'});
   if(paybill&&!/^[A-Za-z0-9-]{1,32}$/.test(account))return send(res,400,{error:'Enter the account number/reference required by the PayBill.'});
   if(method==='till'&&!till)return send(res,400,{error:'Add a Till number or choose PayBill as the default.'});
   if(method==='paybill'&&!paybill)return send(res,400,{error:'Add a PayBill number or choose Till as the default.'});
   const partyB=method==='paybill'?paybill:till,type=method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline';
   await sql`INSERT INTO public.payment_configs(tenant_id,provider,environment,party_b,account_reference,payout_method,account_type,till_party_b,paybill_party_b,default_payout_method,is_enabled) VALUES(${me.tenant_id},'mpesa_daraja','production',${partyB},${paybill?account:null},${method},${type},${till||null},${paybill||null},${method},true) ON CONFLICT(tenant_id) DO UPDATE SET party_b=EXCLUDED.party_b,account_reference=EXCLUDED.account_reference,payout_method=EXCLUDED.payout_method,account_type=EXCLUDED.account_type,till_party_b=COALESCE(EXCLUDED.till_party_b,payment_configs.till_party_b),paybill_party_b=COALESCE(EXCLUDED.paybill_party_b,payment_configs.paybill_party_b),default_payout_method=EXCLUDED.default_payout_method,updated_at=now()`;
   await audit(sql,me.tenant_id,me.user_id,'payout.destination.updated','payment_config',me.tenant_id,{defaultMethod:method,tillConfigured:!!till,paybillConfigured:!!paybill});
   return send(res,200,{ok:true,defaultPayoutMethod:method,accountType:type});
  }
  if(req.method==='GET'&&action==='api-credentials'){
   const rows=await sql`SELECT encrypted_credentials,shortcode,environment,account_type FROM public.payment_configs WHERE tenant_id=${me.tenant_id} LIMIT 1`;
   const row=rows[0]||{};let bundle:any={};
   if(row.encrypted_credentials?.ciphertext){try{bundle=decryptBundle(row.encrypted_credentials,env('DASNET_CREDENTIALS_ENCRYPTION_KEY'),'seller')}catch(e:any){console.error('Daraja metadata decrypt failed',e?.message||e);}}
   const saved=bundle.credentialsByType||{};
   const legacyKey=row.account_type==='CustomerPayBillOnline'?'paybill':'till';
   const legacy=!bundle.credentialsByType&&bundle.consumerKey?{[legacyKey]:{...bundle,shortcode:row.shortcode,environment:row.environment}}:{};
   const sets={...legacy,...saved};
   return send(res,200,{credentialsByType:{till:{configured:!!(sets.till?.consumerKey&&sets.till?.consumerSecret&&sets.till?.passkey),shortcode:sets.till?.shortcode||'',environment:sets.till?.environment||'production'},paybill:{configured:!!(sets.paybill?.consumerKey&&sets.paybill?.consumerSecret&&sets.paybill?.passkey),shortcode:sets.paybill?.shortcode||'',environment:sets.paybill?.environment||'production'}}});
  }
  if(req.method==='POST'&&action==='api-credentials'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can update API credentials.'});
   const b=req.body||{},type=b.accountType==='CustomerPayBillOnline'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline',shortcode=String(b.shortcode||'').trim().slice(0,20),environment=b.environment==='sandbox'?'sandbox':'production';
   const key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
   if(!key)return send(res,503,{error:'Secure credential storage is not configured. Contact DASNET support.'});
   const raw=Buffer.from(key,'base64');if(raw.length!==32)return send(res,503,{error:'Credential encryption configuration is invalid.'});
   const current=await sql`SELECT encrypted_credentials,account_type,shortcode,environment FROM public.payment_configs WHERE tenant_id=${me.tenant_id} LIMIT 1`;
   let stored:any={credentialsByType:{}};
   if(current[0]?.encrypted_credentials?.ciphertext){
    try{const old=current[0].encrypted_credentials,dec=crypto.createDecipheriv('aes-256-gcm',raw,Buffer.from(old.iv,'base64'));dec.setAuthTag(Buffer.from(old.tag,'base64'));const prior=JSON.parse(Buffer.concat([dec.update(Buffer.from(old.ciphertext,'base64')),dec.final()]).toString('utf8'));if(prior.credentialsByType)stored=prior;else{const oldKey=current[0].account_type==='CustomerPayBillOnline'?'paybill':'till';stored.credentialsByType[oldKey]={...prior,shortcode:current[0].shortcode,environment:current[0].environment||'production'};}}catch{return send(res,500,{error:'Saved credentials could not be decrypted. Contact support before replacing them.'});}
   }
   const method=type==='CustomerPayBillOnline'?'paybill':'till',previous=stored.credentialsByType[method]||{};
   const config:any={...previous,shortcode,environment};
   for(const field of ['consumerKey','consumerSecret','passkey'])if(typeof b[field]==='string'&&b[field].trim())config[field]=b[field].trim();
   if(!config.shortcode||!config.consumerKey||!config.consumerSecret||!config.passkey)return send(res,400,{error:'Enter shortcode, consumer key, consumer secret and passkey for this transaction type. Blank secret fields preserve that type’s saved values.'});
   stored.credentialsByType[method]=config;
   const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',raw,iv),encrypted=Buffer.concat([cipher.update(JSON.stringify(stored),'utf8'),cipher.final()]);
   const bundle={iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')};
   await sql`INSERT INTO public.payment_configs(tenant_id,provider,environment,shortcode,account_type,encrypted_credentials,is_enabled) VALUES(${me.tenant_id},'mpesa_daraja',${environment},${shortcode},${type},${JSON.stringify(bundle)}::jsonb,true) ON CONFLICT(tenant_id) DO UPDATE SET environment=EXCLUDED.environment,shortcode=EXCLUDED.shortcode,account_type=EXCLUDED.account_type,encrypted_credentials=EXCLUDED.encrypted_credentials,is_enabled=true,updated_at=now()`;
   await audit(sql,me.tenant_id,me.user_id,'daraja.credentials.updated','payment_config',me.tenant_id,{accountType:type,environment,shortcode,credentialsEncrypted:true});
   return send(res,200,{ok:true,accountType:type,environment,credentialsConfigured:true});
  }
  if(req.method==='GET'&&action==='transactions'){
   const rows=await sql`SELECT p.id,p.order_id,p.provider,p.provider_checkout_id,p.provider_receipt,p.phone,p.amount_minor,p.currency,p.status,p.created_at,p.verified_at,o.order_number FROM public.payments p LEFT JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id WHERE p.tenant_id=${me.tenant_id} ORDER BY p.created_at DESC LIMIT 200`;
   return send(res,200,{transactions:rows.map((p:any)=>({...p,amount:Number(p.amount_minor)/100}))});
  }
  if(req.method==='GET'&&action==='tickets'){
   const rows=await sql`SELECT id,ticket_number,subject,category,priority,status,message,response,created_at,updated_at FROM public.support_tickets WHERE tenant_id=${me.tenant_id} ORDER BY created_at DESC LIMIT 100`;
   return send(res,200,{tickets:rows});
  }
  if(req.method==='POST'&&action==='ticket'){
   const b=req.body||{},subject=String(b.subject||'').trim().slice(0,140),message=String(b.message||'').trim().slice(0,4000),category=String(b.category||'general').slice(0,40);
   if(subject.length<4||message.length<10)return send(res,400,{error:'Enter a subject and at least 10 characters describing the issue.'});
   const count=await sql`SELECT count(*)::int AS n FROM public.support_tickets WHERE tenant_id=${me.tenant_id} AND created_at>now()-interval '1 hour'`;
   if(Number(count[0]?.n||0)>=10)return send(res,429,{error:'Ticket limit reached. Please try again later.'});
   const ticket='DS-'+Date.now().toString(36).toUpperCase();
   const row=await sql`INSERT INTO public.support_tickets(tenant_id,user_id,ticket_number,subject,category,priority,message) VALUES(${me.tenant_id},${me.user_id},${ticket},${subject},${category},'normal',${message}) RETURNING id,ticket_number,subject,status,created_at`;
   await audit(sql,me.tenant_id,me.user_id,'support.ticket.created','ticket',row[0].id,{ticketNumber:ticket,category});
   return send(res,201,{ticket:row[0]});
  }
  if(req.method==='GET'&&action==='profile'){
   const rows=await sql`SELECT display_name,email,phone,avatar_url FROM public.users WHERE id=${me.user_id} LIMIT 1`;
   return send(res,200,{profile:{displayName:rows[0]?.display_name||'',email:rows[0]?.email||'',phone:rows[0]?.phone||'',avatarUrl:rows[0]?.avatar_url||''}});
  }
  if(req.method==='POST'&&action==='profile'){
   const b=req.body||{},name=String(b.displayName||'').trim().slice(0,100),email=String(b.email||'').trim().toLowerCase().slice(0,254),avatar=String(b.avatarUrl||'').trim();
   if(name.length<2)return send(res,400,{error:'Enter your full name.'});
   if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send(res,400,{error:'Enter a valid email address.'});
   if(avatar&&avatar.length>1500000)return send(res,400,{error:'Profile image is too large. Choose an image under 1 MB.'});
   if(avatar&&!/^https:\/\//.test(avatar)&&!/^data:image\/(png|jpeg|webp);base64,/.test(avatar))return send(res,400,{error:'Use a PNG, JPEG or WebP profile image.'});
   await sql`UPDATE public.users SET display_name=${name},email=${email||null},avatar_url=${avatar||null},updated_at=now() WHERE id=${me.user_id}`;
   await audit(sql,me.tenant_id,me.user_id,'profile.updated','user',me.user_id,{name,email:email||null,avatarUpdated:!!avatar});
   return send(res,200,{ok:true});
  }

  if(req.method==='POST'&&action==='settings'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can change settings.'});
   const name=String(req.body?.name||'').trim().slice(0,100),description=String(req.body?.description||'').trim().slice(0,1000),logo=String(req.body?.logoUrl||'').trim();
   if(!name)return send(res,400,{error:'Shop name is required.'});\n   if(logo.length>1500000)return send(res,400,{error:'Store logo is too large.'});\n   if(logo&&!/^https:\/\//.test(logo)&&!/^data:image\/(png|jpeg|webp);base64,/.test(logo))return send(res,400,{error:'Use a PNG, JPEG or WebP store logo.'});
   await sql`UPDATE public.tenants SET name=${name},updated_at=now() WHERE id=${me.tenant_id}`;
   await sql`UPDATE public.sites SET title=${name},description=${description},logo_url=${logo||null},updated_at=now() WHERE tenant_id=${me.tenant_id}`;
   await audit(sql,me.tenant_id,me.user_id,'shop.settings.updated','shop',me.tenant_id,{name});
   return send(res,200,{ok:true});
  }
  if(req.method==='GET'&&action==='products'){
   const ps=await sql`SELECT id,name,description,product_type,price_minor,currency,stock_quantity,is_active,sku,images FROM public.products WHERE tenant_id=${me.tenant_id} ORDER BY created_at DESC`;
   const site=await sql`SELECT logo_url FROM public.sites WHERE tenant_id=${me.tenant_id} LIMIT 1`;\n   return send(res,200,{shop:{name:me.shop_name,slug:me.slug,description:me.shop_description||'',logoUrl:site[0]?.logo_url||''},products:ps.map(productOut)});
  }
  if(req.method==='GET'&&action==='orders'){
   const os=await sql`SELECT o.id,o.order_number,o.customer_name,o.customer_phone,o.total_minor,o.currency,o.status,o.created_at,COALESCE(json_agg(json_build_object('name',i.product_name,'quantity',i.quantity,'lineTotal',i.line_total_minor)) FILTER (WHERE i.id IS NOT NULL),'[]'::json) AS items FROM public.orders o LEFT JOIN public.order_items i ON i.tenant_id=o.tenant_id AND i.order_id=o.id WHERE o.tenant_id=${me.tenant_id} GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`;
   return send(res,200,{orders:os.map((o:any)=>({...o,total:Number(o.total_minor)/100,items:o.items}))});
  }
  if(req.method==='POST'&&action==='product'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to edit products.'});
   const b=req.body||{},name=String(b.name||'').trim().slice(0,120),description=String(b.description||'').trim().slice(0,2000),type=['physical','data_bundle','digital'].includes(b.type)?b.type:'physical',price=Number(b.price),stock=b.stock===''||b.stock==null?null:Number(b.stock),sku=String(b.sku||'').trim().slice(0,80)||null;
   if(!name||!Number.isFinite(price)||price<0||price>100000000|| (stock!==null&&(!Number.isInteger(stock)||stock<0)))return send(res,400,{error:'Enter a product name, valid KES price and valid stock quantity.'});
   const images=Array.isArray(b.images)?b.images.filter((x:any)=>typeof x==='string'&&x.length<=1600000).slice(0,5):[];
   if(images.some((x:string)=>!/^https:\/\//.test(x)&&!/^data:image\/(png|jpeg|webp);base64,/.test(x)))return send(res,400,{error:'Product images must be HTTPS URLs or PNG, JPEG or WebP image files.'});
   const id=String(b.id||'');
   if(id){
    const updated=await sql`UPDATE public.products SET name=${name},slug=${slugify(name)+'-'+id.slice(0,8)},description=${description},product_type=${type},price_minor=${Math.round(price*100)},stock_quantity=${stock},sku=${sku},images=${JSON.stringify(images)}::jsonb,updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
    if(!updated.length)return send(res,404,{error:'Product not found.'});
    await audit(sql,me.tenant_id,me.user_id,'product.updated','product',id,{name,type,price});
    return send(res,200,{ok:true});
   }
   const inserted=await sql`INSERT INTO public.products(tenant_id,name,slug,description,product_type,price_minor,stock_quantity,sku,images) VALUES(${me.tenant_id},${name},${slugify(name)+'-'+crypto.randomBytes(4).toString('hex')},${description},${type},${Math.round(price*100)},${stock},${sku},${JSON.stringify(images)}::jsonb) RETURNING id`;
   await audit(sql,me.tenant_id,me.user_id,'product.created','product',inserted[0].id,{name,type,price});
   return send(res,201,{ok:true});
  }
  if(req.method==='POST'&&action==='product-status'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission.'});
   const id=String(req.body?.id||''),active=!!req.body?.active;
   const r=await sql`UPDATE public.products SET is_active=${active},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   if(r.length)await audit(sql,me.tenant_id,me.user_id,active?'product.published':'product.hidden','product',id,{active});
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Product not found.'});
  }
  if(req.method==='DELETE'&&action==='product'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only an owner or admin can delete products.'});
   const id=String(req.query?.id||'');
   const r=await sql`DELETE FROM public.products WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   if(r.length)await audit(sql,me.tenant_id,me.user_id,'product.deleted','product',id);
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Product not found.'});
  }
  if(req.method==='POST'&&action==='order-status'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission.'});
   const id=String(req.body?.id||''),status=String(req.body?.status||'');
   if(!['confirmed','processing','fulfilled','cancelled'].includes(status))return send(res,400,{error:'Invalid order status.'});
   const r=await sql`UPDATE public.orders SET status=${status},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   if(r.length)await audit(sql,me.tenant_id,me.user_id,'order.status.updated','order',id,{status});
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Order not found.'});
  }
  if(req.method==='POST'&&action==='order'){
   const b=req.body||{},name=String(b.customerName||'').trim().slice(0,120),phone=String(b.customerPhone||'').replace(/[^0-9+]/g,'').slice(0,20),items=Array.isArray(b.items)?b.items:[];
   if(!name||!phone||!items.length||items.length>30)return send(res,400,{error:'Enter your name, valid phone number and at least one item.'});
   const ids=items.map((x:any)=>String(x.id||'')).filter(Boolean);
   const ps=await sql`SELECT id,name,price_minor,stock_quantity FROM public.products WHERE tenant_id=${me.tenant_id} AND is_active=true AND id=ANY(${ids}::uuid[])`;
   if(ps.length!==new Set(ids).size)return send(res,400,{error:'One or more products are no longer available.'});
   let total=0;const lines=ps.map((p:any)=>{const qty=Math.max(1,Math.min(99,Math.floor(Number(items.find((x:any)=>x.id===p.id)?.quantity)||1)));if(p.stock_quantity!==null&&p.stock_quantity<qty)throw Error('OUT_OF_STOCK');const line=Number(p.price_minor)*qty;total+=line;return {p,qty,line};});
   if(total<=0)return send(res,400,{error:'Order total must be greater than zero.'});
   const orderNo='DAS-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();
   const o=await sql`INSERT INTO public.orders(tenant_id,order_number,customer_name,customer_phone,subtotal_minor,total_minor,status) VALUES(${me.tenant_id},${orderNo},${name},${phone},${total},${total},'pending') RETURNING id,order_number`;
   for(const l of lines){await sql`INSERT INTO public.order_items(tenant_id,order_id,product_id,product_name,quantity,unit_price_minor,line_total_minor) VALUES(${me.tenant_id},${o[0].id},${l.p.id},${l.p.name},${l.qty},${Number(l.p.price_minor)},${l.line})`;}
   return send(res,201,{ok:true,orderNumber:o[0].order_number,message:'Order received. Payment is not enabled yet.'});
  }
  return send(res,404,{error:'Unknown store action.'});
 }catch(e:any){if(e?.message==='DB_CONFIG')return send(res,503,{error:'Database connection is not configured.'});if(e?.message==='OUT_OF_STOCK')return send(res,409,{error:'Insufficient stock for one or more items.'});const reference=crypto.randomUUID();console.error('DAS store API error',{reference,action:action||'unresolved',error:e?.message||String(e),code:e?.code,detail:e?.detail});return send(res,500,{error:'Store operation failed. Share reference '+reference+' with DASNET support.',reference});}
}