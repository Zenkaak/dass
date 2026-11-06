import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(k:string)=>(process.env[k]||'').trim();
const send=(res:any,s:number,b:unknown)=>res.status(s).json(b);
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
function token(req:any){const c=String(req.headers.cookie||'').split(';').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('das_session='));try{return c?decodeURIComponent(c.slice(12)):''}catch{return ''}}
async function buyerSession(sql:any,req:any,tenantId:string){
 // Expire customer moderation only within the tenant whose buyer session is being checked.
 await sql`UPDATE public.store_customers SET is_banned=false,ban_reason=NULL,banned_until=NULL,updated_at=now() WHERE tenant_id=${tenantId} AND is_banned=true AND banned_until IS NOT NULL AND banned_until<=now()`;
 const global=token(req);
 if(global){
  const rows=await sql`SELECT c.id,c.user_id,c.full_name,c.phone,c.email,c.address FROM public.auth_sessions s JOIN public.store_customers c ON c.user_id=s.user_id AND c.tenant_id=${tenantId} WHERE s.token_hash=${hash(global)} AND s.expires_at>now() AND c.is_banned=false AND (c.banned_until IS NULL OR c.banned_until<=now()) LIMIT 1`;
  return rows[0]||null;
 }
 const raw=String(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('das_buyer_session='));let legacy='';try{legacy=raw?decodeURIComponent(raw.slice('das_buyer_session='.length)):''}catch{}
 if(!legacy)return null;
 const rows=await sql`SELECT c.id,c.user_id,c.full_name,c.phone,c.email,c.address FROM public.store_customer_sessions s JOIN public.store_customers c ON c.id=s.customer_id AND c.tenant_id=s.tenant_id WHERE s.tenant_id=${tenantId} AND s.token_hash=${hash(legacy)} AND s.expires_at>now() AND c.user_id IS NOT NULL AND c.is_banned=false AND (c.banned_until IS NULL OR c.banned_until<=now()) LIMIT 1`;
 return rows[0]||null;
}
async function seller(sql:any,req:any){
 const t=token(req);if(!t)return null;
 const rows=await sql`SELECT u.id AS user_id,m.tenant_id,t.slug,t.name AS shop_name,m.role,si.description AS shop_description FROM public.auth_sessions ss JOIN public.users u ON u.id=ss.user_id JOIN public.memberships m ON m.user_id=u.id JOIN public.tenants t ON t.id=m.tenant_id LEFT JOIN public.sites si ON si.tenant_id=t.id WHERE ss.token_hash=${hash(t)} AND ss.expires_at>now() AND t.status IN ('trial','active') AND (SELECT count(*) FROM public.memberships mx WHERE mx.user_id=u.id)=1 ORDER BY m.created_at LIMIT 1`;
 return rows[0]||null;
}
async function audit(sql:any,tenantId:string,actorId:string,action:string,type:string,id:string|null,metadata:any={}){await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${tenantId},${actorId},${action},${type},${id},${JSON.stringify(metadata)}::jsonb)`}
async function notifyBuyer(sql:any,tenantId:string,buyerPhone:string,orderId:string|null,type:string,title:string,detail:string,complaintId:string|null=null){if(!buyerPhone)return;await sql`INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,complaint_id,notification_type,title,detail) VALUES(${tenantId},${buyerPhone},${orderId},${complaintId},${type},${title},${detail})`;}
async function notifyOrderBuyer(sql:any,tenantId:string,orderId:string,type:string,title:string,detail:string){const rows=await sql`SELECT customer_phone FROM public.orders WHERE id=${orderId} AND tenant_id=${tenantId} LIMIT 1`;if(rows.length)await notifyBuyer(sql,tenantId,rows[0].customer_phone,orderId,type,title,detail);}
async function reconcilePaymentJob(sql:any,jobId:string){
 try{
  const result=await sql`WITH claimed AS (UPDATE public.payment_reconciliation_jobs SET status='completed',attempts=attempts+1,processed_at=now(),updated_at=now(),last_error=NULL WHERE id=${jobId} AND status='pending' RETURNING id,tenant_id,order_id), order_update AS (UPDATE public.orders o SET status='confirmed',updated_at=now() FROM claimed j WHERE o.id=j.order_id AND o.tenant_id=j.tenant_id AND o.status='pending' RETURNING o.id), payment_notice AS (INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,notification_type,title,detail) SELECT j.tenant_id,o.customer_phone,j.order_id,'payment_update','Payment confirmed','Your M-PESA payment was confirmed.' FROM claimed j JOIN public.orders o ON o.id=j.order_id AND o.tenant_id=j.tenant_id WHERE NULLIF(o.customer_phone,'') IS NOT NULL RETURNING id), order_notice AS (INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,notification_type,title,detail) SELECT j.tenant_id,o.customer_phone,j.order_id,'order_update','Order confirmed','Your order has been confirmed by the shop.' FROM claimed j JOIN public.orders o ON o.id=j.order_id AND o.tenant_id=j.tenant_id WHERE NULLIF(o.customer_phone,'') IS NOT NULL RETURNING id), coupon_update AS (UPDATE public.store_coupons c SET used_count=c.used_count+1,updated_at=now() FROM claimed j JOIN public.orders o ON o.id=j.order_id AND o.tenant_id=j.tenant_id WHERE o.coupon_code IS NOT NULL AND c.tenant_id=j.tenant_id AND c.code=o.coupon_code RETURNING c.id), callback_update AS (UPDATE public.payment_configs pc SET callback_verified_at=now() FROM claimed j WHERE pc.tenant_id=j.tenant_id RETURNING pc.tenant_id) SELECT (SELECT COUNT(*) FROM claimed)::integer AS claimed,(SELECT COUNT(*) FROM order_update)::integer AS orders_updated,(SELECT COUNT(*) FROM payment_notice)::integer AS payment_notifications,(SELECT COUNT(*) FROM order_notice)::integer AS order_notifications,(SELECT COUNT(*) FROM coupon_update)::integer AS coupons_updated,(SELECT COUNT(*) FROM callback_update)::integer AS configs_updated`;
  return Number(result[0]?.claimed||0)>0;
 }catch(error:any){
  const message=String(error?.message||'Reconciliation failed').slice(0,1000);
  await sql`UPDATE public.payment_reconciliation_jobs SET attempts=attempts+1,last_error=${message},updated_at=now() WHERE id=${jobId} AND status='pending'`;
  throw error;
 }
}
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

const storageEnv=(k:string)=>(process.env[k]||'').trim();
const fileTypes:any={pdf:{mime:'application/pdf',ext:'pdf'},doc:{mime:'application/msword',ext:'doc'},docx:{mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ext:'docx'},xls:{mime:'application/vnd.ms-excel',ext:'xls'},xlsx:{mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ext:'xlsx'},txt:{mime:'text/plain',ext:'txt'},jpg:{mime:'image/jpeg',ext:'jpg'},jpeg:{mime:'image/jpeg',ext:'jpeg'},png:{mime:'image/png',ext:'png'},webp:{mime:'image/webp',ext:'webp'}};
function awsEncode(s:string){return encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}
function hmac(key:any,value:string,encoding?:any){return crypto.createHmac('sha256',key).update(value).digest(encoding)}
function storageUrl(key:string,method:'PUT'|'GET',mime='application/octet-stream'){
 const endpoint=storageEnv('AWS_ENDPOINT_URL_S3'),access=storageEnv('AWS_ACCESS_KEY_ID'),secret=storageEnv('AWS_SECRET_ACCESS_KEY'),configuredRegion=storageEnv('AWS_REGION'),bucket=storageEnv('NEON_STORAGE_BUCKET')||'documents';
 if(!endpoint||!access||!secret)throw Error('ATTACHMENT_STORAGE_CONFIG');
 const host=new URL(endpoint).host,endpointRegion=host.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/)?.[1],region=endpointRegion||configuredRegion||'us-east-2',now=new Date(),amz=now.toISOString().slice(0,19).replace(/[-:T]/g,'')+'Z',day=amz.slice(0,8),scope=day+'/'+region+'/s3/aws4_request',path='/'+bucket+'/'+key.split('/').map(awsEncode).join('/');
 const params:any={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':access+'/'+scope,'X-Amz-Date':amz,'X-Amz-Expires':'300','X-Amz-SignedHeaders':'host'};
 const canonicalQuery=Object.keys(params).sort().map(k=>awsEncode(k)+'='+awsEncode(params[k])).join('&');
 const canonical=[method,path,canonicalQuery,'host:'+host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const toSign=['AWS4-HMAC-SHA256',amz,scope,crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
 const kDate=hmac('AWS4'+secret,day),kRegion=hmac(kDate,region),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request'),signature=hmac(kSigning,toSign,'hex');
 return endpoint.replace(/\/$/,'')+path+'?'+canonicalQuery+'&X-Amz-Signature='+signature;
}
function safeFileName(s:string){return s.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)||'attachment'}
function validFileSignature(bytes:Buffer,mime:string){
 if(mime==='application/pdf')return bytes.subarray(0,5).toString('ascii')==='%PDF-';
 if(mime==='image/jpeg')return bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 if(mime==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==='image/webp')return bytes.length>=12&&bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(mime==='application/msword'||mime==='application/vnd.ms-excel')return bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]));
 if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'||mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')return bytes.length>=4&&bytes[0]===0x50&&bytes[1]===0x4b;
 if(mime==='text/plain')return !bytes.includes(0);
 return false;
}
async function validateAttachmentObject(objectKey:string,mime:string,expectedSize:number){
 const downloaded=await fetch(storageUrl(objectKey,'GET'));
 if(!downloaded.ok)throw Error('ATTACHMENT_OBJECT_UNAVAILABLE');
 const declaredLength=Number(downloaded.headers.get('content-length')||0);
 if(declaredLength>10485760||(declaredLength>0&&declaredLength!==expectedSize))throw Error('ATTACHMENT_SIZE_MISMATCH');
 const bytes=Buffer.from(await downloaded.arrayBuffer());
 if(bytes.length!==expectedSize||bytes.length<1||bytes.length>10485760)throw Error('ATTACHMENT_SIZE_MISMATCH');
 if(!validFileSignature(bytes,mime))throw Error('ATTACHMENT_CONTENT_MISMATCH');
}
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
function productOut(p:any,includeMetadata=false){
 const raw=Array.isArray(p.images)?p.images:[];
 const images=raw.map((item:any)=>{
  const value=typeof item==='string'?item:String(item?.url||item?.src||item?.publicUrl||item?.public_url||item?.key||item?.path||'');
  if(!value)return '';
  if(value.startsWith('neon-object:'))return storageUrl(value.slice(12),'GET');
  if(value.startsWith('s3://'))return storageUrl(value.slice(5).replace(/^documents\//,''),'GET');
  return value;
 }).filter(Boolean);
 return {id:p.id,name:p.name,description:p.description,images,imageUrl:images[0]||'',category:String(p.metadata?.category||(p.product_type==='data_bundle'?'Data bundles':p.product_type==='digital'?'Digital products':'Shop products')),spotlight:Boolean(p.metadata?.spotlight),testProduct:Boolean(p.metadata?.test_product),type:p.product_type,price:Number(p.price_minor)/100,currency:p.currency,stockQuantity:p.stock_quantity,active:p.is_active,sku:p.sku||'',ratingAverage:Number(p.rating_average||0),ratingCount:Number(p.rating_count||0),...(includeMetadata?{metadata:p.metadata||{}}:{})};
}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return send(res,405,{error:'Method not allowed'});}
 let action='';
 try{
  const sql=db();
  action=String(req.query?.action||req.body?.action||'');
  if(['buyer-account-data','buyer-delivery-preference','buyer-follow-shop','buyer-wishlist','buyer-newsletter','buyer-close-account'].includes(action)){
   const b=req.body||{},slug=String(req.method==='GET'?req.query?.slug:b.slug||'').toLowerCase().trim();
   const shops=await sql`SELECT id,slug,name FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const buyer=await buyerSession(sql,req,shops[0].id);if(!buyer)return send(res,401,{error:'Sign in to manage your buyer account.'});
   const userId=buyer.user_id;if(!userId)return send(res,403,{error:'This legacy buyer session must be refreshed. Sign in again to continue.'});
   if(action==='buyer-delivery-preference'&&req.method==='GET'){
    const rows=await sql`SELECT delivery_method,delivery_county,delivery_sub_county,delivery_estate,delivery_address,delivery_directions,pickup_station,updated_at FROM public.buyer_delivery_preferences WHERE buyer_user_id=${userId} LIMIT 1`;
    const r=rows[0];return send(res,200,{preference:r?{deliveryMethod:r.delivery_method,deliveryCounty:r.delivery_county||'',deliverySubCounty:r.delivery_sub_county||'',deliveryEstate:r.delivery_estate||'',deliveryAddress:r.delivery_address||'',deliveryDirections:r.delivery_directions||'',pickupStation:r.pickup_station||'',updatedAt:r.updated_at}:null});
   }
   if(action==='buyer-delivery-preference'&&req.method==='POST'){
    const method=String(b.deliveryMethod||'').trim(),county=String(b.deliveryCounty||'').trim().slice(0,80),subCounty=String(b.deliverySubCounty||'').trim().slice(0,100),estate=String(b.deliveryEstate||'').trim().slice(0,160),address=String(b.deliveryAddress||'').trim().slice(0,300),directions=String(b.deliveryDirections||'').trim().slice(0,500),pickup=String(b.pickupStation||'').trim().slice(0,200);
    if(!['home','pickup'].includes(method))return send(res,400,{error:'Choose a valid delivery method.'});
    if(!county||!subCounty||!estate||!address||(method==='pickup'&&!pickup))return send(res,400,{error:'Complete the county, sub-county, estate, physical address and pickup point where required.'});
    const rows=await sql`INSERT INTO public.buyer_delivery_preferences(buyer_user_id,delivery_method,delivery_county,delivery_sub_county,delivery_estate,delivery_address,delivery_directions,pickup_station,updated_at) VALUES(${userId},${method},${county},${subCounty},${estate},${address},${directions||null},${pickup||null},now()) ON CONFLICT(buyer_user_id) DO UPDATE SET delivery_method=EXCLUDED.delivery_method,delivery_county=EXCLUDED.delivery_county,delivery_sub_county=EXCLUDED.delivery_sub_county,delivery_estate=EXCLUDED.delivery_estate,delivery_address=EXCLUDED.delivery_address,delivery_directions=EXCLUDED.delivery_directions,pickup_station=EXCLUDED.pickup_station,updated_at=now() RETURNING delivery_method,delivery_county,delivery_sub_county,delivery_estate,delivery_address,delivery_directions,pickup_station,updated_at`;
    const r=rows[0];return send(res,200,{ok:true,preference:{deliveryMethod:r.delivery_method,deliveryCounty:r.delivery_county,deliverySubCounty:r.delivery_sub_county,deliveryEstate:r.delivery_estate,deliveryAddress:r.delivery_address,deliveryDirections:r.delivery_directions||'',pickupStation:r.pickup_station||'',updatedAt:r.updated_at}});
   }
   if(req.method==='GET'&&action==='buyer-account-data'){
    const [follows,wishlist,newsletter,closure]=await Promise.all([
     sql`SELECT t.id,t.slug,t.name FROM public.buyer_shop_follows f JOIN public.tenants t ON t.id=f.followed_tenant_id WHERE f.buyer_user_id=${userId} AND t.status IN ('trial','active') ORDER BY f.created_at DESC LIMIT 100`,
     sql`SELECT p.id,p.name,p.price_minor,p.images,p.stock_quantity FROM public.buyer_wishlist_items w JOIN public.products p ON p.id=w.product_id AND p.tenant_id=w.tenant_id WHERE w.buyer_user_id=${userId} AND w.tenant_id=${shops[0].id} ORDER BY w.created_at DESC LIMIT 200`,
     sql`SELECT email,consented_at FROM public.buyer_newsletter_subscriptions WHERE buyer_user_id=${userId} AND tenant_id=${shops[0].id} AND revoked_at IS NULL LIMIT 1`,
     sql`SELECT id,status,reason,created_at,updated_at FROM public.buyer_account_closure_requests WHERE buyer_user_id=${userId} LIMIT 1`
    ]);
    return send(res,200,{followedShops:follows,wishlist:wishlist.map((p:any)=>({id:p.id,name:p.name,price:Number(p.price_minor||0)/100,image:Array.isArray(p.images)?p.images[0]||'':'',stockQuantity:p.stock_quantity})),newsletter:newsletter[0]||null,closureRequest:closure[0]||null});
   }
   if(req.method==='POST'&&action==='buyer-follow-shop'){
    const targetSlug=String(b.targetSlug||slug).toLowerCase().trim(),target=await sql`SELECT id FROM public.tenants WHERE slug=${targetSlug} AND status IN ('trial','active') LIMIT 1`;
    if(!target.length)return send(res,404,{error:'The shop could not be found.'});
    if(target[0].id===shops[0].id&&b.follow===false){await sql`DELETE FROM public.buyer_shop_follows WHERE buyer_user_id=${userId} AND followed_tenant_id=${target[0].id}`;return send(res,200,{ok:true,following:false});}
    if(b.follow===false){await sql`DELETE FROM public.buyer_shop_follows WHERE buyer_user_id=${userId} AND followed_tenant_id=${target[0].id}`;return send(res,200,{ok:true,following:false});}
    await sql`INSERT INTO public.buyer_shop_follows(buyer_user_id,followed_tenant_id) VALUES(${userId},${target[0].id}) ON CONFLICT DO NOTHING`;
    return send(res,200,{ok:true,following:true});
   }
   if(req.method==='POST'&&action==='buyer-wishlist'){
    const productId=String(b.productId||'').trim(),enabled=b.enabled!==false;
    if(!/^[0-9a-f-]{36}$/i.test(productId))return send(res,400,{error:'Choose a valid product.'});
    const product=await sql`SELECT id FROM public.products WHERE id=${productId} AND tenant_id=${shops[0].id} AND is_active=true LIMIT 1`;
    if(!product.length)return send(res,404,{error:'Product not found in this shop.'});
    if(enabled)await sql`INSERT INTO public.buyer_wishlist_items(buyer_user_id,tenant_id,product_id) VALUES(${userId},${shops[0].id},${productId}) ON CONFLICT DO NOTHING`;
    else await sql`DELETE FROM public.buyer_wishlist_items WHERE buyer_user_id=${userId} AND tenant_id=${shops[0].id} AND product_id=${productId}`;
    return send(res,200,{ok:true,saved:enabled});
   }
   if(req.method==='POST'&&action==='buyer-newsletter'){
    const enabled=b.enabled===true,email=String(b.email||buyer.email||'').trim().toLowerCase();
    if(enabled&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return send(res,400,{error:'Add a valid email address before subscribing.'});
    if(enabled){await sql`INSERT INTO public.buyer_newsletter_subscriptions(buyer_user_id,tenant_id,email,consented_at,revoked_at,updated_at) VALUES(${userId},${shops[0].id},${email},now(),NULL,now()) ON CONFLICT(buyer_user_id,tenant_id) DO UPDATE SET email=EXCLUDED.email,consented_at=now(),revoked_at=NULL,updated_at=now()`;}
    else await sql`UPDATE public.buyer_newsletter_subscriptions SET revoked_at=COALESCE(revoked_at,now()),updated_at=now() WHERE buyer_user_id=${userId} AND tenant_id=${shops[0].id}`;
    return send(res,200,{ok:true,subscribed:enabled});
   }
   if(req.method==='POST'&&action==='buyer-close-account'){
    const reason=String(b.reason||'').trim().slice(0,1000);
    const rows=await sql`INSERT INTO public.buyer_account_closure_requests(buyer_user_id,requested_from_tenant_id,reason,status) VALUES(${userId},${shops[0].id},${reason||null},'pending') ON CONFLICT(buyer_user_id) DO UPDATE SET requested_from_tenant_id=EXCLUDED.requested_from_tenant_id,reason=EXCLUDED.reason,status=CASE WHEN public.buyer_account_closure_requests.status IN ('completed','rejected') THEN public.buyer_account_closure_requests.status ELSE 'pending' END,updated_at=now() RETURNING id,status,created_at`;
    return send(res,201,{ok:true,request:rows[0],message:'Your account-closure request has been recorded for identity verification. Your account remains active until the request is reviewed.'});
   }
  }
  if(req.method==='POST'&&action==='coupon-validate'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase().trim(),code=String(b.code||'').trim().toUpperCase(),subtotal=Number(b.subtotal||0),shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   if(!Number.isFinite(subtotal)||subtotal<=0)return send(res,400,{error:'Add products to your cart first.'});
   const rows=await sql`SELECT discount_type,discount_value,minimum_order_minor,max_uses,used_count FROM public.store_coupons WHERE tenant_id=${shops[0].id} AND code=${code} AND is_active=true AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`;
   if(!rows.length)return send(res,404,{error:'This coupon is invalid, expired or inactive.'});
   const cp=rows[0];if(Number(cp.max_uses||0)>0&&Number(cp.used_count)>=Number(cp.max_uses))return send(res,400,{error:'This coupon has reached its redemption limit.'});
   if(Math.round(subtotal*100)<Number(cp.minimum_order_minor||0))return send(res,400,{error:'Your cart does not meet this coupon’s minimum spend.'});
   const discountMinor=cp.discount_type==='percentage'?Math.round(subtotal*100*Number(cp.discount_value)/100):Math.round(Number(cp.discount_value)*100),discount=Math.max(0,Math.min(Math.round(subtotal*100),discountMinor));
   return send(res,200,{ok:true,code,discount:discount/100,total:(Math.round(subtotal*100)-discount)/100,description:cp.discount_type==='percentage'?Number(cp.discount_value)+'% off':'KES '+Number(cp.discount_value).toLocaleString('en-KE')+' off'});
  }
  if(req.method==='GET'&&action==='coupons-public'){
   const slug=String(req.query?.slug||'').toLowerCase().trim(),shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const rows=await sql`SELECT code,discount_type,discount_value,minimum_order_minor,max_uses,used_count,expires_at FROM public.store_coupons WHERE tenant_id=${shops[0].id} AND is_active=true AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) AND (max_uses IS NULL OR used_count<max_uses) ORDER BY created_at DESC LIMIT 100`;
   return send(res,200,{coupons:rows});
  }
  if(req.method==='POST'&&action==='complaint-attachment'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase().trim(),shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const buyer=await buyerSession(sql,req,shops[0].id);if(!buyer)return send(res,401,{error:'Sign in before attaching evidence to a report.'});
   const tenantId=shops[0].id,mode=String(b.mode||'');
   if(mode==='upload'){
    const name=String(b.fileName||''),mime=String(b.contentType||''),size=Number(b.size||0),ext=(name.split('.').pop()||'').toLowerCase(),allowed=fileTypes[ext];
    if(!allowed||allowed.mime!==mime)return send(res,415,{error:'File type not allowed. Use PDF, DOC/DOCX, XLS/XLSX, TXT, JPG, PNG or WEBP.'});
    if(!Number.isSafeInteger(size)||size<1||size>10485760)return send(res,413,{error:'Each attachment must be 10 MB or smaller.'});
    const id=crypto.randomUUID(),key=tenantId+'/complaints/'+id+'-'+safeFileName(name);
    await sql`INSERT INTO public.shop_complaint_attachments(id,tenant_id,buyer_phone,object_key,file_name,content_type,size_bytes) VALUES(${id},${tenantId},${buyer.phone},${key},${safeFileName(name)},${mime},${size})`;
    return send(res,200,{ok:true,attachmentId:id,uploadUrl:storageUrl(key,'PUT',mime),expiresIn:300});
   }
   if(mode==='complete'){
    const id=String(b.attachmentId||''),pending=await sql`SELECT id,object_key,file_name,size_bytes,content_type FROM public.shop_complaint_attachments WHERE id=${id} AND tenant_id=${tenantId} AND buyer_phone=${buyer.phone} AND upload_status='pending' AND scan_status IN ('unscanned','failed') LIMIT 1`;
    if(!pending.length)return send(res,404,{error:'Attachment upload could not be confirmed.'});
    try{
     await validateAttachmentObject(pending[0].object_key,pending[0].content_type,Number(pending[0].size_bytes));
     const ready=await sql`UPDATE public.shop_complaint_attachments SET scan_status='unscanned',upload_status='ready' WHERE id=${id} AND tenant_id=${tenantId} AND buyer_phone=${buyer.phone} RETURNING id,file_name,content_type,size_bytes`;
     return send(res,200,{ok:true,attachment:ready[0]});
    }catch(err:any){await sql`UPDATE public.shop_complaint_attachments SET scan_status='failed' WHERE id=${id} AND tenant_id=${tenantId}`;return send(res,415,{error:'The file could not be verified as an allowed file type or its size did not match. Please choose another file.'});}
   }
   return send(res,400,{error:'Invalid attachment operation.'});
  }
  if(req.method==='GET'&&action==='buyer-reports'){
   const slug=String(req.query?.slug||'').toLowerCase().trim(),shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const buyer=await buyerSession(sql,req,shops[0].id);if(!buyer)return send(res,401,{error:'Sign in to view your reports.'});
   const reports=await sql`SELECT c.id,c.issue_type,c.details,c.status,c.admin_notes,c.created_at,c.updated_at,c.payment_made,c.payment_amount_minor,c.payment_reference,o.id AS order_id,o.order_number,p.id AS product_id,p.name AS product_name FROM public.shop_complaints c LEFT JOIN public.orders o ON o.id=c.order_id AND o.tenant_id=c.tenant_id LEFT JOIN public.products p ON p.id=c.product_id AND p.tenant_id=c.tenant_id WHERE c.tenant_id=${shops[0].id} AND right(regexp_replace(c.buyer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${buyer.phone},'[^0-9]','','g'),9) ORDER BY c.created_at DESC LIMIT 100`;
   return send(res,200,{reports:reports.map((r:any)=>({...r,paymentAmount:r.payment_amount_minor==null?null:Number(r.payment_amount_minor)/100}))});
  }
  if(req.method==='GET'&&action==='buyer-notifications'){
   const slug=String(req.query?.slug||'').toLowerCase().trim(),shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const buyer=await buyerSession(sql,req,shops[0].id);if(!buyer)return send(res,401,{error:'Sign in to view notifications.'});
   const rows=await sql`SELECT n.id,n.notification_type,n.title,n.detail,n.created_at,n.read_at,n.order_id,o.order_number,n.complaint_id FROM public.buyer_notifications n LEFT JOIN public.orders o ON o.id=n.order_id AND o.tenant_id=n.tenant_id WHERE n.tenant_id=${shops[0].id} AND right(regexp_replace(n.buyer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${buyer.phone},'[^0-9]','','g'),9) ORDER BY n.created_at DESC LIMIT 50`;
   const disputeRows=await sql`SELECT id,title,detail,created_at,read_at,complaint_id FROM public.dispute_notifications WHERE tenant_id=${shops[0].id} AND recipient_role='buyer' AND right(regexp_replace(recipient_phone,'[^0-9]','','g'),9)=right(regexp_replace(${buyer.phone},'[^0-9]','','g'),9) ORDER BY created_at DESC LIMIT 30`;
   const notifications=[...rows,...disputeRows.map((n:any)=>({...n,notification_type:'dispute_update'}))].sort((a:any,b:any)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,50);
   return send(res,200,{notifications});
  }
  if(req.method==='POST'&&action==='complaint'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase().trim(),shops=await sql`SELECT id,name FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const tenantId=shops[0].id,buyer=await buyerSession(sql,req,tenantId);if(!buyer)return send(res,401,{error:'Sign in before submitting a report.'});
   const issue=String(b.issueType||''),details=String(b.details||'').trim().slice(0,5000),orderId=String(b.orderId||'').trim()||null,productId=String(b.productId||'').trim()||null,paymentMade=Boolean(b.paymentMade),paymentAmount=Number(b.paymentAmount||0),paymentReference=String(b.paymentReference||'').trim().slice(0,100),attachmentIds=Array.isArray(b.attachmentIds)?[...new Set(b.attachmentIds.map((x:any)=>String(x)))].slice(0,8):[];
   if(!['payment','delivery','product_quality','wrong_item','seller_communication','refund_return','shop_listing','other'].includes(issue))return send(res,400,{error:'Choose a valid issue type.'});
   if(details.length<10)return send(res,400,{error:'Describe the issue in at least 10 characters.'});
   if(orderId){const owned=await sql`SELECT id FROM public.orders WHERE id=${orderId} AND tenant_id=${tenantId} AND right(regexp_replace(customer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${buyer.phone},'[^0-9]','','g'),9) LIMIT 1`;if(!owned.length)return send(res,403,{error:'The selected order does not belong to your buyer account.'});}
   if(productId){const product=await sql`SELECT id FROM public.products WHERE id=${productId} AND tenant_id=${tenantId} LIMIT 1`;if(!product.length)return send(res,400,{error:'The selected product does not belong to this shop.'});if(orderId){const ordered=await sql`SELECT id FROM public.order_items WHERE tenant_id=${tenantId} AND order_id=${orderId} AND product_id=${productId} LIMIT 1`;if(!ordered.length)return send(res,400,{error:'The selected product is not part of the selected order.'});}}
   if(paymentMade&&(!Number.isFinite(paymentAmount)||paymentAmount<=0))return send(res,400,{error:'Enter the amount paid.'});
   const files=attachmentIds.length?await sql`SELECT id FROM public.shop_complaint_attachments WHERE id=ANY(${attachmentIds}::uuid[]) AND tenant_id=${tenantId} AND buyer_phone=${buyer.phone} AND upload_status='ready' AND scan_status='unscanned' AND complaint_id IS NULL`:[];
   if(files.length!==attachmentIds.length)return send(res,400,{error:'One or more attachments are not verified. Upload and scan them again.'});
   const inserted=await sql`INSERT INTO public.shop_complaints(tenant_id,order_id,product_id,buyer_phone,buyer_name,issue_type,details,payment_made,payment_amount_minor,payment_reference,dispute_status,dispute_initiated_by,dispute_deadline_at) VALUES(${tenantId},${orderId},${productId},${buyer.phone},${String(buyer.full_name||'Buyer').slice(0,120)},${issue},${details},${paymentMade},${paymentMade?Math.round(paymentAmount*100):null},${paymentReference||null},'open','buyer',now()+interval '1 hour') RETURNING id,created_at,status,dispute_deadline_at`;
   if(attachmentIds.length)await sql`UPDATE public.shop_complaint_attachments SET complaint_id=${inserted[0].id} WHERE id=ANY(${attachmentIds}::uuid[]) AND tenant_id=${tenantId} AND buyer_phone=${buyer.phone}`;
   await sql`INSERT INTO public.dispute_messages(tenant_id,complaint_id,sender_role,sender_id,sender_name,message) VALUES(${tenantId},${inserted[0].id},'buyer',${buyer.id},${String(buyer.full_name||'Buyer')},${'Report opened: '+details})`;
   const sellerOwner=await sql`SELECT created_by FROM public.tenants WHERE id=${tenantId}`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_user_id,title,detail) VALUES(${tenantId},${inserted[0].id},'seller',${sellerOwner[0]?.created_by||null},'A buyer has initiated a report','A buyer has opened a report. You can now discuss it in the dispute chat.')`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,title,detail) VALUES(${tenantId},${inserted[0].id},'buyer',${buyer.phone},'Your report has been initiated','Your report is now open. You and the seller can discuss it in the case chat for one hour.')`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,title,detail) VALUES(${tenantId},${inserted[0].id},'admin','New buyer report','A buyer has initiated a new report that may require DASNET review.')`;
   return send(res,201,{ok:true,report:{id:inserted[0].id,shopName:shops[0].name,status:inserted[0].status,createdAt:inserted[0].created_at,deadlineAt:inserted[0].dispute_deadline_at},message:'Your report has been sent to the seller and DASNET dispute workflow.'});
  }
  if(req.method==='POST'&&action==='daraja-callback'){
   const cb=req.body?.Body?.stkCallback||{},checkout=String(cb.CheckoutRequestID||''),resultCode=Number(cb.ResultCode);
   if(!checkout)return send(res,200,{ResultCode:0,ResultDesc:'Accepted'});
   if(!Number.isFinite(resultCode))return send(res,400,{ResultCode:1,ResultDesc:'Invalid callback result code'});
   const rows=await sql`SELECT p.id,p.tenant_id,p.order_id,p.phone,p.amount_minor,p.status,p.provider_result,pc.shortcode,pc.party_b,pc.account_type,pc.environment,pc.encrypted_credentials,pc.payout_method,pc.account_reference,pc.till_party_b,pc.paybill_party_b,pc.default_payout_method,pm.shortcode AS central_shortcode,pm.environment AS central_environment,pm.encrypted_credentials AS central_credentials FROM public.payments p LEFT JOIN public.payment_configs pc ON pc.tenant_id=p.tenant_id LEFT JOIN public.platform_payment_methods pm ON pm.method=CASE WHEN p.provider_result->>'paymentMethod'='paybill' THEN 'paybill' ELSE 'till' END WHERE p.provider_checkout_id=${checkout} LIMIT 1`;
   if(!rows.length)return send(res,200,{ResultCode:0,ResultDesc:'Accepted'});
   const p=rows[0];if(p.status==='succeeded')return send(res,200,{ResultCode:0,ResultDesc:'Already processed'});
   // Safaricom cancellation/failure callbacks must release the payment lock even
   // when credential decryption or a verification API is unavailable.
   if(resultCode!==0){
    const terminalStatus=resultCode===1032?'cancelled':'failed';
    await sql`UPDATE public.payments SET status=${terminalStatus},provider_result=${JSON.stringify({...((p.provider_result&&typeof p.provider_result==='object')?p.provider_result:{}),callback:cb,resultCode,resultDescription:String(cb.ResultDesc||'')})}::jsonb,updated_at=now() WHERE id=${p.id} AND status IN ('initiated','pending')`;
    await notifyOrderBuyer(sql,p.tenant_id,p.order_id,'payment_update',terminalStatus==='cancelled'?'Payment cancelled':'Payment failed','Payment for your order was '+terminalStatus+'.');
    return send(res,200,{ResultCode:0,ResultDesc:terminalStatus==='cancelled'?'Customer cancelled payment':'Payment failure recorded'});
   }
   // Safaricom's STK callback is the final transaction response. Do not block
   // settlement on a second STK-query request, which can lag or fail after
   // the successful callback has already arrived.
   try{
    const meta=cb.CallbackMetadata?.Item||[],val=(n:string)=>meta.find((x:any)=>x.Name===n)?.Value;
    const amount=Number(val('Amount'));
    const receipt=String(val('MpesaReceiptNumber')||'').trim().toUpperCase();
    const phone=String(val('PhoneNumber')||'').replace(/[^0-9]/g,'');
    const expectedPhone=String(p.phone||'').replace(/[^0-9]/g,'');
    if(!Number.isFinite(amount)||!receipt||!phone||Math.round(amount*100)!==Number(p.amount_minor)||phone!==expectedPhone){
     console.error('Daraja successful callback did not match payment record',{paymentId:p.id,checkout,amountMinor:Number.isFinite(amount)?Math.round(amount*100):null,expectedAmountMinor:Number(p.amount_minor),phoneMatched:phone===expectedPhone,hasReceipt:!!receipt});
     return send(res,200,{ResultCode:0,ResultDesc:'Callback received; payment details require review'});
    }
    const settlement=await sql`WITH wanted AS (SELECT product_id,SUM(quantity)::integer AS quantity FROM public.order_items WHERE tenant_id=${p.tenant_id} AND order_id=${p.order_id} AND product_id IS NOT NULL GROUP BY product_id), eligible AS (SELECT COUNT(*)::integer AS count FROM wanted w JOIN public.products pr ON pr.id=w.product_id AND pr.tenant_id=${p.tenant_id} WHERE pr.stock_quantity IS NULL OR pr.stock_quantity>=w.quantity), payment_mark AS (UPDATE public.payments SET status='succeeded',provider_receipt=${receipt},provider_result=(${JSON.stringify({...((p.provider_result&&typeof p.provider_result==='object')?p.provider_result:{}),callback:cb,callbackResultCode:resultCode})}::jsonb || jsonb_build_object('inventoryApplied',(SELECT COUNT(*) FROM wanted)=0 OR (SELECT count FROM eligible)=(SELECT COUNT(*) FROM wanted),'inventoryIssue',CASE WHEN (SELECT COUNT(*) FROM wanted)=0 OR (SELECT count FROM eligible)=(SELECT COUNT(*) FROM wanted) THEN NULL ELSE 'Payment confirmed, but stock changed during checkout. Seller review required.' END)),verified_at=now(),updated_at=now() WHERE id=${p.id} AND status IN ('initiated','pending') RETURNING id,tenant_id,order_id), stock_update AS (UPDATE public.products pr SET stock_quantity=CASE WHEN pr.stock_quantity IS NULL THEN NULL ELSE pr.stock_quantity-w.quantity END,updated_at=now() FROM wanted w,payment_mark pm,eligible e WHERE pr.id=w.product_id AND pr.tenant_id=${p.tenant_id} AND (SELECT COUNT(*) FROM wanted)>0 AND e.count=(SELECT COUNT(*) FROM wanted) AND (pr.stock_quantity IS NULL OR pr.stock_quantity>=w.quantity) RETURNING pr.id), queued AS (INSERT INTO public.payment_reconciliation_jobs(payment_id,tenant_id,order_id,status) SELECT id,tenant_id,order_id,'pending' FROM payment_mark ON CONFLICT(payment_id) DO NOTHING RETURNING id) SELECT (SELECT COUNT(*) FROM wanted)::integer AS wanted_count,(SELECT count FROM eligible)::integer AS eligible_count,(SELECT COUNT(*) FROM payment_mark)::integer AS payment_count,(SELECT COUNT(*) FROM stock_update)::integer AS stock_count,(SELECT COUNT(*) FROM queued)::integer AS queued_count`;
    if(Number(settlement[0]?.payment_count||0)===0)return send(res,200,{ResultCode:0,ResultDesc:'Already processed'});if(Number(settlement[0]?.stock_count||0)!==Number(settlement[0]?.wanted_count||0))console.error('Verified payment needs seller inventory review',{orderId:p.order_id,tenantId:p.tenant_id});
    const jobRows=await sql`SELECT id FROM public.payment_reconciliation_jobs WHERE payment_id=${p.id} LIMIT 1`;if(jobRows.length){try{await reconcilePaymentJob(sql,String(jobRows[0].id));}catch(reconcileError:any){console.error('Verified payment queued for later reconciliation',{paymentId:p.id,error:String(reconcileError?.message||reconcileError)});}}
   }catch(err:any){console.error('Daraja callback verification failed',err?.message||err);return send(res,503,{ResultCode:1,ResultDesc:'Payment verification is temporarily unavailable. Retry required.'});}
   return send(res,200,{ResultCode:0,ResultDesc:'Accepted'});
  }
  if(req.method==='GET'&&action==='reconcile-payments'){
   const secret=env('CRON_SECRET')||env('DASNET_RECONCILIATION_SECRET');
   if(!secret)return send(res,503,{error:'Payment reconciliation is not configured.'});
   if(String(req.headers.authorization||'')!=='Bearer '+secret)return send(res,401,{error:'Unauthorized.'});
   const jobs=await sql`SELECT id FROM public.payment_reconciliation_jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 25`;
   let processed=0,failed=0;
   for(const job of jobs){
    try{if(await reconcilePaymentJob(sql,String(job.id)))processed++;}
    catch(error:any){failed++;console.error('Payment reconciliation job failed',{jobId:job.id,error:String(error?.message||error)});}
   }
   return send(res,200,{ok:true,found:jobs.length,processed,failed});
  }
  const me=await seller(sql,req);
  if(req.method==='POST'&&action==='products-test-seed'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to generate test products.'});
   const categories=[
    {name:'Phones & Tablets',items:['Mobile Phones','Tablets & Pads','Smart Watches & Trackers','Phone Accessories'],image:'photo-1511707171634-5f897ff02aa9'},
    {name:'Computers & Laptops',items:['Laptops','Desktop Computers','Monitors','Printers & Scanners','Computer Accessories','Networking & Wi-Fi'],image:'photo-1496181133206-80ce9b88a853'},
    {name:'TV, Audio & Cameras',items:['TVs','Speakers & Home Audio','Headphones & Earbuds','Cameras & Drones','CCTV & Security','Solar, Inverters & Power'],image:'photo-1505740420928-5e560c06d30e'},
    {name:'Gaming',items:['Video Game Consoles','Video Games','Controllers & Accessories','Gaming PCs & Setups'],image:'photo-1593305841991-05c297ba4575'},
    {name:'Home Appliances',items:['Fridges & Freezers','Washing Machines','Cookers, Ovens & Microwaves','Small Kitchen Appliances','ACs & Fans','Irons & Vacuums'],image:'photo-1584568694244-14fbdf83bd30'},
    {name:'Furniture & Home',items:['Sofas & Living Room','Beds & Mattresses','Tables, Chairs & Dining','Office Furniture','Wardrobes & Storage','Décor & Lighting','Kitchenware & Dining','Garden & Outdoor'],image:'photo-1555041469-a586c61ea9bc'},
    {name:'Fashion',items:["Men's Clothing","Women's Clothing",'Shoes & Sneakers','Bags','Watches','Jewellery & Accessories','Traditional & Wedding Wear'],image:'photo-1523275335684-37898b6baf30'},
    {name:'Health & Beauty',items:['Skin Care','Hair & Wigs','Makeup','Perfumes & Fragrances','Grooming & Personal Care','Vitamins & Supplements'],image:'photo-1596462502278-27bfdc403348'},
    {name:'Babies & Kids',items:['Toys & Games',"Kids' Clothing & Shoes",'Prams, Car Seats & Gear','Baby Care & Feeding','School Supplies'],image:'photo-1516627145497-ae6968895b74'},
    {name:'Sports, Music & Books',items:['Gym & Fitness','Bicycles','Sports Equipment','Musical Instruments','Books & Stationery','Camping & Travel'],image:'photo-1461896836934-ffe607ba8211'},
    {name:'Vehicles',items:['Cars','Motorcycles & Bodas','Trucks, Buses & Heavy Equipment','Spare Parts & Accessories'],image:'photo-1492144534655-ae79c964c9d7'},
    {name:'Property',items:['Houses for Rent','Houses for Sale','Land & Plots','Shops, Offices & Commercial','Short Stay & Airbnb'],image:'photo-1600585154340-be6161a56a0c'},
    {name:'Agriculture & Food',items:['Livestock & Poultry','Farm Machinery & Tools','Seeds, Feeds & Fertilisers','Food & Produce'],image:'photo-1500382017468-9049fed747ef'},
    {name:'Animals & Pets',items:['Dogs & Puppies','Cats & Kittens','Pet Food & Supplies','Birds, Fish & Other Pets'],image:'photo-1543466835-00a7907e9de1'},
    {name:'Tools & Business Equipment',items:['Power & Hand Tools','Building Materials','Electrical & Plumbing','Salon & Spa Equipment','Restaurant & Catering','Shop, Office & Printing','Medical Equipment'],image:'photo-1581147036324-c1c7a5c3b6c2'},
    {name:'Services',items:['Repair & Technicians','Cleaning & Fumigation','Events, Catering & Photography','Moving & Transport','IT, Design & Business','Lessons & Tutoring'],image:'photo-1521737711867-e3b97375f902'}
   ];
   const current=await sql`SELECT metadata->>'test_parent_category' AS category,count(*)::int AS total FROM public.products WHERE tenant_id=${me.tenant_id} AND metadata->>'test_product'='true' GROUP BY metadata->>'test_parent_category'`;
   const counts=new Map<string,number>(current.map((r:any)=>[String(r.category),Number(r.total)] as [string,number]));
   await sql`UPDATE public.products SET images=jsonb_build_array('https://images.unsplash.com/' || CASE metadata->>'test_parent_category' WHEN 'Phones & Tablets' THEN 'photo-1511707171634-5f897ff02aa9' WHEN 'Computers & Laptops' THEN 'photo-1496181133206-80ce9b88a853' WHEN 'TV, Audio & Cameras' THEN 'photo-1505740420928-5e560c06d30e' WHEN 'Gaming' THEN 'photo-1593305841991-05c297ba4575' WHEN 'Home Appliances' THEN 'photo-1584568694244-14fbdf83bd30' WHEN 'Furniture & Home' THEN 'photo-1555041469-a586c61ea9bc' WHEN 'Fashion' THEN 'photo-1523275335684-37898b6baf30' WHEN 'Health & Beauty' THEN 'photo-1596462502278-27bfdc403348' WHEN 'Babies & Kids' THEN 'photo-1516627145497-ae6968895b74' WHEN 'Sports, Music & Books' THEN 'photo-1461896836934-ffe607ba8211' WHEN 'Vehicles' THEN 'photo-1492144534655-ae79c964c9d7' WHEN 'Property' THEN 'photo-1600585154340-be6161a56a0c' WHEN 'Agriculture & Food' THEN 'photo-1500382017468-9049fed747ef' WHEN 'Animals & Pets' THEN 'photo-1543466835-00a7907e9de1' WHEN 'Tools & Business Equipment' THEN 'photo-1581147036324-c1c7a5c3b6c2' WHEN 'Services' THEN 'photo-1521737711867-e3b97375f902' ELSE 'photo-1490481651871-ab68de25d43d' END || '?auto=format&fit=crop&w=640&q=80') WHERE tenant_id=${me.tenant_id} AND metadata->>'test_product'='true'`;
   const rows:any[]=[];
   for(let ci=0;ci<categories.length;ci++){
    const category=categories[ci],existing=counts.get(category.name)||0,needed=Math.max(0,50-existing);
    for(let j=0;j<needed;j++){
     const n=existing+j,item=category.items[n%category.items.length],number=String(n+1).padStart(2,'0');
     const name=(item+' · DASNET Demo '+number).slice(0,120),sku='DAS-TEST-'+String(ci+1).padStart(2,'0')+'-'+number+'-'+crypto.randomBytes(3).toString('hex').toUpperCase();
     const image='https://images.unsplash.com/'+category.image+'?auto=format&fit=crop&w=640&q=80';
     rows.push({name,slug:slugify(name)+'-'+crypto.randomBytes(4).toString('hex'),description:'Test catalogue item for '+category.name+'. This sample listing is provided for storefront, search, cart and checkout testing. It is not a real offer.',price_minor:Math.round((250+(ci*173)+(n*97))*100),stock_quantity:5+(n%46),sku,images:[image],metadata:{category:item,test_parent_category:category.name,test_product:true,spotlight:false,tags:'DASNET test catalogue'}});
    }
   }
   if(rows.length){
    await sql`INSERT INTO public.products(tenant_id,name,slug,description,product_type,price_minor,stock_quantity,is_active,sku,images,metadata) SELECT ${me.tenant_id},p.name,p.slug,p.description,'physical',p.price_minor,p.stock_quantity,true,p.sku,p.images,p.metadata FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS p(name text,slug text,description text,price_minor bigint,stock_quantity integer,sku text,images jsonb,metadata jsonb)`;
    await audit(sql,me.tenant_id,me.user_id,'products.test_catalogue_seeded','product',null,{created:rows.length,categories:categories.length});
   }
   const totals=await sql`SELECT metadata->>'test_parent_category' AS category,count(*)::int AS total FROM public.products WHERE tenant_id=${me.tenant_id} AND metadata->>'test_product'='true' GROUP BY metadata->>'test_parent_category' ORDER BY metadata->>'test_parent_category'`;
   return send(res,200,{ok:true,created:rows.length,total:totals.reduce((n:number,r:any)=>n+Number(r.total||0),0),categories:totals,message:rows.length?rows.length+' test products added.':'The test catalogue is already complete.'});
  }

  if(req.method==='GET'&&action==='customer-orders'){
   const slug=String(req.query?.slug||'').toLowerCase().trim();
   const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const customer=await buyerSession(sql,req,shops[0].id);if(!customer)return send(res,401,{error:'Sign in to view your orders.'});
   const rows=await sql`SELECT o.id,o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.subtotal_minor,o.total_minor,o.discount_minor,o.coupon_code,o.created_at,o.status,o.delivery_status,o.delivery_updated_at,o.delivery_method,o.delivery_county,o.delivery_sub_county,o.delivery_estate,o.delivery_address,o.delivery_directions,o.pickup_station,
    COALESCE((SELECT json_agg(json_build_object('id',i.product_id,'name',i.product_name,'quantity',i.quantity,'price',i.unit_price_minor,'lineTotal',i.line_total_minor,'image',(SELECT p.images->>0 FROM public.products p WHERE p.id=i.product_id AND p.tenant_id=o.tenant_id LIMIT 1),'category',(SELECT p.metadata->>'category' FROM public.products p WHERE p.id=i.product_id AND p.tenant_id=o.tenant_id LIMIT 1)) ORDER BY i.created_at) FROM (SELECT product_id,product_name,unit_price_minor,SUM(quantity)::int AS quantity,SUM(line_total_minor)::bigint AS line_total_minor,MIN(created_at) AS created_at FROM public.order_items WHERE tenant_id=o.tenant_id AND order_id=o.id GROUP BY product_id,product_name,unit_price_minor) i),'[]'::json) AS items,
    pay.status AS payment_status,pay.provider_receipt
    FROM public.orders o
    LEFT JOIN LATERAL (SELECT p.status,p.provider_receipt,p.provider_result->>'inventoryIssue' AS inventory_issue FROM public.payments p WHERE p.tenant_id=o.tenant_id AND p.order_id=o.id ORDER BY p.created_at DESC LIMIT 1) pay ON true
    WHERE o.tenant_id=${shops[0].id} AND right(regexp_replace(o.customer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${customer.phone},'[^0-9]','','g'),9) ORDER BY o.created_at DESC LIMIT 100`;
   return send(res,200,{orders:rows.map((o:any)=>({id:o.id,orderNumber:o.order_number,createdAt:o.created_at,customerName:o.customer_name,customerPhone:o.customer_phone,customerEmail:o.customer_email||'',subtotal:Number(o.subtotal_minor)/100,discount:Number(o.discount_minor||0)/100,couponCode:o.coupon_code||null,total:Number(o.total_minor)/100,orderStatus:o.status,deliveryStatus:o.delivery_status||'pending_delivery',deliveryUpdatedAt:o.delivery_updated_at,deliveryMethod:o.delivery_method||'home',deliveryCounty:o.delivery_county||'',deliverySubCounty:o.delivery_sub_county||'',deliveryEstate:o.delivery_estate||'',deliveryAddress:o.delivery_address||'',deliveryDirections:o.delivery_directions||'',pickupStation:o.pickup_station||'',paymentStatus:o.payment_status||'unpaid',paymentIssue:o.inventory_issue||null,receipt:o.provider_receipt||null,items:(o.items||[]).map((i:any)=>({id:i.id,name:i.name,quantity:Number(i.quantity),price:Number(i.price)/100,lineTotal:Number(i.lineTotal)/100}))}))});
  }
  if(req.method==='POST'&&action==='customer-payment-retry'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase().trim(),orderId=String(b.orderId||'').trim(),paymentPhone=normalizePhone(b.paymentPhone||'');
   if(!slug||!orderId)return send(res,400,{error:'Order reference is required.'});
   const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   const tenantId=shops[0].id,buyer=await buyerSession(sql,req,tenantId);
   if(!buyer)return send(res,401,{error:'Sign in to retry payment.'});
   const orders=await sql`SELECT id,order_number,total_minor,status,customer_phone FROM public.orders WHERE id=${orderId} AND tenant_id=${tenantId} AND right(regexp_replace(customer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${buyer.phone},'[^0-9]','','g'),9) LIMIT 1`;
   if(!orders.length)return send(res,404,{error:'Order not found for this buyer.'});
   const order=orders[0];if(!paymentPhone)return send(res,400,{error:'Enter a valid Kenyan M-PESA phone number to receive the payment prompt.'});
   if(['cancelled','refunded'].includes(String(order.status)))return send(res,409,{error:'This order is cancelled or refunded and cannot be paid.'});
   const prior=await sql`SELECT status FROM public.payments WHERE tenant_id=${tenantId} AND order_id=${order.id} ORDER BY created_at DESC LIMIT 1`;
   if(prior[0]?.status==='succeeded')return send(res,409,{error:'This order is already paid.'});
   if(['initiated','pending'].includes(String(prior[0]?.status||'')))return send(res,409,{error:'A payment prompt is already awaiting a result. Please wait before retrying.'});
   if(prior[0]?.status!=='failed'&&prior[0]?.status!=='cancelled')return send(res,409,{error:'Retry is available only after a payment has failed or been cancelled.'});
   const configs=await sql`SELECT pc.*,pt.shortcode AS central_till_shortcode,pt.environment AS central_till_environment,pt.encrypted_credentials AS central_till_credentials,pb.shortcode AS central_paybill_shortcode,pb.environment AS central_paybill_environment,pb.encrypted_credentials AS central_paybill_credentials FROM public.tenants t LEFT JOIN public.payment_configs pc ON pc.tenant_id=t.id LEFT JOIN public.platform_payment_methods pt ON pt.method='till' LEFT JOIN public.platform_payment_methods pb ON pb.method='paybill' WHERE t.id=${tenantId} LIMIT 1`;
   const cfg=configs[0]||{},key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
   const method=String(cfg.default_payout_method||cfg.payout_method||'till')==='paybill'?'paybill':'till';let payment:any=null;
   try{
    if(method==='till'&&!((cfg.till_party_b)||(cfg.payout_method==='till'&&cfg.party_b)))return send(res,409,{error:'The shop Till destination is not configured.'});
    if(method==='paybill'&&!((cfg.paybill_party_b)||(cfg.payout_method==='paybill'&&cfg.party_b)))return send(res,409,{error:'The shop PayBill destination is not configured.'});
    if(method==='paybill'&&!cfg.account_reference)return send(res,409,{error:'The shop PayBill account reference is missing.'});
    const sellerBundle=cfg.encrypted_credentials?.ciphertext?decryptBundle(cfg.encrypted_credentials,key,'seller'):null;
    const sellerCredentials=sellerBundle?.credentialsByType?.[method]||(sellerBundle?.consumerKey?{...sellerBundle,shortcode:cfg.shortcode,environment:cfg.environment}:null);
    const centralBlob=method==='paybill'?cfg.central_paybill_credentials:cfg.central_till_credentials;
    if(sellerCredentials?.consumerKey&&sellerCredentials?.consumerSecret&&sellerCredentials?.passkey){
     payment={...sellerCredentials,partyB:method==='paybill'?(cfg.paybill_party_b||((cfg.payout_method||cfg.default_payout_method)==='paybill'?cfg.party_b:'')):(cfg.till_party_b||((cfg.payout_method||cfg.default_payout_method)==='till'?cfg.party_b:'')),accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};
    }else if(centralBlob?.data){
     const central=decryptBundle(centralBlob,key,'platform');
     payment={...central,shortcode:method==='paybill'?cfg.central_paybill_shortcode:cfg.central_till_shortcode,partyB:method==='paybill'?(cfg.paybill_party_b||((cfg.payout_method||cfg.default_payout_method)==='paybill'?cfg.party_b:'')):(cfg.till_party_b||((cfg.payout_method||cfg.default_payout_method)==='till'?cfg.party_b:'')),environment:method==='paybill'?cfg.central_paybill_environment:cfg.central_till_environment,accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};
    }
   }catch(e:any){console.error('Buyer retry credentials failed',e?.message||e);return send(res,503,{error:'Payment credentials could not be loaded securely.'});}
   if(!payment?.consumerKey||!payment?.consumerSecret||!payment?.passkey||!payment?.shortcode||!payment?.partyB)return send(res,503,{error:'This shop has not completed the required M-PESA payment setup.'});
   if(payment.environment!=='production')return send(res,503,{error:'Live payment retry is disabled while this shop is using sandbox credentials.'});
   const amount=Number(order.total_minor);if(!Number.isSafeInteger(amount)||amount<1)return send(res,400,{error:'This order has an invalid total.'});
   const paymentId=crypto.randomUUID();
   const inserted=await sql`INSERT INTO public.payments(tenant_id,order_id,provider,phone,amount_minor,currency,status,idempotency_key,provider_result) VALUES(${tenantId},${order.id},'mpesa_daraja',${paymentPhone},${amount},'KES','initiated',${paymentId},${JSON.stringify({paymentMethod:method,source:'buyer_payment_retry'})}::jsonb) RETURNING id`;
   try{
    const callbackUrl=env('DASNET_DARAJA_CALLBACK_URL')||(env('DASNET_PUBLIC_URL')||('https://'+(env('VERCEL_URL')||'dasmarket.co.ke'))).replace(/\/$/,'')+'/api/payments?action=daraja-callback';
    const stk=await startStk(payment,order,paymentPhone,amount/100,payment.accountType==='CustomerPayBillOnline'?(cfg.account_reference||''):order.order_number.slice(-12),callbackUrl);
    await sql`UPDATE public.payments SET provider_checkout_id=${stk.checkoutId},status='pending',provider_result=${JSON.stringify({paymentMethod:method,source:'buyer_payment_retry',merchantRequestId:stk.merchantRequestId,response:stk.response})}::jsonb,updated_at=now() WHERE id=${inserted[0].id}`;
    return send(res,200,{ok:true,checkoutRequestId:stk.checkoutId,message:'M-PESA prompt sent. Enter your PIN to complete payment.'});
   }catch(e:any){
    await sql`UPDATE public.payments SET status='failed',provider_result=${JSON.stringify({paymentMethod:method,source:'buyer_payment_retry',error:String(e?.message||'STK request failed')})}::jsonb,updated_at=now() WHERE id=${inserted[0].id}`;
    console.error('Buyer payment retry failed',e?.message||e);return send(res,502,{error:e?.message||'Could not start the M-PESA payment prompt.'});
   }
  }
  if((req.method==='GET'||req.method==='POST')&&action==='customer-chat'){
   const b=req.body||{},tokenValue=String(req.method==='GET'?req.query?.token:b.token||'').trim(),orderId=String(req.method==='GET'?req.query?.orderId:b.orderId||'').trim(),slug=String(req.method==='GET'?req.query?.slug:b.slug||'').toLowerCase().trim();
   let rows:any[]=[];
   if(/^[a-f0-9]{64}$/.test(tokenValue)){
    rows=await sql`SELECT id,tenant_id,order_number,customer_name,status,delivery_status,delivery_updated_at,created_at,total_minor,delivery_method,delivery_county,delivery_sub_county,delivery_estate,delivery_address,delivery_directions,pickup_station FROM public.orders WHERE customer_chat_token_hash=${hash(tokenValue)} LIMIT 1`;
   }else if(orderId&&slug){
    const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;if(!shops.length)return send(res,404,{error:'Shop not found.'});
    const customer=await buyerSession(sql,req,shops[0].id);if(!customer)return send(res,401,{error:'Sign in to access this order conversation.'});
    rows=await sql`SELECT id,tenant_id,order_number,customer_name,status,delivery_status,delivery_updated_at,created_at,total_minor,delivery_method,delivery_county,delivery_sub_county,delivery_estate,delivery_address,delivery_directions,pickup_station FROM public.orders WHERE id=${orderId} AND tenant_id=${shops[0].id} AND customer_phone=${customer.phone} LIMIT 1`;
   }
   if(!rows.length)return send(res,401,{error:'This chat link is invalid or expired.'});
   const order=rows[0];
   if(req.method==='POST'){
    const message=String(b.message||'').trim().slice(0,2000);if(message.length<1)return send(res,400,{error:'Write a message before sending.'});
    const rate=await sql`SELECT count(*)::int AS n FROM public.order_messages WHERE tenant_id=${order.tenant_id} AND order_id=${order.id} AND sender_type='customer' AND created_at>now()-interval '1 minute'`;
    if(Number(rate[0]?.n||0)>=8)return send(res,429,{error:'Please wait before sending another message.'});
    await sql`INSERT INTO public.order_messages(tenant_id,order_id,sender_type,message) VALUES(${order.tenant_id},${order.id},'customer',${message})`;
   }
   const messages=await sql`SELECT id,sender_type,message,created_at FROM public.order_messages WHERE tenant_id=${order.tenant_id} AND order_id=${order.id} ORDER BY created_at ASC LIMIT 100`;
   const payment=await sql`SELECT status,provider_receipt,updated_at FROM public.payments WHERE tenant_id=${order.tenant_id} AND order_id=${order.id} ORDER BY created_at DESC LIMIT 1`;
   const attachments=await sql`SELECT id,uploader_type,file_name,content_type,size_bytes,created_at FROM public.order_message_attachments WHERE tenant_id=${order.tenant_id} AND order_id=${order.id} AND upload_status='ready' AND scan_status='clean' ORDER BY created_at ASC LIMIT 100`;return send(res,200,{orderNumber:order.order_number,order:{orderNumber:order.order_number,customerName:order.customer_name,status:order.status,deliveryStatus:order.delivery_status||'pending_delivery',deliveryUpdatedAt:order.delivery_updated_at,total:Number(order.total_minor)/100,paymentStatus:payment[0]?.status||'unpaid',receipt:payment[0]?.provider_receipt||null,deliveryMethod:order.delivery_method||'home',deliveryCounty:order.delivery_county||'',deliverySubCounty:order.delivery_sub_county||'',deliveryEstate:order.delivery_estate||'',deliveryAddress:order.delivery_address||'',deliveryDirections:order.delivery_directions||'',pickupStation:order.pickup_station||''},messages,attachments});
  }
  if(req.method==='POST'&&action==='chat-attachment'){
   const b=req.body||{},mode=String(b.mode||''),tokenValue=String(b.token||'').trim();let order:any=null,tenantId='',uploader='merchant',userId:string|null=null;
   if(tokenValue){if(!/^[a-f0-9]{64}$/.test(tokenValue))return send(res,401,{error:'This chat link is invalid or expired.'});const rows=await sql`SELECT id,tenant_id FROM public.orders WHERE customer_chat_token_hash=${hash(tokenValue)} LIMIT 1`;order=rows[0];uploader='customer';}
   else if(b.orderId&&b.slug){const shops=await sql`SELECT id FROM public.tenants WHERE slug=${String(b.slug).toLowerCase()} AND status IN ('trial','active') LIMIT 1`;if(!shops.length)return send(res,404,{error:'Shop not found.'});const customer=await buyerSession(sql,req,shops[0].id);if(!customer)return send(res,401,{error:'Sign in to access this order attachment.'});const rows=await sql`SELECT id,tenant_id FROM public.orders WHERE id=${String(b.orderId)} AND tenant_id=${shops[0].id} AND customer_phone=${customer.phone} LIMIT 1`;order=rows[0];uploader='customer';}
   else if(me){const orderId=String(b.orderId||'');if(!orderId)return send(res,400,{error:'Order reference is required.'});if(!['owner','admin','editor','viewer'].includes(me.role))return send(res,403,{error:'You do not have permission to access order conversations.'});const rows=await sql`SELECT id,tenant_id FROM public.orders WHERE id=${orderId} AND tenant_id=${me.tenant_id} LIMIT 1`;order=rows[0];tenantId=me.tenant_id;userId=me.user_id;}
   if(!order)return send(res,404,{error:'Order not found or chat link expired.'});tenantId=order.tenant_id;
   if(mode==='upload'){
    if(!tokenValue&&(!me||!['owner','admin','editor'].includes(me.role)))return send(res,403,{error:'You cannot upload files from this account.'});
    const name=String(b.fileName||''),mime=String(b.contentType||''),size=Number(b.size||0),ext=(name.split('.').pop()||'').toLowerCase(),allowed=fileTypes[ext];
    if(!allowed||allowed.mime!==mime)return send(res,415,{error:'File type not allowed. Use PDF, DOC/DOCX, XLS/XLSX, TXT, JPG, PNG or WEBP.'});
    if(!Number.isSafeInteger(size)||size<1||size>10485760)return send(res,413,{error:'Each attachment must be 10 MB or smaller.'});
    const id=crypto.randomUUID(),key=tenantId+'/'+order.id+'/'+id+'-'+safeFileName(name);
    await sql`INSERT INTO public.order_message_attachments(id,tenant_id,order_id,uploader_type,uploaded_by,object_key,file_name,content_type,size_bytes) VALUES(${id},${tenantId},${order.id},${uploader},${userId},${key},${safeFileName(name)},${mime},${size})`;
    return send(res,200,{ok:true,attachmentId:id,uploadUrl:storageUrl(key,'PUT',mime),expiresIn:300});
   }
   if(mode==='complete'){
     const id=String(b.attachmentId||'');
     const pending=await sql`SELECT id,object_key,file_name,size_bytes,content_type FROM public.order_message_attachments WHERE id=${id} AND tenant_id=${tenantId} AND order_id=${order.id} AND uploader_type=${uploader} AND upload_status='pending' AND scan_status IN ('unscanned','failed') LIMIT 1`;
     if(!pending.length)return send(res,404,{error:'Attachment upload could not be confirmed.'});
     try{
      const result=await scanAttachment(pending[0].object_key,pending[0].file_name,pending[0].content_type,Number(pending[0].size_bytes));
      if(result==='infected'){
       await sql`UPDATE public.order_message_attachments SET scan_status='infected',upload_status='pending' WHERE id=${id} AND tenant_id=${tenantId}`;
       return send(res,415,{error:'This file failed the security scan and was rejected.'});
      }
      const rows=await sql`UPDATE public.order_message_attachments SET scan_status='clean',upload_status='ready' WHERE id=${id} AND tenant_id=${tenantId} AND order_id=${order.id} AND uploader_type=${uploader} AND upload_status='pending' RETURNING id,file_name,size_bytes,content_type,created_at`;
      if(!rows.length)return send(res,409,{error:'Attachment state changed. Please retry.'});
      return send(res,200,{ok:true,attachment:rows[0]});
     }catch(err:any){
      await sql`UPDATE public.order_message_attachments SET scan_status='failed',upload_status='pending' WHERE id=${id} AND tenant_id=${tenantId} AND upload_status='pending'`;
      const message=String(err?.message||'');
      console.error('DASNET attachment security check failed',message);
      if(message==='FILE_SCANNER_NOT_CONFIGURED')return send(res,503,{error:'Secure file scanning is not configured yet. Attachments are disabled until the scanner is connected.'});
      if(message==='ATTACHMENT_CONTENT_MISMATCH'||message==='ATTACHMENT_SIZE_MISMATCH')return send(res,415,{error:'The uploaded file does not match its declared type or size.'});
      return send(res,503,{error:'The file could not be security-scanned. It has been quarantined; please try again later.'});
     }
    }
    if(mode==='download'){
    const id=String(b.attachmentId||'');const rows=await sql`SELECT id,object_key,file_name,content_type FROM public.order_message_attachments WHERE id=${id} AND tenant_id=${tenantId} AND order_id=${order.id} AND upload_status='ready' AND scan_status='clean' LIMIT 1`;
    if(!rows.length)return send(res,404,{error:'Attachment not found.'});
    return send(res,200,{url:storageUrl(rows[0].object_key,'GET'),fileName:rows[0].file_name,contentType:rows[0].content_type,expiresIn:300});
   }
   return send(res,400,{error:'Invalid attachment operation.'});
  }
  if(req.method==='GET'&&action==='product-reviews'){
    const slug=String(req.query?.slug||'').toLowerCase(),productId=String(req.query?.productId||'');if(!slug||!productId)return send(res,400,{error:'Shop and product are required.'});
    const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;if(!shops.length)return send(res,404,{error:'Shop not found.'});
    const product=await sql`SELECT id FROM public.products WHERE id=${productId} AND tenant_id=${shops[0].id} AND is_active=true LIMIT 1`;if(!product.length)return send(res,404,{error:'Product not found.'});
    const rows=await sql`SELECT id,rating,review_body,customer_name,created_at FROM public.product_reviews WHERE tenant_id=${shops[0].id} AND product_id=${productId} AND status='published' ORDER BY created_at DESC LIMIT 100`;
    const summary=await sql`SELECT COALESCE(AVG(rating),0)::numeric(3,2) AS average,COUNT(*)::int AS count FROM public.product_reviews WHERE tenant_id=${shops[0].id} AND product_id=${productId} AND status='published'`;
    return send(res,200,{reviews:rows.map((r:any)=>({id:r.id,rating:r.rating,body:r.review_body,customerName:r.customer_name,createdAt:r.created_at})),summary:{average:Number(summary[0]?.average||0),count:Number(summary[0]?.count||0)}});
   }
   if(req.method==='POST'&&action==='product-reviews'){
    const b=req.body||{},slug=String(b.slug||'').toLowerCase(),productId=String(b.productId||''),chatToken=String(b.chatToken||''),orderId=String(b.orderId||''),rating=Math.max(1,Math.min(5,Math.floor(Number(b.rating)||0))),body=String(b.body||'').trim().slice(0,1200);
     if(!slug||!productId||(!chatToken&&!orderId)||rating<1||body.length<8)return send(res,400,{error:'A valid order, rating and review of at least 8 characters are required.'});
     const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;if(!shops.length)return send(res,404,{error:'Shop not found.'});
     let verified:any[]=[];
     if(chatToken){verified=await sql`SELECT o.id,o.customer_name FROM public.orders o JOIN public.order_items oi ON oi.order_id=o.id AND oi.tenant_id=o.tenant_id JOIN public.payments p ON p.order_id=o.id AND p.tenant_id=o.tenant_id WHERE o.tenant_id=${shops[0].id} AND o.customer_chat_token_hash=${hash(chatToken)} AND oi.product_id=${productId} AND p.status='succeeded' AND o.delivery_status='delivered' LIMIT 1`;}
     else{const customer=await buyerSession(sql,req,shops[0].id);if(!customer)return send(res,401,{error:'Sign in to submit a verified review.'});verified=await sql`SELECT o.id,o.customer_name FROM public.orders o JOIN public.order_items oi ON oi.order_id=o.id AND oi.tenant_id=o.tenant_id JOIN public.payments p ON p.order_id=o.id AND p.tenant_id=o.tenant_id WHERE o.id=${orderId} AND o.tenant_id=${shops[0].id} AND o.customer_phone=${customer.phone} AND oi.product_id=${productId} AND p.status='succeeded' AND o.delivery_status='delivered' LIMIT 1`;}
     if(!verified.length)return send(res,403,{error:'A completed, paid purchase of this product is required before reviewing it.'});
    await sql`INSERT INTO public.product_reviews(tenant_id,product_id,order_id,customer_name,rating,review_body,status) VALUES(${shops[0].id},${productId},${verified[0].id},${String(verified[0].customer_name||'Verified buyer').slice(0,100)},${rating},${body},'published') ON CONFLICT(order_id,product_id) DO UPDATE SET rating=EXCLUDED.rating,review_body=EXCLUDED.review_body,updated_at=now()`;
    const rows=await sql`SELECT id,rating,review_body,customer_name,created_at FROM public.product_reviews WHERE tenant_id=${shops[0].id} AND product_id=${productId} AND status='published' ORDER BY created_at DESC LIMIT 100`;
    const summary=await sql`SELECT COALESCE(AVG(rating),0)::numeric(3,2) AS average,COUNT(*)::int AS count FROM public.product_reviews WHERE tenant_id=${shops[0].id} AND product_id=${productId} AND status='published'`;
    return send(res,200,{reviews:rows.map((r:any)=>({id:r.id,rating:r.rating,body:r.review_body,customerName:r.customer_name,createdAt:r.created_at})),summary:{average:Number(summary[0]?.average||0),count:Number(summary[0]?.count||0)}});
   }
   if(!me && action!=='order')return send(res,401,{error:'Please sign in to access your seller workspace.'});
  if(req.method==='POST'&&action==='order'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase(),items=Array.isArray(b.items)?b.items:[],idempotency=String(b.idempotencyKey||'').slice(0,100),requestedMethod=String(b.paymentMethod||'').toLowerCase(),deliveryMethod=String(b.deliveryMethod||'home'),deliveryCounty=String(b.deliveryCounty||'').trim().slice(0,80),deliverySubCounty=String(b.deliverySubCounty||'').trim().slice(0,100),deliveryEstate=String(b.deliveryEstate||'').trim().slice(0,160),deliveryAddress=String(b.deliveryAddress||'').trim().slice(0,300),deliveryDirections=String(b.deliveryDirections||'').trim().slice(0,500),pickupStation=String(b.pickupStation||'').trim().slice(0,200);
   const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
    const buyer=await buyerSession(sql,req,shops[0].id);if(!buyer)return send(res,401,{error:'Sign in to this shop before checkout.'});
   const name=String(buyer.full_name||'').trim().slice(0,120),phone=normalizePhone(buyer.phone),paymentPhone=normalizePhone(b.paymentPhone||buyer.phone),customerEmail=String(buyer.email||'').trim().slice(0,254);
   if(!name||!phone||!paymentPhone||!items.length||items.length>30)return send(res,400,{error:'Your buyer account or payment phone is invalid, or the cart is empty.'});
   if(!['home','pickup'].includes(deliveryMethod))return send(res,400,{error:'Choose a valid delivery method.'});
   if(deliveryMethod==='home'&&(!deliveryCounty||!deliverySubCounty||!deliveryEstate||!deliveryAddress))return send(res,400,{error:'Complete county, sub-county, estate/area and physical delivery address.'});
   if(deliveryMethod==='pickup'&&(!pickupStation||!deliveryCounty||!deliverySubCounty||!deliveryEstate||!deliveryAddress))return send(res,400,{error:'Complete the pickup county, sub-county, estate, collection point and physical address.'});
   const tenantId=shops[0].id,ids=items.map((x:any)=>String(x.id||'')).filter(Boolean);
   const ps=await sql`SELECT id,name,price_minor,stock_quantity FROM public.products WHERE tenant_id=${tenantId} AND is_active=true AND id=ANY(${ids}::uuid[])`;
   if(ps.length!==new Set(ids).size)return send(res,400,{error:'One or more products are no longer available.'});
   let total=0;const lines=ps.map((p:any)=>{const qty=Math.max(1,Math.min(99,Math.floor(Number(items.find((x:any)=>x.id===p.id)?.quantity)||1)));if(p.stock_quantity!==null&&p.stock_quantity<qty)throw Error('OUT_OF_STOCK');const line=Number(p.price_minor)*qty;total+=line;return {p,qty,line};});
   if(total<=0)return send(res,400,{error:'Order total must be greater than zero.'});
   const couponCode=String(b.couponCode||'').trim().toUpperCase();let discountMinor=0;
   if(couponCode){const coupons=await sql`SELECT id,discount_type,discount_value,minimum_order_minor,max_uses,used_count FROM public.store_coupons WHERE tenant_id=${tenantId} AND code=${couponCode} AND is_active=true AND (starts_at IS NULL OR starts_at<=now()) AND (expires_at IS NULL OR expires_at>now()) LIMIT 1`;if(!coupons.length)return send(res,400,{error:'This coupon is invalid, expired or inactive.'});const cp=coupons[0];if(Number(cp.max_uses||0)>0&&Number(cp.used_count)>=Number(cp.max_uses))return send(res,400,{error:'This coupon has reached its redemption limit.'});if(total<Number(cp.minimum_order_minor||0))return send(res,400,{error:'Your order does not meet this coupon’s minimum spend.'});discountMinor=cp.discount_type==='percentage'?Math.round(total*Number(cp.discount_value)/100):Math.round(Number(cp.discount_value)*100);discountMinor=Math.max(0,Math.min(total,discountMinor));}
   const payableTotal=total-discountMinor;
   const configs=await sql`SELECT pc.*,pt.shortcode AS central_till_shortcode,pt.environment AS central_till_environment,pt.encrypted_credentials AS central_till_credentials,pb.shortcode AS central_paybill_shortcode,pb.environment AS central_paybill_environment,pb.encrypted_credentials AS central_paybill_credentials FROM public.tenants t LEFT JOIN public.payment_configs pc ON pc.tenant_id=t.id LEFT JOIN public.platform_payment_methods pt ON pt.method='till' LEFT JOIN public.platform_payment_methods pb ON pb.method='paybill' WHERE t.id=${tenantId} LIMIT 1`;
   const cfg=configs[0]||{},key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');let payment:any=null;
   const method=requestedMethod==='paybill'?'paybill':requestedMethod==='till'?'till':((cfg.default_payout_method||cfg.payout_method||'till')==='paybill'?'paybill':'till');
   try{
    if(method==='till'&&!((cfg.till_party_b)||(cfg.payout_method==='till'&&cfg.party_b)))return send(res,409,{error:'A Till / Buy Goods destination is not configured for this seller.'});
    if(method==='paybill'&&!((cfg.paybill_party_b)||(cfg.payout_method==='paybill'&&cfg.party_b)))return send(res,409,{error:'A PayBill destination is not configured for this seller.'});
    if(method==='paybill'&&!cfg.account_reference)return send(res,409,{error:'A PayBill account/reference is required before requesting payment.'});
    const sellerBundle=cfg.encrypted_credentials?.ciphertext?decryptBundle(cfg.encrypted_credentials,key,'seller'):null;
    const sellerCredentials=sellerBundle?.credentialsByType?.[method]||(sellerBundle?.consumerKey?{...sellerBundle,shortcode:cfg.shortcode,environment:cfg.environment}:null);
    const centralBlob=method==='paybill'?cfg.central_paybill_credentials:cfg.central_till_credentials;
    if(sellerCredentials?.consumerKey&&sellerCredentials?.consumerSecret&&sellerCredentials?.passkey){
     payment={...sellerCredentials,partyB:method==='paybill'?(cfg.paybill_party_b||((cfg.payout_method||cfg.default_payout_method)==='paybill'?cfg.party_b:'')):(cfg.till_party_b||((cfg.payout_method||cfg.default_payout_method)==='till'?cfg.party_b:'')),accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};
    }else if(centralBlob?.data){
     const central=decryptBundle(centralBlob,key,'platform');
     payment={...central,shortcode:method==='paybill'?cfg.central_paybill_shortcode:cfg.central_till_shortcode,partyB:method==='paybill'?(cfg.paybill_party_b||((cfg.payout_method||cfg.default_payout_method)==='paybill'?cfg.party_b:'')):(cfg.till_party_b||((cfg.payout_method||cfg.default_payout_method)==='till'?cfg.party_b:'')),environment:method==='paybill'?cfg.central_paybill_environment:cfg.central_till_environment,accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};
    }
   }catch(e:any){console.error('Daraja credential load failed',e?.message||e);return send(res,503,{error:'Payment credentials could not be loaded securely. Contact the shop owner.'});}
   if(!payment?.consumerKey||!payment?.consumerSecret||!payment?.passkey||!payment?.shortcode||!payment?.partyB)return send(res,503,{error:'This shop has not completed M-PESA payment setup yet.'});
   if(payment.environment!=='production')return send(res,503,{error:'This shop is configured for Daraja sandbox. Live checkout is disabled.'});
   const orderNo='DAS-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();
   const o=await sql`INSERT INTO public.orders(tenant_id,order_number,customer_name,customer_phone,customer_email,delivery_method,delivery_county,delivery_sub_county,delivery_estate,delivery_address,delivery_directions,pickup_station,subtotal_minor,total_minor,coupon_code,discount_minor,status) VALUES(${tenantId},${orderNo},${name},${phone},${customerEmail||null},${deliveryMethod},${deliveryCounty||null},${deliverySubCounty||null},${deliveryEstate||null},${deliveryAddress||null},${deliveryDirections||null},${pickupStation||null},${total},${total-discountMinor},${couponCode||null},${discountMinor},'pending') RETURNING id,order_number`;
   const customerChatToken=crypto.randomBytes(32).toString('hex');await sql`UPDATE public.orders SET customer_chat_token_hash=${hash(customerChatToken)} WHERE id=${o[0].id} AND tenant_id=${tenantId}`;
   for(const l of lines){await sql`INSERT INTO public.order_items(tenant_id,order_id,product_id,product_name,quantity,unit_price_minor,line_total_minor) VALUES(${tenantId},${o[0].id},${l.p.id},${l.p.name},${l.qty},${Number(l.p.price_minor)},${l.line})`;}
   const idem=idempotency||crypto.randomUUID();
   const p=await sql`INSERT INTO public.payments(tenant_id,order_id,provider,phone,amount_minor,currency,status,idempotency_key,provider_result) VALUES(${tenantId},${o[0].id},'mpesa_daraja',${paymentPhone},${payableTotal},'KES','initiated',${idem},${JSON.stringify({paymentMethod:method})}::jsonb) RETURNING id`;
   try{
    const callbackUrl=env('DASNET_DARAJA_CALLBACK_URL')||(env('DASNET_PUBLIC_URL')||('https://'+(env('VERCEL_URL')||'dasmarket.co.ke'))).replace(/\/$/,'')+'/api/payments?action=daraja-callback';
    const stk=await startStk(payment,o[0],paymentPhone,payableTotal/100,payment.accountType==='CustomerPayBillOnline'?(cfg.account_reference||''):orderNo.slice(-12),callbackUrl);
    await sql`UPDATE public.payments SET provider_checkout_id=${stk.checkoutId},status='pending',provider_result=${JSON.stringify({paymentMethod:method,source:'buyer_checkout',merchantRequestId:stk.merchantRequestId,response:stk.response})}::jsonb,updated_at=now() WHERE id=${p[0].id}`;
    return send(res,201,{ok:true,orderId:o[0].id,orderNumber:o[0].order_number,paymentStatus:'pending',checkoutRequestId:stk.checkoutId,chatToken:customerChatToken,subtotal:total/100,discount:discountMinor/100,total:(total-discountMinor)/100,couponCode:couponCode||null,message:'M-PESA prompt sent. Enter your PIN on your phone to complete payment.'});
   }catch(e:any){
    await sql`UPDATE public.payments SET status='failed',provider_result=${JSON.stringify({paymentMethod:method,source:'buyer_checkout',error:String(e?.message||'STK request failed')})}::jsonb,updated_at=now() WHERE id=${p[0].id}`;
    console.error('Daraja STK initiation failed',e?.message||e);
    return send(res,502,{error:e?.message||'Could not start M-PESA payment. No payment was confirmed.',orderNumber:o[0].order_number,chatToken:customerChatToken});
   }
  }
  if(!me)return send(res,401,{error:'Sign in to manage your shop.'});

  if(req.method==='GET'&&action==='store-settings'){
   const rows=await sql`SELECT contact_phone,contact_email,terms_and_conditions,privacy_policy,return_policy,delivery_policy,storefront_faqs FROM public.sites WHERE tenant_id=${me.tenant_id} LIMIT 1`,r=rows[0]||{};
   return send(res,200,{settings:{contactPhone:r.contact_phone||'',contactEmail:r.contact_email||'',termsAndConditions:r.terms_and_conditions||'',privacyPolicy:r.privacy_policy||'',returnPolicy:r.return_policy||'',deliveryPolicy:r.delivery_policy||'',faqs:Array.isArray(r.storefront_faqs)?r.storefront_faqs:[]}});
  }
  if(req.method==='POST'&&action==='store-settings'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can update buyer-facing shop policies.'});
   const b=req.body||{},phoneRaw=String(b.contactPhone||'').trim(),contactPhone=phoneRaw?normalizePhone(phoneRaw):'',email=String(b.contactEmail||'').trim().toLowerCase().slice(0,254);
   const terms=String(b.termsAndConditions||'').trim().slice(0,20000),privacy=String(b.privacyPolicy||'').trim().slice(0,20000),returns=String(b.returnPolicy||'').trim().slice(0,12000),delivery=String(b.deliveryPolicy||'').trim().slice(0,12000),faqs=Array.isArray(b.faqs)?b.faqs.slice(0,30).map((x:any)=>({question:String(x?.question||'').trim().slice(0,240),answer:String(x?.answer||'').trim().slice(0,2000)})).filter((x:any)=>x.question.length>=3&&x.answer.length>=3):[];
   if(phoneRaw&&!contactPhone)return send(res,400,{error:'Enter a valid Kenyan customer support phone number.'});
   if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))return send(res,400,{error:'Enter a valid support email address.'});
   await sql`UPDATE public.sites SET contact_phone=${contactPhone||null},contact_email=${email||null},terms_and_conditions=${terms},privacy_policy=${privacy},return_policy=${returns},delivery_policy=${delivery},storefront_faqs=${JSON.stringify(faqs)}::jsonb,updated_at=now() WHERE tenant_id=${me.tenant_id}`;
   await audit(sql,me.tenant_id,me.user_id,'shop.buyer_policies.updated','shop',me.tenant_id,{termsPublished:!!terms,privacyPublished:!!privacy,returnsPublished:!!returns,deliveryPublished:!!delivery,faqCount:faqs.length});
   return send(res,200,{ok:true});
  }
  if(req.method==='GET'&&action==='coupons'){
   const rows=await sql`SELECT id,code,discount_type,discount_value,minimum_order_minor,max_uses,used_count,starts_at,expires_at,is_active,created_at FROM public.store_coupons WHERE tenant_id=${me.tenant_id} ORDER BY created_at DESC LIMIT 200`;
   return send(res,200,{coupons:rows});
  }
  if(req.method==='POST'&&action==='coupon'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to manage coupons.'});
   const b=req.body||{},id=String(b.id||''),active=typeof b.isActive==='boolean'?b.isActive:null;
   if(id&&active!==null){const r=await sql`UPDATE public.store_coupons SET is_active=${active},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id,code,discount_type,discount_value,minimum_order_minor,max_uses,used_count,starts_at,expires_at,is_active,created_at`;return r.length?send(res,200,{coupon:r[0]}):send(res,404,{error:'Coupon not found.'});}
   const code=String(b.code||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,32),type=b.discountType==='fixed'?'fixed':'percentage',value=Number(b.discountValue),minimum=Number(b.minimumOrder||0),maxUses=b.maxUses===''||b.maxUses==null?null:Number(b.maxUses),expires=b.expiresAt?new Date(String(b.expiresAt)+'T23:59:59.000Z'):null;
   if(!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code))return send(res,400,{error:'Coupon code must be 3–32 letters or numbers.'});
   if(!Number.isFinite(value)||value<=0||(type==='percentage'&&value>100)||value>10000000)return send(res,400,{error:'Enter a valid discount value.'});
   if(!Number.isFinite(minimum)||minimum<0||minimum>100000000)return send(res,400,{error:'Enter a valid minimum order amount.'});
   if(maxUses!==null&&(!Number.isInteger(maxUses)||maxUses<1||maxUses>10000000))return send(res,400,{error:'Maximum redemptions must be a positive whole number.'});
   if(expires&&Number.isNaN(expires.getTime()))return send(res,400,{error:'Enter a valid expiry date.'});
   const rows=await sql`INSERT INTO public.store_coupons(tenant_id,code,discount_type,discount_value,minimum_order_minor,max_uses,expires_at) VALUES(${me.tenant_id},${code},${type},${value},${Math.round(minimum*100)},${maxUses},${expires?expires.toISOString():null}) ON CONFLICT(tenant_id,code) DO UPDATE SET discount_type=EXCLUDED.discount_type,discount_value=EXCLUDED.discount_value,minimum_order_minor=EXCLUDED.minimum_order_minor,max_uses=EXCLUDED.max_uses,expires_at=EXCLUDED.expires_at,is_active=true,updated_at=now() RETURNING id,code,discount_type,discount_value,minimum_order_minor,max_uses,used_count,starts_at,expires_at,is_active,created_at`;
   await audit(sql,me.tenant_id,me.user_id,'shop.coupon.saved','coupon',rows[0].id,{code,type,value});
   return send(res,200,{coupon:rows[0]});
  }
  if(req.method==='DELETE'&&action==='coupon'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to delete coupons.'});
   const id=String(req.query?.id||''),r=await sql`DELETE FROM public.store_coupons WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Coupon not found.'});
  }
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
   const name=String(req.body?.name||'').trim().slice(0,100),description=String(req.body?.description||'').trim().slice(0,1000),logo=String(req.body?.logoUrl||'').trim(),whatsappRaw=String(req.body?.whatsappNumber||'').trim(),whatsapp=whatsappRaw?normalizePhone(whatsappRaw):'',theme=String(req.body?.theme||'#e47a13').trim().toLowerCase();
   if(!name)return send(res,400,{error:'Shop name is required.'});
   if(!/^#[0-9a-f]{6}$/i.test(theme))return send(res,400,{error:'Choose a valid six-digit theme colour.'});
   if(whatsappRaw&&!whatsapp)return send(res,400,{error:'Enter a valid Kenyan mobile number, e.g. 0712345678 or +254712345678.'});
   if(logo.length>1500000)return send(res,400,{error:'Store logo is too large.'});
   if(logo&&!/^https:\/\//.test(logo)&&!/^data:image\/(png|jpeg|webp);base64,/.test(logo))return send(res,400,{error:'Use a PNG, JPEG or WebP store logo.'});
   await sql`UPDATE public.tenants SET name=${name},updated_at=now() WHERE id=${me.tenant_id}`;
   await sql`UPDATE public.sites SET title=${name},description=${description},logo_url=${logo||null},whatsapp_number=${whatsapp||null},storefront_theme=${theme},updated_at=now() WHERE tenant_id=${me.tenant_id}`;
   await audit(sql,me.tenant_id,me.user_id,'shop.settings.updated','shop',me.tenant_id,{name});
   return send(res,200,{ok:true});
  }
  if(req.method==='GET'&&action==='products'){
   const ps=await sql`SELECT id,name,description,product_type,price_minor,currency,stock_quantity,is_active,sku,images,metadata FROM public.products WHERE tenant_id=${me.tenant_id} ORDER BY created_at DESC`;
   const site=await sql`SELECT logo_url,whatsapp_number,storefront_theme FROM public.sites WHERE tenant_id=${me.tenant_id} LIMIT 1`;
   return send(res,200,{shop:{name:me.shop_name,slug:me.slug,description:me.shop_description||'',logoUrl:site[0]?.logo_url||'',whatsappNumber:site[0]?.whatsapp_number||'',theme:/^#[0-9a-f]{6}$/i.test(String(site[0]?.storefront_theme||''))?site[0].storefront_theme:'#e47a13'},products:ps.map((p:any)=>productOut(p,true))});
  }
  if(req.method==='GET'&&action==='orders'){
   const os=await sql`SELECT o.id,o.order_number,o.customer_name,o.customer_phone,o.total_minor,o.currency,o.status,o.delivery_method,o.delivery_county,o.delivery_sub_county,o.delivery_estate,o.delivery_address,o.delivery_directions,o.pickup_station,o.delivery_status,o.delivery_updated_at,o.created_at,pay.status AS payment_status,pay.provider_receipt,pay.payment_message,COALESCE(json_agg(json_build_object('name',i.product_name,'quantity',i.quantity,'unitPrice',i.unit_price_minor,'lineTotal',i.line_total_minor)) FILTER (WHERE i.id IS NOT NULL),'[]'::json) AS items FROM public.orders o LEFT JOIN public.order_items i ON i.tenant_id=o.tenant_id AND i.order_id=o.id LEFT JOIN LATERAL (SELECT p.status,p.provider_receipt,COALESCE(p.provider_result->>'inventoryIssue',p.provider_result->>'error',p.provider_result->'callback'->'ResultDesc'->>0,p.provider_result->'callback'->'Body'->'stkCallback'->>'ResultDesc') AS payment_message FROM public.payments p WHERE p.tenant_id=o.tenant_id AND p.order_id=o.id ORDER BY p.created_at DESC LIMIT 1) pay ON true WHERE o.tenant_id=${me.tenant_id} GROUP BY o.id,pay.status,pay.provider_receipt,pay.payment_message ORDER BY o.created_at DESC LIMIT 100`;
   return send(res,200,{orders:os.map((o:any)=>({...o,total:Number(o.total_minor)/100,items:o.items}))});
  }
  if(req.method==='POST'&&action==='product-image-upload'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to upload product images.'});
   const b=req.body||{},name=String(b.fileName||''),mime=String(b.contentType||''),size=Number(b.size||0),ext=(name.split('.').pop()||'').toLowerCase(),allowed=fileTypes[ext];
   if(!allowed||!['image/jpeg','image/png','image/webp'].includes(mime)||allowed.mime!==mime)return send(res,415,{error:'Use JPG, PNG or WebP product images.'});
   if(!Number.isSafeInteger(size)||size<1||size>5242880)return send(res,413,{error:'Each product image must be 5 MB or smaller.'});
   const imageKey=me.tenant_id+'/products/'+crypto.randomUUID()+'-'+safeFileName(name);
   return send(res,200,{ok:true,imageKey,uploadUrl:storageUrl(imageKey,'PUT',mime),expiresIn:300});
  }
  if(req.method==='POST'&&action==='products-bulk'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to import products.'});
   const rows=Array.isArray(req.body?.products)?req.body.products:[];if(!rows.length||rows.length>500)return send(res,400,{error:'Import between 1 and 500 products.'});
   const clean:any[]=[];for(let i=0;i<rows.length;i++){const r=rows[i]||{},name=String(r.name||'').trim().slice(0,120),price=Number(r.price),description=String(r.description||'').trim().slice(0,2000),type=['physical','data_bundle','digital'].includes(String(r.type||'').toLowerCase())?String(r.type).toLowerCase():'physical',stock=r.stock===null||r.stock===''?null:Number(r.stock),sku=String(r.sku||'').trim().slice(0,80)||null,image=String(r.image||'').trim(),imageKey=String(r.imageKey||'').trim();if(!name||!Number.isFinite(price)||price<0||price>100000000||(stock!==null&&(!Number.isInteger(stock)||stock<0)))return send(res,400,{error:'Invalid product on CSV row '+String(r.row||i+2)});if(image&&(!/^https:\/\//i.test(image)||image.length>2000))return send(res,400,{error:'Invalid HTTPS image URL on CSV row '+String(r.row||i+2)});if(imageKey&&!imageKey.startsWith(me.tenant_id+'/products/'))return send(res,400,{error:'Invalid uploaded image on CSV row '+String(r.row||i+2)});clean.push({name,price,description,type,stock,sku,images:imageKey?['neon-object:'+imageKey]:image?[image]:[]});}
   for(const p of clean){await sql`INSERT INTO public.products(tenant_id,name,slug,description,product_type,price_minor,stock_quantity,sku,images,metadata) VALUES(${me.tenant_id},${p.name},${slugify(p.name)+'-'+crypto.randomBytes(4).toString('hex')},${p.description},${p.type},${Math.round(p.price*100)},${p.stock},${p.sku},${JSON.stringify(p.images)}::jsonb,'{}'::jsonb)`;}
   await audit(sql,me.tenant_id,me.user_id,'products.bulk_imported','product',null,{count:clean.length});return send(res,201,{ok:true,imported:clean.length,message:clean.length+' products imported successfully.'});
  }
  if(req.method==='POST'&&action==='product'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to edit products.'});
   const b=req.body||{},name=String(b.name||'').trim().slice(0,120),description=String(b.description||'').trim().slice(0,2000),type=['physical','data_bundle','digital'].includes(b.type)?b.type:'physical',price=Number(b.price),stock=b.stock===''||b.stock==null?null:Number(b.stock),sku=String(b.sku||'').trim().slice(0,80)||null,rawMeta=b.metadata&&typeof b.metadata==='object'?b.metadata:{};
   const purchaseCost=rawMeta.purchaseCost===''||rawMeta.purchaseCost==null?null:Number(rawMeta.purchaseCost),taxRate=rawMeta.taxRate===''||rawMeta.taxRate==null?null:Number(rawMeta.taxRate),reorderLevel=rawMeta.reorderLevel===''||rawMeta.reorderLevel==null?null:Number(rawMeta.reorderLevel);
   if(!name||!Number.isFinite(price)||price<0||price>100000000||(stock!==null&&(!Number.isInteger(stock)||stock<0))||(purchaseCost!==null&&(!Number.isFinite(purchaseCost)||purchaseCost<0||purchaseCost>100000000))||(taxRate!==null&&(!Number.isFinite(taxRate)||taxRate<0||taxRate>100))||(reorderLevel!==null&&(!Number.isInteger(reorderLevel)||reorderLevel<0)))return send(res,400,{error:'Enter valid product name, price, stock, purchase cost, tax rate and reorder level.'});
   const metadata={category:String(rawMeta.category||'').trim().slice(0,100),spotlight:Boolean(rawMeta.spotlight),itemType:String(rawMeta.itemType||'').trim().slice(0,60),unitOfMeasure:String(rawMeta.unitOfMeasure||'').trim().slice(0,40),purchaseCost,taxRate,reorderLevel,preferredVendor:String(rawMeta.preferredVendor||'').trim().slice(0,120),salesAccount:String(rawMeta.salesAccount||'').trim().slice(0,80),purchaseAccount:String(rawMeta.purchaseAccount||'').trim().slice(0,80),inventoryAccount:String(rawMeta.inventoryAccount||'').trim().slice(0,80),tags:String(rawMeta.tags||'').trim().slice(0,250)};
   const images=Array.isArray(b.images)?b.images.filter((x:any)=>typeof x==='string'&&x.length<=1600000).slice(0,5):[];
   if(images.some((x:string)=>!/^https:\/\//.test(x)&&!/^data:image\/(png|jpeg|webp);base64,/.test(x)))return send(res,400,{error:'Product images must be HTTPS URLs or PNG, JPEG or WebP image files.'});
   const id=String(b.id||'');
   if(metadata.spotlight){const featured=await sql`SELECT count(*)::int AS total FROM public.products WHERE tenant_id=${me.tenant_id} AND metadata->>'spotlight'='true' AND id<>${id||'00000000-0000-0000-0000-000000000000'}`;if(Number(featured[0]?.total||0)>=5)return send(res,400,{error:'You can feature up to five products in your storefront hero. Remove another featured product first.'});}
   if(id){
    const updated=await sql`UPDATE public.products SET name=${name},slug=${slugify(name)+'-'+id.slice(0,8)},description=${description},product_type=${type},price_minor=${Math.round(price*100)},stock_quantity=${stock},sku=${sku},images=${JSON.stringify(images)}::jsonb,metadata=${JSON.stringify(metadata)}::jsonb,updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
    if(!updated.length)return send(res,404,{error:'Product not found.'});
    await audit(sql,me.tenant_id,me.user_id,'product.updated','product',id,{name,type,price});
    return send(res,200,{ok:true});
   }
   const inserted=await sql`INSERT INTO public.products(tenant_id,name,slug,description,product_type,price_minor,stock_quantity,sku,images,metadata) VALUES(${me.tenant_id},${name},${slugify(name)+'-'+crypto.randomBytes(4).toString('hex')},${description},${type},${Math.round(price*100)},${stock},${sku},${JSON.stringify(images)}::jsonb,${JSON.stringify(metadata)}::jsonb) RETURNING id`;
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
  if(req.method==='POST'&&action==='order-prompt'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to request customer payments.'});
   const orderId=String(req.body?.orderId||''),phone=normalizePhone(req.body?.phone),requestedMethod=String(req.body?.paymentMethod||'').toLowerCase();
   if(!orderId||!phone)return send(res,400,{error:'Enter a valid customer phone number.'});
   const found=await sql`SELECT id,order_number,total_minor,status FROM public.orders WHERE id=${orderId} AND tenant_id=${me.tenant_id} LIMIT 1`;
   if(!found.length)return send(res,404,{error:'Order not found.'});
   const order=found[0];
   if(['cancelled','refunded'].includes(String(order.status)))return send(res,409,{error:'A payment prompt cannot be sent for a cancelled or refunded order.'});
   const prior=await sql`SELECT status FROM public.payments WHERE tenant_id=${me.tenant_id} AND order_id=${order.id} ORDER BY created_at DESC LIMIT 1`;
   if(prior[0]?.status==='succeeded')return send(res,409,{error:'This order is already paid. No new prompt was sent.'});if(['initiated','pending'].includes(String(prior[0]?.status||'')))return send(res,409,{error:'A payment request is already awaiting a result for this order. Wait for it to complete or fail before sending another prompt.'});
   const configs=await sql`SELECT pc.*,pt.shortcode AS central_till_shortcode,pt.environment AS central_till_environment,pt.encrypted_credentials AS central_till_credentials,pb.shortcode AS central_paybill_shortcode,pb.environment AS central_paybill_environment,pb.encrypted_credentials AS central_paybill_credentials FROM public.tenants t LEFT JOIN public.payment_configs pc ON pc.tenant_id=t.id LEFT JOIN public.platform_payment_methods pt ON pt.method='till' LEFT JOIN public.platform_payment_methods pb ON pb.method='paybill' WHERE t.id=${me.tenant_id} LIMIT 1`;
   const cfg=configs[0]||{},key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');let payment:any=null;
   const method=requestedMethod==='paybill'?'paybill':requestedMethod==='till'?'till':((cfg.default_payout_method||cfg.payout_method||'till')==='paybill'?'paybill':'till');
   if(method==='till'&&!((cfg.till_party_b)||(cfg.payout_method==='till'&&cfg.party_b)))return send(res,409,{error:'A Till / Buy Goods destination is not configured for this seller.'});
   if(method==='paybill'&&!((cfg.paybill_party_b)||(cfg.payout_method==='paybill'&&cfg.party_b)))return send(res,409,{error:'A PayBill destination is not configured for this seller.'});
   if(method==='paybill'&&!cfg.account_reference)return send(res,409,{error:'A PayBill account/reference is required before requesting payment.'});
   try{
    if(cfg.encrypted_credentials?.ciphertext){const bundle=decryptBundle(cfg.encrypted_credentials,key,'seller'),sec=bundle.credentialsByType?.[method]||{...bundle,shortcode:cfg.shortcode,environment:cfg.environment};payment={...sec,partyB:method==='paybill'?(cfg.paybill_party_b||((cfg.payout_method||cfg.default_payout_method)==='paybill'?cfg.party_b:'')):(cfg.till_party_b||((cfg.payout_method||cfg.default_payout_method)==='till'?cfg.party_b:'')),accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};}
    else {const centralBlob=method==='paybill'?cfg.central_paybill_credentials:cfg.central_till_credentials;if(centralBlob?.data){const sec=decryptBundle(centralBlob,key,'platform');payment={...sec,shortcode:method==='paybill'?cfg.central_paybill_shortcode:cfg.central_till_shortcode,partyB:method==='paybill'?cfg.paybill_party_b:cfg.till_party_b,environment:method==='paybill'?cfg.central_paybill_environment:cfg.central_till_environment,accountType:method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline'};}}
   }catch(e:any){console.error('Order payment prompt credentials failed',e?.message||e);return send(res,503,{error:'Payment credentials could not be loaded securely.'});}
   if(!payment?.consumerKey||!payment?.consumerSecret||!payment?.passkey||!payment?.shortcode||!payment?.partyB)return send(res,503,{error:'Complete the matching Daraja credentials and payout destination before requesting payment.'});
   if(payment.environment!=='production')return send(res,503,{error:'The selected Daraja credentials are in sandbox. Live payment prompts are disabled.'});
   const amount=Number(order.total_minor);if(!Number.isSafeInteger(amount)||amount<1)return send(res,400,{error:'This order has an invalid total.'});
   const idempotency=crypto.randomUUID();
   const p=await sql`INSERT INTO public.payments(tenant_id,order_id,provider,phone,amount_minor,currency,status,idempotency_key,provider_result) VALUES(${me.tenant_id},${order.id},'mpesa_daraja',${phone},${amount},'KES','initiated',${idempotency},${JSON.stringify({paymentMethod:method,source:'merchant_order_prompt'})}::jsonb) RETURNING id`;
   try{
    const callbackUrl=env('DASNET_DARAJA_CALLBACK_URL')||(env('DASNET_PUBLIC_URL')||('https://'+(env('VERCEL_URL')||'dasmarket.co.ke'))).replace(/\/$/,'')+'/api/payments?action=daraja-callback';
    const stk=await startStk(payment,order,phone,amount/100,payment.accountType==='CustomerPayBillOnline'?(cfg.account_reference||''):order.order_number.slice(-12),callbackUrl);
    await sql`UPDATE public.payments SET provider_checkout_id=${stk.checkoutId},status='pending',provider_result=${JSON.stringify({paymentMethod:method,source:'merchant_order_prompt',merchantRequestId:stk.merchantRequestId,response:stk.response})}::jsonb,updated_at=now() WHERE id=${p[0].id}`;
    await audit(sql,me.tenant_id,me.user_id,'order.payment_prompt.sent','order',order.id,{paymentMethod:method,amountMinor:amount});
    return send(res,200,{ok:true,checkoutRequestId:stk.checkoutId,message:'M-PESA prompt sent for KES '+(amount/100).toLocaleString('en-KE')+'. Ask the customer to enter their M-PESA PIN.'});
   }catch(e:any){
    await sql`UPDATE public.payments SET status='failed',provider_result=${JSON.stringify({paymentMethod:method,source:'merchant_order_prompt',error:String(e?.message||'STK request failed')})}::jsonb,updated_at=now() WHERE id=${p[0].id}`;
    console.error('Order STK prompt failed',e?.message||e);return send(res,502,{error:e?.message||'Could not send the M-PESA prompt.'});
   }
  }
  if((req.method==='GET'||req.method==='POST')&&action==='order-chat'){
   if(!['owner','admin','editor','viewer'].includes(me.role))return send(res,403,{error:'You do not have permission to access order conversations.'});
   const b=req.body||{},orderId=String(req.method==='GET'?req.query?.orderId:b.orderId||'');
   if(!orderId)return send(res,400,{error:'Order reference is required.'});
   const found=await sql`SELECT id,order_number FROM public.orders WHERE id=${orderId} AND tenant_id=${me.tenant_id} LIMIT 1`;
   if(!found.length)return send(res,404,{error:'Order not found.'});
   if(req.method==='POST'){
    if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You cannot send messages from this account.'});
    const message=String(b.message||'').trim().slice(0,2000);if(message.length<1)return send(res,400,{error:'Write a message before sending.'});
    const rate=await sql`SELECT count(*)::int AS n FROM public.order_messages WHERE tenant_id=${me.tenant_id} AND order_id=${orderId} AND sender_type='merchant' AND created_at>now()-interval '1 minute'`;
    if(Number(rate[0]?.n||0)>=12)return send(res,429,{error:'Please wait before sending another message.'});
    await sql`INSERT INTO public.order_messages(tenant_id,order_id,sender_type,sender_user_id,message) VALUES(${me.tenant_id},${orderId},'merchant',${me.user_id},${message})`;
    const chatOrder=await sql`SELECT order_number,customer_phone FROM public.orders WHERE id=${orderId} AND tenant_id=${me.tenant_id} LIMIT 1`;if(chatOrder.length)await notifyBuyer(sql,me.tenant_id,chatOrder[0].customer_phone,orderId,'chat_message','New shop message','You received a new message about order '+chatOrder[0].order_number+'.');
    await audit(sql,me.tenant_id,me.user_id,'order.message.sent','order',orderId,{sender:'merchant'});
   }
   const messages=await sql`SELECT id,sender_type,message,created_at FROM public.order_messages WHERE tenant_id=${me.tenant_id} AND order_id=${orderId} ORDER BY created_at ASC LIMIT 100`;
   const attachments=await sql`SELECT id,uploader_type,file_name,content_type,size_bytes,created_at FROM public.order_message_attachments WHERE tenant_id=${me.tenant_id} AND order_id=${orderId} AND upload_status='ready' AND scan_status='clean' ORDER BY created_at ASC LIMIT 100`;return send(res,200,{orderNumber:found[0].order_number,messages,attachments});
  }
  if(req.method==='POST'&&action==='order-status'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission.'});
   const id=String(req.body?.id||''),status=String(req.body?.status||'');
   if(!['pending','confirmed','processing','fulfilled','cancelled'].includes(status))return send(res,400,{error:'Invalid order status.'});
   if(['processing','fulfilled'].includes(status)){
    const payment=await sql`SELECT status,provider_result->>'inventoryIssue' AS inventory_issue FROM public.payments WHERE tenant_id=${me.tenant_id} AND order_id=${id} ORDER BY created_at DESC LIMIT 1`;
    if(payment[0]?.status!=='succeeded')return send(res,409,{error:'Confirm successful payment before processing or fulfilling this order.'});
    if(payment[0]?.inventory_issue)return send(res,409,{error:'Payment was received, but stock could not be reserved. Resolve the inventory issue with the buyer before fulfilment.'});
   }
   const r=await sql`UPDATE public.orders SET status=${status},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   if(r.length){await notifyOrderBuyer(sql,me.tenant_id,id,'order_update','Order status updated','Your order status is now '+status.replaceAll('_',' ')+'.');await audit(sql,me.tenant_id,me.user_id,'order.status.updated','order',id,{status});}
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Order not found.'});
  }
  if(req.method==='POST'&&action==='order-delivery-status'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to update delivery.'});
   const id=String(req.body?.id||''),deliveryStatus=String(req.body?.deliveryStatus||'');
   if(!['pending_delivery','in_transit','delivered'].includes(deliveryStatus))return send(res,400,{error:'Invalid delivery status.'});
   if(['in_transit','delivered'].includes(deliveryStatus)){
    const payment=await sql`SELECT status,provider_result->>'inventoryIssue' AS inventory_issue FROM public.payments WHERE tenant_id=${me.tenant_id} AND order_id=${id} ORDER BY created_at DESC LIMIT 1`;
    if(payment[0]?.status!=='succeeded')return send(res,409,{error:'Successful payment is required before an order can be dispatched or marked delivered.'});
    if(payment[0]?.inventory_issue)return send(res,409,{error:'Payment was received, but stock could not be reserved. Resolve the inventory issue with the buyer before dispatch or delivery.'});
   }
   const r=await sql`UPDATE public.orders SET delivery_status=${deliveryStatus},delivery_updated_at=now(),updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   if(r.length){const title=deliveryStatus==='delivered'?'Order delivered':deliveryStatus==='in_transit'?'Order in transit':'Delivery status updated';await notifyOrderBuyer(sql,me.tenant_id,id,'delivery_update',title,'Your order delivery status is now '+deliveryStatus.replaceAll('_',' ')+'.');await audit(sql,me.tenant_id,me.user_id,'order.delivery.updated','order',id,{deliveryStatus});}
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