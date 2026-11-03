import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';
const env=(k:string)=>(process.env[k]||'').trim();
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const identityHash=(s:string)=>{const key=env('DASNET_IDENTITY_HASH_SECRET');return key?crypto.createHmac('sha256',key).update(s).digest('hex'):hash(s)};
const send=(res:any,status:number,data:any)=>res.status(status).json(data);
function sessionToken(req:any){const c=String(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith('das_session='));try{return c?decodeURIComponent(c.slice(12)):''}catch{return ''}}
function phone(v:string){let p=v.trim().replace(/[^0-9+]/g,'');if(/^0[17]\d{8}$/.test(p))p='254'+p.slice(1);else if(/^\+?254[17]\d{8}$/.test(p))p=p.replace(/^\+/,'');return p}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
 try{
  const allow=env('DAS_PLATFORM_ADMIN_PHONES').split(',').map(phone).filter(Boolean);
  if(!allow.length)return send(res,503,{error:'Platform admin access is not configured.'});
  const token=sessionToken(req);if(!token)return send(res,401,{error:'Sign in required.'});
  const sql=db(),users=await sql`SELECT u.id,u.phone,u.display_name FROM public.users u JOIN public.auth_sessions s ON s.user_id=u.id WHERE s.token_hash=${hash(token)} AND s.expires_at>now() LIMIT 1`;
  if(!users.length||!allow.includes(phone(users[0].phone||'')))return send(res,403,{error:'Platform administrator access required.'});
  if(req.method==='GET'&&String(req.query?.action||'')==='detail'){
   const type=String(req.query?.type||''),id=String(req.query?.id||'');
   if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{error:'Invalid record id.'});
   if(type==='orders'){
    const rows=await sql`SELECT o.*,t.name AS shop_name,t.slug AS shop_slug,COALESCE((SELECT json_agg(json_build_object('id',i.id,'product_id',i.product_id,'name',i.product_name,'quantity',i.quantity,'unit_price_minor',i.unit_price_minor,'line_total_minor',i.line_total_minor) ORDER BY i.created_at) FROM public.order_items i WHERE i.order_id=o.id AND i.tenant_id=o.tenant_id),'[]'::json) AS items,COALESCE((SELECT json_agg(json_build_object('id',p.id,'provider',p.provider,'receipt',p.provider_receipt,'amount_minor',p.amount_minor,'status',p.status,'created_at',p.created_at) ORDER BY p.created_at DESC) FROM public.payments p WHERE p.order_id=o.id AND p.tenant_id=o.tenant_id),'[]'::json) AS payments FROM public.orders o JOIN public.tenants t ON t.id=o.tenant_id WHERE o.id=${id} LIMIT 1`;
    return rows.length?send(res,200,{record:rows[0]}):send(res,404,{error:'Order not found.'});
   }
   if(type==='products'){
    const rows=await sql`SELECT p.*,t.name AS shop_name,t.slug AS shop_slug FROM public.products p JOIN public.tenants t ON t.id=p.tenant_id WHERE p.id=${id} LIMIT 1`;
    return rows.length?send(res,200,{record:rows[0]}):send(res,404,{error:'Product not found.'});
   }
   if(type==='shops'||type==='sellers'){
    const rows=await sql`SELECT t.*,u.display_name AS owner_name,u.phone AS owner_phone,u.email AS owner_email,s.title AS storefront_title,s.description AS storefront_description,s.logo_url,s.contact_phone,s.contact_email,s.whatsapp_number,s.storefront_theme,s.terms_and_conditions,s.privacy_policy,s.return_policy,s.delivery_policy,s.storefront_faqs,COALESCE((SELECT json_agg(json_build_object('hostname',d.hostname,'primary',d.is_primary,'verifiedAt',d.verified_at)) FROM public.domains d WHERE d.tenant_id=t.id),'[]'::json) AS domains,(SELECT count(*)::int FROM public.products p WHERE p.tenant_id=t.id) AS products,(SELECT count(*)::int FROM public.orders o WHERE o.tenant_id=t.id) AS orders FROM public.tenants t LEFT JOIN public.users u ON u.id=t.created_by LEFT JOIN public.sites s ON s.tenant_id=t.id WHERE t.id=${id} LIMIT 1`;
    return rows.length?send(res,200,{record:rows[0]}):send(res,404,{error:'Shop not found.'});
   }
   if(type==='buyers'){
    const rows=await sql`SELECT sc.*,u.display_name AS account_name,u.email AS account_email,u.phone_verified_at AS account_verified_at,t.name AS shop_name,t.slug AS shop_slug,COALESCE((SELECT json_agg(json_build_object('id',o.id,'order_number',o.order_number,'status',o.status,'total_minor',o.total_minor,'created_at',o.created_at) ORDER BY o.created_at DESC) FROM public.orders o WHERE o.tenant_id=sc.tenant_id AND o.customer_phone=sc.phone),'[]'::json) AS orders FROM public.store_customers sc JOIN public.tenants t ON t.id=sc.tenant_id LEFT JOIN public.users u ON u.id=sc.user_id WHERE sc.id=${id} LIMIT 1`;
    return rows.length?send(res,200,{record:rows[0]}):send(res,404,{error:'Buyer not found.'});
   }
   if(type==='transactions'){
    const rows=await sql`SELECT p.*,t.name AS shop_name,t.slug AS shop_slug,o.order_number,o.customer_name,o.customer_phone FROM public.payments p JOIN public.tenants t ON t.id=p.tenant_id LEFT JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id WHERE p.id=${id} LIMIT 1`;
    return rows.length?send(res,200,{record:rows[0]}):send(res,404,{error:'Transaction not found.'});
   }
   if(type==='support'){
    const rows=await sql`SELECT st.*,t.name AS shop_name,t.slug,u.display_name AS requester,u.phone AS requester_phone FROM public.support_tickets st JOIN public.tenants t ON t.id=st.tenant_id LEFT JOIN public.users u ON u.id=st.user_id WHERE st.id=${id} LIMIT 1`;
    return rows.length?send(res,200,{record:rows[0]}):send(res,404,{error:'Ticket not found.'});
   }
   return send(res,400,{error:'Unsupported record type.'});
  }
  if(req.method==='GET'&&String(req.query?.action||'')==='lookup'){
   const type=String(req.query?.type||''),term=String(req.query?.q||'').trim().slice(0,160);
   if(!['case','order','product'].includes(type))return send(res,400,{error:'Choose cases, orders or products.'});
   if(term.length<2)return send(res,400,{error:'Enter at least two characters to search.'});
   const like='%'+term+'%',digits=term.replace(/[^0-9]/g,''),caseTerm=term.replace(/^case\s*#?/i,'').trim(),caseLike='%'+caseTerm+'%';
   if(type==='order'){
    const rows=await sql`SELECT o.id,o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.status,o.delivery_status,o.total_minor,o.currency,o.created_at,t.name AS shop_name,t.slug,COALESCE((SELECT count(*)::int FROM public.order_items i WHERE i.order_id=o.id AND i.tenant_id=o.tenant_id),0) AS item_count FROM public.orders o JOIN public.tenants t ON t.id=o.tenant_id WHERE o.order_number ILIKE ${like} OR o.customer_phone ILIKE ${like} OR o.customer_email ILIKE ${like} OR o.customer_name ILIKE ${like} OR (${digits.length>=5} AND regexp_replace(o.customer_phone,'[^0-9]','','g') ILIKE ${'%'+digits+'%'}) ORDER BY o.created_at DESC LIMIT 30`;
    return send(res,200,{type,records:rows});
   }
   if(type==='product'){
    const rows=await sql`SELECT p.id,p.name,p.slug,p.sku,p.product_type,p.price_minor,p.currency,p.stock_quantity,p.is_active,p.created_at,t.name AS shop_name,t.slug AS shop_slug FROM public.products p JOIN public.tenants t ON t.id=p.tenant_id WHERE p.name ILIKE ${like} OR p.sku ILIKE ${like} OR p.slug ILIKE ${like} OR t.name ILIKE ${like} OR t.slug ILIKE ${like} ORDER BY p.created_at DESC LIMIT 30`;
    return send(res,200,{type,records:rows});
   }
   const rows=await sql`SELECT c.id,c.buyer_name,c.buyer_phone,c.issue_type,c.details,c.payment_made,c.payment_amount_minor,c.payment_reference,c.status,c.admin_notes,c.created_at,c.updated_at,c.product_id,t.id AS tenant_id,t.name AS shop_name,t.slug,t.status AS shop_status,t.ban_reason,t.ban_expires_at,s.contact_phone AS shop_contact_phone,s.contact_email AS shop_contact_email,s.whatsapp_number AS shop_whatsapp,o.id AS order_id,o.order_number,o.status AS order_status,o.delivery_status,o.total_minor AS order_total_minor,o.delivery_method,o.delivery_county,o.delivery_sub_county,o.delivery_estate,o.delivery_address,o.delivery_directions,o.customer_name AS order_buyer_name,o.customer_phone AS order_buyer_phone,o.customer_email AS order_buyer_email,p.name AS product_name,p.slug AS product_slug,sc.full_name AS buyer_full_name,sc.email AS buyer_email,sc.alternative_phone AS buyer_alternative_phone,sc.phone_verified_at AS buyer_phone_verified_at,sc.is_banned AS buyer_is_banned,sc.banned_until AS buyer_banned_until,u.display_name AS seller_name,u.phone AS seller_phone,u.email AS seller_email,COALESCE((SELECT json_agg(json_build_object('id',a.id,'fileName',a.file_name,'contentType',a.content_type,'sizeBytes',a.size_bytes,'scanStatus',a.scan_status)) FROM public.shop_complaint_attachments a WHERE a.complaint_id=c.id AND a.upload_status='ready'),'[]'::json) AS attachments,COALESCE((SELECT json_agg(json_build_object('id',pay.id,'receipt',pay.provider_receipt,'status',pay.status,'amount_minor',pay.amount_minor,'created_at',pay.created_at) ORDER BY pay.created_at DESC) FROM public.payments pay WHERE pay.order_id=o.id AND pay.tenant_id=o.tenant_id),'[]'::json) AS order_payments FROM public.shop_complaints c JOIN public.tenants t ON t.id=c.tenant_id LEFT JOIN public.sites s ON s.tenant_id=t.id LEFT JOIN public.orders o ON o.id=c.order_id AND o.tenant_id=c.tenant_id LEFT JOIN public.products p ON p.id=c.product_id AND p.tenant_id=c.tenant_id LEFT JOIN public.store_customers sc ON sc.tenant_id=c.tenant_id AND right(regexp_replace(sc.phone,'[^0-9]','','g'),9)=right(regexp_replace(c.buyer_phone,'[^0-9]','','g'),9) LEFT JOIN public.users u ON u.id=t.created_by WHERE c.id::text ILIKE ${caseLike} OR c.buyer_phone ILIKE ${like} OR c.buyer_name ILIKE ${like} OR c.details ILIKE ${like} OR o.order_number ILIKE ${like} OR sc.email ILIKE ${like} OR (${digits.length>=5} AND regexp_replace(c.buyer_phone,'[^0-9]','','g') ILIKE ${'%'+digits+'%'}) ORDER BY c.created_at DESC LIMIT 30`;
   return send(res,200,{type,records:rows.map((r:any)=>({...r,paymentAmount:r.payment_amount_minor==null?null:Number(r.payment_amount_minor)/100}))});
  }
  if(req.method==='GET'&&['orders','products','buyers','transactions','shops','support','audit'].includes(String(req.query?.action||''))){
   const action=String(req.query.action);
   if(action==='orders'){
    const rows=await sql`SELECT o.id,o.order_number,o.customer_name,o.customer_phone,o.customer_email,o.status,o.delivery_status,o.total_minor,o.currency,o.created_at,t.name AS shop_name,t.slug,COALESCE((SELECT count(*)::int FROM public.order_items i WHERE i.order_id=o.id AND i.tenant_id=o.tenant_id),0) AS item_count FROM public.orders o JOIN public.tenants t ON t.id=o.tenant_id ORDER BY o.created_at DESC LIMIT 500`;
    return send(res,200,{records:rows});
   }
   if(action==='products'){
    const rows=await sql`SELECT p.id,p.name,p.slug,p.sku,p.product_type,p.price_minor,p.currency,p.stock_quantity,p.is_active,p.created_at,t.name AS shop_name,t.slug AS shop_slug FROM public.products p JOIN public.tenants t ON t.id=p.tenant_id ORDER BY p.created_at DESC LIMIT 500`;
    return send(res,200,{records:rows});
   }
   if(action==='buyers'){
    const rows=await sql`SELECT sc.id,sc.full_name,sc.phone,sc.email,sc.phone_verified_at,sc.created_at,t.name AS shop_name,t.slug AS shop_slug,COALESCE((SELECT count(*)::int FROM public.orders o WHERE o.tenant_id=sc.tenant_id AND o.customer_phone=sc.phone),0) AS order_count FROM public.store_customers sc JOIN public.tenants t ON t.id=sc.tenant_id ORDER BY sc.created_at DESC LIMIT 500`;
    return send(res,200,{records:rows});
   }
   if(action==='transactions'){
    const rows=await sql`SELECT p.id,p.provider,p.provider_checkout_id,p.provider_receipt,p.phone,p.amount_minor,p.currency,p.status,p.verified_at,p.created_at,o.order_number,t.name AS shop_name,t.slug AS shop_slug FROM public.payments p JOIN public.tenants t ON t.id=p.tenant_id LEFT JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id ORDER BY p.created_at DESC LIMIT 500`;
    return send(res,200,{records:rows});
   }
   if(action==='shops'){
    const rows=await sql`SELECT t.id,t.name,t.slug,t.status,t.ban_reason,t.created_at,u.display_name AS owner_name,u.phone AS owner_phone,s.title AS storefront_title,s.contact_phone,s.contact_email,COALESCE((SELECT json_agg(json_build_object('hostname',d.hostname,'primary',d.is_primary,'verifiedAt',d.verified_at)) FROM public.domains d WHERE d.tenant_id=t.id),'[]'::json) AS domains,(SELECT count(*)::int FROM public.products p WHERE p.tenant_id=t.id) AS products,(SELECT count(*)::int FROM public.orders o WHERE o.tenant_id=t.id) AS orders FROM public.tenants t LEFT JOIN public.users u ON u.id=t.created_by LEFT JOIN public.sites s ON s.tenant_id=t.id ORDER BY t.created_at DESC LIMIT 300`;
    return send(res,200,{records:rows});
   }
   if(action==='support'){
    const rows=await sql`SELECT st.id,st.ticket_number,st.subject,st.category,st.priority,st.status,st.message,st.response,st.created_at,st.updated_at,t.name AS shop_name,t.slug,u.display_name AS requester,u.phone AS requester_phone FROM public.support_tickets st JOIN public.tenants t ON t.id=st.tenant_id LEFT JOIN public.users u ON u.id=st.user_id ORDER BY st.created_at DESC LIMIT 500`;
    return send(res,200,{records:rows});
   }
   const rows=await sql`SELECT a.id,a.action,a.resource_type,a.resource_id,a.metadata,a.created_at,u.display_name AS actor_name,u.phone AS actor_phone,t.name AS shop_name FROM public.audit_logs a LEFT JOIN public.users u ON u.id=a.actor_user_id LEFT JOIN public.tenants t ON t.id=a.tenant_id ORDER BY a.created_at DESC LIMIT 500`;
   return send(res,200,{records:rows});
  }
  if(req.method==='GET'&&String(req.query?.action||'')==='complaints'){
   const rows=await sql`SELECT c.id,c.buyer_name,c.buyer_phone,c.issue_type,c.details,c.payment_made,c.payment_amount_minor,c.payment_reference,c.status,c.admin_notes,c.created_at,c.updated_at,c.product_id,t.id AS tenant_id,t.name AS shop_name,t.slug,t.status AS shop_status,t.ban_reason,t.ban_expires_at,s.contact_phone AS shop_contact_phone,s.contact_email AS shop_contact_email,s.whatsapp_number AS shop_whatsapp,o.id AS order_id,o.order_number,o.status AS order_status,o.delivery_status,o.total_minor AS order_total_minor,o.delivery_method,o.delivery_county,o.delivery_sub_county,o.delivery_estate,o.delivery_address,o.delivery_directions,o.customer_name AS order_buyer_name,o.customer_phone AS order_buyer_phone,o.customer_email AS order_buyer_email,p.name AS product_name,p.slug AS product_slug,sc.full_name AS buyer_full_name,sc.email AS buyer_email,sc.alternative_phone AS buyer_alternative_phone,sc.phone_verified_at AS buyer_phone_verified_at,sc.is_banned AS buyer_is_banned,sc.banned_until AS buyer_banned_until,u.display_name AS seller_name,u.phone AS seller_phone,u.email AS seller_email,COALESCE((SELECT json_agg(json_build_object('id',a.id,'fileName',a.file_name,'contentType',a.content_type,'sizeBytes',a.size_bytes,'scanStatus',a.scan_status)) FROM public.shop_complaint_attachments a WHERE a.complaint_id=c.id AND a.upload_status='ready'),'[]'::json) AS attachments,COALESCE((SELECT json_agg(json_build_object('id',pay.id,'receipt',pay.provider_receipt,'status',pay.status,'amount_minor',pay.amount_minor,'created_at',pay.created_at) ORDER BY pay.created_at DESC) FROM public.payments pay WHERE pay.order_id=o.id AND pay.tenant_id=o.tenant_id),'[]'::json) AS order_payments FROM public.shop_complaints c JOIN public.tenants t ON t.id=c.tenant_id LEFT JOIN public.sites s ON s.tenant_id=t.id LEFT JOIN public.orders o ON o.id=c.order_id AND o.tenant_id=c.tenant_id LEFT JOIN public.products p ON p.id=c.product_id AND p.tenant_id=c.tenant_id LEFT JOIN public.store_customers sc ON sc.tenant_id=c.tenant_id AND right(regexp_replace(sc.phone,'[^0-9]','','g'),9)=right(regexp_replace(c.buyer_phone,'[^0-9]','','g'),9) LEFT JOIN public.users u ON u.id=t.created_by ORDER BY c.created_at DESC LIMIT 500`;
   return send(res,200,{complaints:rows.map((r:any)=>({...r,paymentAmount:r.payment_amount_minor==null?null:Number(r.payment_amount_minor)/100}))});
  }
  if(req.method==='POST'&&['edit_shop','edit_seller','edit_product','edit_order','edit_buyer','update_support','ban_buyer','shop_access'].includes(String(req.body?.action||''))){
   const action=String(req.body.action),id=String(req.body?.id||''),v=req.body||{};
   if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{error:'Invalid record id.'});
   let updated:any[]=[];
   if(action==='shop_access'){
    const banned=v.banned===true||v.banned==='true',reason=String(v.reason||'').trim().slice(0,1500);
    if(banned&&!reason)return send(res,400,{error:'A reason is required to ban a shop.'});
    updated=banned ? await sql`UPDATE public.tenants SET status='banned',status_before_ban=CASE WHEN status='banned' THEN status_before_ban ELSE status END,ban_reason=${reason},updated_at=now() WHERE id=${id} RETURNING id,name,slug,status,ban_reason` : await sql`UPDATE public.tenants SET status=COALESCE(NULLIF(status_before_ban,'banned'),'active'),status_before_ban=NULL,ban_reason=NULL,updated_at=now() WHERE id=${id} RETURNING id,name,slug,status,ban_reason`;
    if(!updated.length)return send(res,404,{error:'Shop not found.'});
   }
   if(action==='edit_shop'){
    const name=String(v.name||'').trim().slice(0,120),slug=String(v.slug||'').trim().toLowerCase(),siteTitle=String(v.storefront_title||name).trim().slice(0,120);
    if(!name||! /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug))return send(res,400,{error:'Enter a shop name and a valid slug (3–50 lowercase letters, numbers or hyphens).'});
    const shopStatus=String(v.status||'active');if(!['trial','active','past_due','suspended','closed'].includes(shopStatus))return send(res,400,{error:'Invalid shop status.'});updated=await sql`UPDATE public.tenants SET name=${name},slug=${slug},status=${shopStatus},updated_at=now() WHERE id=${id} RETURNING id,name,slug,status`;
    if(!updated.length)return send(res,404,{error:'Shop not found.'});
    await sql`UPDATE public.sites SET title=${siteTitle},description=${String(v.storefront_description||'').slice(0,5000)},contact_phone=${String(v.contact_phone||'').slice(0,40)||null},contact_email=${String(v.contact_email||'').slice(0,254)||null},whatsapp_number=${String(v.whatsapp_number||'').slice(0,40)||null},storefront_theme=${String(v.storefront_theme||'#e47a13').slice(0,32)},terms_and_conditions=${String(v.terms_and_conditions||'').slice(0,20000)},privacy_policy=${String(v.privacy_policy||'').slice(0,20000)},return_policy=${String(v.return_policy||'').slice(0,20000)},delivery_policy=${String(v.delivery_policy||'').slice(0,20000)},updated_at=now() WHERE tenant_id=${id}`;
   }
   if(action==='edit_seller'){
    const tenant=await sql`SELECT created_by FROM public.tenants WHERE id=${id} LIMIT 1`;if(!tenant.length||!tenant[0].created_by)return send(res,404,{error:'Seller account not found.'});
    const displayName=String(v.owner_name||'').trim().slice(0,120),email=String(v.owner_email||'').trim().toLowerCase().slice(0,254)||null,phoneRaw=phone(String(v.owner_phone||'')),phoneValue=phoneRaw.startsWith('254')?'+254'+phoneRaw.slice(3):phoneRaw;
    if(!displayName||!phoneValue)return send(res,400,{error:'Seller name and valid phone number are required.'});
    updated=await sql`UPDATE public.users SET display_name=${displayName},email=${email},phone=${phoneValue},updated_at=now() WHERE id=${tenant[0].created_by} RETURNING id,display_name,phone,email`;
    if(!updated.length)return send(res,404,{error:'Seller account not found.'});
   }
   if(action==='edit_product'){
    const name=String(v.name||'').trim().slice(0,180),price=Number(v.price_minor),stock=v.stock_quantity===''||v.stock_quantity==null?null:Number(v.stock_quantity);
    if(!name||!Number.isSafeInteger(price)||price<0||!(stock===null||(Number.isInteger(stock)&&stock>=0)))return send(res,400,{error:'Product name, valid price and non-negative stock are required.'});
    updated=await sql`UPDATE public.products SET name=${name},description=${String(v.description||'').slice(0,10000)},sku=${String(v.sku||'').trim().slice(0,100)||null},price_minor=${price},stock_quantity=${stock},is_active=${v.is_active===true||v.is_active==='true'},updated_at=now() WHERE id=${id} RETURNING id,name,is_active`;
    if(!updated.length)return send(res,404,{error:'Product not found.'});
   }
   if(action==='edit_order'){
    const allowed=['pending','confirmed','processing','fulfilled','cancelled','refunded'],delivery=['pending_delivery','in_transit','delivered'];
    const status=String(v.status||''),deliveryStatus=String(v.delivery_status||'');
    if(!allowed.includes(status)||!delivery.includes(deliveryStatus))return send(res,400,{error:'Select a valid order and delivery status.'});
    updated=await sql`UPDATE public.orders SET status=${status},delivery_status=${deliveryStatus},delivery_updated_at=now(),updated_at=now() WHERE id=${id} RETURNING id,order_number,status,delivery_status`;
    if(!updated.length)return send(res,404,{error:'Order not found.'});
    const buyer=await sql`SELECT customer_phone FROM public.orders WHERE id=${id} LIMIT 1`;if(buyer.length)await sql`INSERT INTO public.buyer_notifications(tenant_id,buyer_phone,order_id,notification_type,title,detail) SELECT tenant_id,${buyer[0].customer_phone},${id},'order_update','Order updated by DASNET',${'DASNET updated your order status to '+status.replaceAll('_',' ')+'.'} FROM public.orders WHERE id=${id}`;
   }
   if(action==='edit_buyer'){
    const fullName=String(v.full_name||'').trim().slice(0,120),email=String(v.email||'').trim().toLowerCase().slice(0,254)||null,alternative=String(v.alternative_phone||'').trim().slice(0,40)||null,address=String(v.address||'').trim().slice(0,1000)||null;
    if(!fullName)return send(res,400,{error:'Buyer name is required.'});
    updated=await sql`UPDATE public.store_customers SET full_name=${fullName},email=${email},alternative_phone=${alternative},address=${address},updated_at=now() WHERE id=${id} RETURNING id,full_name,phone`;
    if(!updated.length)return send(res,404,{error:'Buyer not found.'});
   }
   if(action==='ban_buyer'){
    const banned=v.banned===true||v.banned==='true',reason=String(v.reason||'').trim().slice(0,1000)||null;
    updated=await sql`UPDATE public.store_customers SET is_banned=${banned},ban_reason=${banned?reason:null},updated_at=now() WHERE id=${id} RETURNING id,full_name,phone,email,is_banned,ban_reason`;
    if(!updated.length)return send(res,404,{error:'Buyer profile not found.'});
    const signals=await sql`SELECT identity_type,identity_hash FROM public.auth_identity_signals WHERE customer_id=${updated[0].id}`;const identities=[...signals,...[['phone',identityHash(String(updated[0].phone||'').trim().toLowerCase())],...(updated[0].email?[['email',identityHash(String(updated[0].email).trim().toLowerCase())]]:[])].map(([identity_type,identity_hash]:any)=>({identity_type,identity_hash}))];if(banned){for(const item of identities)await sql`INSERT INTO public.identity_restrictions(identity_type,identity_hash,restriction_scope,reason,expires_at) VALUES(${item.identity_type},${item.identity_hash},'all',${reason||'Buyer account restricted'},NULL) ON CONFLICT(identity_type,identity_hash,restriction_scope) DO UPDATE SET reason=EXCLUDED.reason,revoked_at=NULL,expires_at=NULL`;}else{const hashes=identities.map((x:any)=>x.identity_hash);if(hashes.length)await sql`UPDATE public.identity_restrictions SET revoked_at=now() WHERE identity_hash=ANY(${hashes}::text[]) AND restriction_scope='all' AND revoked_at IS NULL`;}
   }
   if(action==='update_support'){
    const status=String(v.status||''),priority=String(v.priority||'normal'),response=String(v.response||'').trim().slice(0,10000);
    if(!['open','in_progress','waiting_on_customer','resolved','closed'].includes(status)||!['low','normal','high','urgent'].includes(priority))return send(res,400,{error:'Invalid ticket status or priority.'});
    updated=await sql`UPDATE public.support_tickets SET status=${status},priority=${priority},response=${response||null},updated_at=now() WHERE id=${id} RETURNING id,ticket_number,status,priority,response`;
    if(!updated.length)return send(res,404,{error:'Support ticket not found.'});
   }
   const tenantId=['edit_shop','edit_seller','shop_access'].includes(action)?id:(action==='ban_buyer'?(await sql`SELECT tenant_id FROM public.store_customers WHERE id=${id} LIMIT 1`)[0]?.tenant_id:null);
   await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${tenantId},${users[0].id},${'platform.'+action},${action.replace('edit_','')},${id},${JSON.stringify({changedFields:Object.keys(v).filter(k=>!['action','id'].includes(k))})}::jsonb)`;
   return send(res,200,{ok:true,record:updated[0]});
  }
  if(req.method==='POST'&&req.body?.action==='complaint_restrict'){
   const id=String(req.body?.id||''),target=String(req.body?.target||''),days=Number(req.body?.durationDays||0),reason=String(req.body?.reason||'').trim().slice(0,1500);
   if(!/^[0-9a-f-]{36}$/i.test(id)||!['buyer','shop'].includes(target)||!Number.isInteger(days)||days<0||days>365||!reason)return send(res,400,{error:'Choose a valid target, duration (0 for permanent, up to 365 days) and reason.'});
   const report=await sql`SELECT id,tenant_id,buyer_phone FROM public.shop_complaints WHERE id=${id} LIMIT 1`;
   if(!report.length)return send(res,404,{error:'Complaint not found.'});
   if(target==='buyer'){
    const updated=await sql`UPDATE public.store_customers SET is_banned=true,ban_reason=${reason},banned_until=${days>0?new Date(Date.now()+days*86400000).toISOString():null},updated_at=now() WHERE tenant_id=${report[0].tenant_id} AND right(regexp_replace(phone,'[^0-9]','','g'),9)=right(regexp_replace(${report[0].buyer_phone},'[^0-9]','','g'),9) RETURNING id,full_name,phone,email,is_banned,banned_until`;
    if(!updated.length)return send(res,404,{error:'Buyer account for this shop was not found.'});
    const signals=await sql`SELECT identity_type,identity_hash FROM public.auth_identity_signals WHERE customer_id=${updated[0].id}`;
    const identities=[...signals,...[['phone',identityHash(String(updated[0].phone||'').trim().toLowerCase())],...(updated[0].email?[['email',identityHash(String(updated[0].email).trim().toLowerCase())]]:[])].map(([identity_type,identity_hash]:any)=>({identity_type,identity_hash}))];
    for(const item of identities)await sql`INSERT INTO public.identity_restrictions(identity_type,identity_hash,restriction_scope,reason,source_complaint_id,expires_at) VALUES(${item.identity_type},${item.identity_hash},'all',${reason},${id},${days>0?new Date(Date.now()+days*86400000).toISOString():null}) ON CONFLICT(identity_type,identity_hash,restriction_scope) DO UPDATE SET reason=EXCLUDED.reason,source_complaint_id=EXCLUDED.source_complaint_id,expires_at=EXCLUDED.expires_at,revoked_at=NULL`;
   }else{
    const updated=await sql`UPDATE public.tenants SET status='banned',status_before_ban=CASE WHEN status='banned' THEN status_before_ban ELSE status END,ban_reason=${reason},ban_expires_at=${days>0?new Date(Date.now()+days*86400000).toISOString():null},updated_at=now() WHERE id=${report[0].tenant_id} RETURNING id,name,slug,status,ban_expires_at`;
    if(!updated.length)return send(res,404,{error:'Shop not found.'});
   }
   await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${report[0].tenant_id},${users[0].id},${'platform.complaint.'+target+'.restricted'},${target},${id},${JSON.stringify({durationDays:days,reason,complaintId:id})}::jsonb)`;
   return send(res,200,{ok:true,target,durationDays:days,reason});
  }
  if(req.method==='POST'&&req.body?.action==='complaint_restrict_seller'){
   const id=String(req.body?.id||''),days=Number(req.body?.durationDays||0),reason=String(req.body?.reason||'').trim().slice(0,1500);
   if(!/^[0-9a-f-]{36}$/i.test(id)||!Number.isInteger(days)||days<0||days>365||!reason)return send(res,400,{error:'Choose a valid duration and reason.'});
   const report=await sql`SELECT tenant_id FROM public.shop_complaints WHERE id=${id} LIMIT 1`;
   if(!report.length)return send(res,404,{error:'Complaint not found.'});
   const owner=await sql`SELECT t.created_by,u.phone,u.email FROM public.tenants t JOIN public.users u ON u.id=t.created_by WHERE t.id=${report[0].tenant_id} LIMIT 1`;
   if(!owner.length)return send(res,404,{error:'Seller identity was not found.'});
   const expires=days>0?new Date(Date.now()+days*86400000).toISOString():null;
   const signals=await sql`SELECT identity_type,identity_hash FROM public.auth_identity_signals WHERE user_id=${owner[0].created_by}`;
   const identities=[...signals,...[['phone',identityHash(String(owner[0].phone||'').trim().toLowerCase())],...(owner[0].email?[['email',identityHash(String(owner[0].email).trim().toLowerCase())]]:[])].map(([identity_type,identity_hash]:any)=>({identity_type,identity_hash}))];
   for(const item of identities)await sql`INSERT INTO public.identity_restrictions(identity_type,identity_hash,restriction_scope,reason,source_complaint_id,expires_at) VALUES(${item.identity_type},${item.identity_hash},'all',${reason},${id},${expires}) ON CONFLICT(identity_type,identity_hash,restriction_scope) DO UPDATE SET reason=EXCLUDED.reason,source_complaint_id=EXCLUDED.source_complaint_id,expires_at=EXCLUDED.expires_at,revoked_at=NULL`;
   await sql`UPDATE public.tenants SET status='banned',status_before_ban=CASE WHEN status='banned' THEN status_before_ban ELSE status END,ban_reason=${reason},ban_expires_at=${expires},updated_at=now() WHERE id=${report[0].tenant_id}`;
   await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${report[0].tenant_id},${users[0].id},'platform.complaint.seller.restricted','seller',${id},${JSON.stringify({durationDays:days,reason,complaintId:id})}::jsonb)`;
   return send(res,200,{ok:true,target:'seller',durationDays:days,reason});
  }
  if(req.method==='POST'&&req.body?.action==='complaint_restore_seller'){
   const id=String(req.body?.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return send(res,400,{error:'Invalid restore request.'});
   const report=await sql`SELECT tenant_id FROM public.shop_complaints WHERE id=${id} LIMIT 1`;if(!report.length)return send(res,404,{error:'Complaint not found.'});
   await sql`UPDATE public.identity_restrictions SET revoked_at=now() WHERE source_complaint_id=${id} AND restriction_scope='all'`;
   await sql`UPDATE public.tenants SET status=COALESCE(NULLIF(status_before_ban,'banned'),'active'),status_before_ban=NULL,ban_reason=NULL,ban_expires_at=NULL,updated_at=now() WHERE id=${report[0].tenant_id} AND status='banned'`;
   await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${report[0].tenant_id},${users[0].id},'platform.complaint.seller.restored','seller',${id},'{}'::jsonb)`;
   return send(res,200,{ok:true,target:'seller'});
  }
  if(req.method==='POST'&&req.body?.action==='complaint_restore'){
   const id=String(req.body?.id||''),target=String(req.body?.target||'');
   if(!/^[0-9a-f-]{36}$/i.test(id)||!['buyer','shop'].includes(target))return send(res,400,{error:'Invalid restore request.'});
   const report=await sql`SELECT id,tenant_id,buyer_phone FROM public.shop_complaints WHERE id=${id} LIMIT 1`;
   if(!report.length)return send(res,404,{error:'Complaint not found.'});
   if(target==='buyer'){await sql`UPDATE public.store_customers SET is_banned=false,ban_reason=NULL,banned_until=NULL,updated_at=now() WHERE tenant_id=${report[0].tenant_id} AND right(regexp_replace(phone,'[^0-9]','','g'),9)=right(regexp_replace(${report[0].buyer_phone},'[^0-9]','','g'),9)`;await sql`UPDATE public.identity_restrictions SET revoked_at=now() WHERE source_complaint_id=${id} AND restriction_scope='all' AND revoked_at IS NULL`;}
   else await sql`UPDATE public.tenants SET status=COALESCE(NULLIF(status_before_ban,'banned'),'active'),status_before_ban=NULL,ban_reason=NULL,ban_expires_at=NULL,updated_at=now() WHERE id=${report[0].tenant_id} AND status='banned'`;
   await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${report[0].tenant_id},${users[0].id},${'platform.complaint.'+target+'.restored'},${target},${id},${JSON.stringify({complaintId:id})}::jsonb)`;
   return send(res,200,{ok:true,target});
  }
  if(req.method==='POST'&&req.body?.action==='complaint_status'){
   const id=String(req.body?.id||''),status=String(req.body?.status||''),notes=String(req.body?.adminNotes||'').trim().slice(0,3000);
   if(!['open','under_review','resolved','rejected'].includes(status))return send(res,400,{error:'Invalid complaint status.'});
   const finalDecision=['resolved','rejected'].includes(status);const rows=await sql`UPDATE public.shop_complaints SET status=${status},dispute_status=CASE WHEN ${finalDecision} THEN 'closed' ELSE dispute_status END,admin_notes=${notes||null},dispute_closed_at=CASE WHEN ${finalDecision} THEN now() ELSE dispute_closed_at END,updated_at=now() WHERE id=${id} RETURNING id,tenant_id,buyer_phone,status,dispute_status,admin_notes,updated_at`;
   if(!rows.length)return send(res,404,{error:'Complaint not found.'});
   const verdictTitle=status==='resolved'?'DASNET resolved your report':status==='rejected'?'DASNET rejected your report':'DASNET updated your report';const verdictDetail=notes||('DASNET support updated the case status to '+status.replaceAll('_',' ')+'.');
   const shop=await sql`SELECT created_by FROM public.tenants WHERE id=${rows[0].tenant_id} LIMIT 1`;
   await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,recipient_user_id,title,detail) VALUES(${rows[0].tenant_id},${rows[0].id},'buyer',${rows[0].buyer_phone},NULL,${verdictTitle},${verdictDetail})`;
   if(shop[0]?.created_by)await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,recipient_user_id,title,detail) VALUES(${rows[0].tenant_id},${rows[0].id},'seller',NULL,${shop[0].created_by},${verdictTitle},${verdictDetail})`;
   return send(res,200,{ok:true,complaint:rows[0]});
  }
  if(req.method==='GET'){
   const [summary,tenants,cfg]=await Promise.all([
    sql`SELECT (SELECT count(*)::int FROM public.tenants) AS sellers,(SELECT count(*)::int FROM public.products) AS products,(SELECT count(*)::int FROM public.orders) AS orders,(SELECT count(*)::int FROM public.orders WHERE status='pending') AS pending_orders`,
    sql`SELECT t.id,t.name,t.slug,t.status,t.created_at,u.display_name AS owner_name,u.phone AS owner_phone,(SELECT count(*)::int FROM public.products p WHERE p.tenant_id=t.id) AS products,(SELECT count(*)::int FROM public.orders o WHERE o.tenant_id=t.id) AS orders FROM public.tenants t LEFT JOIN public.users u ON u.id=t.created_by ORDER BY t.created_at DESC LIMIT 200`,
    sql`SELECT method,shortcode,environment,encrypted_credentials FROM public.platform_payment_methods ORDER BY method`
   ]);
   const methods:any={till:{configured:false,shortcode:'',environment:'production'},paybill:{configured:false,shortcode:'',environment:'production'}};
   for(const row of cfg){const secret=row.encrypted_credentials||{};methods[row.method]={configured:!!(secret.data&&row.shortcode),shortcode:row.shortcode||'',environment:row.environment||'production'};}
   return send(res,200,{summary:summary[0],tenants,daraja:{methods}});
  }
  if(req.body?.action==='save_daraja'){
   const method=String(req.body?.method||'')==='paybill'?'paybill':'till',key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
   if(!key)return send(res,503,{error:'Credential encryption is not configured. Add DASNET_CREDENTIALS_ENCRYPTION_KEY to the server runtime.'});
   const keyBytes=/^[0-9a-f]{64}$/i.test(key)?Buffer.from(key,'hex'):Buffer.from(key,'base64');
   if(keyBytes.length!==32)return send(res,503,{error:'DASNET_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes.'});
   const existing=await sql`SELECT encrypted_credentials,shortcode FROM public.platform_payment_methods WHERE method=${method} LIMIT 1`;
   let old:any={};const stored=existing[0]?.encrypted_credentials;
   if(stored?.data&&stored?.iv&&stored?.tag){try{const decipher=crypto.createDecipheriv('aes-256-gcm',keyBytes,Buffer.from(stored.iv,'base64'));decipher.setAuthTag(Buffer.from(stored.tag,'base64'));old=JSON.parse(Buffer.concat([decipher.update(Buffer.from(stored.data,'base64')),decipher.final()]).toString('utf8'));}catch{return send(res,500,{error:'Stored '+method+' credentials could not be decrypted. Check the encryption key.'});}}
   const next:any={...old};for(const field of ['consumerKey','consumerSecret','passkey']){const value=String(req.body?.[field]||'').trim();if(value)next[field]=value;}
   const shortcode=String(req.body?.shortcode||'').trim()||existing[0]?.shortcode||null,environment=String(req.body?.environment||'production');
   if(!['sandbox','production'].includes(environment))return send(res,400,{error:'Invalid Daraja environment.'});
   if(!next.consumerKey||!next.consumerSecret||!next.passkey||!shortcode)return send(res,400,{error:'Complete the '+method+' shortcode, consumer key, consumer secret and passkey before saving.'});
   const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',keyBytes,iv),encrypted=Buffer.concat([cipher.update(JSON.stringify(next),'utf8'),cipher.final()]);
   const blob={v:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:encrypted.toString('base64')};
   await sql`INSERT INTO public.platform_payment_methods(method,shortcode,environment,encrypted_credentials,updated_at) VALUES(${method},${shortcode},${environment},${JSON.stringify(blob)}::jsonb,now()) ON CONFLICT(method) DO UPDATE SET shortcode=EXCLUDED.shortcode,environment=EXCLUDED.environment,encrypted_credentials=EXCLUDED.encrypted_credentials,updated_at=now()`;
   await sql`INSERT INTO public.audit_logs(actor_user_id,action,resource_type,resource_id,metadata) VALUES(${users[0].id},${'platform.daraja.'+method+'.updated'},'payment_config',${'central-'+method},${JSON.stringify({shortcode,environment,credentialsEncrypted:true})}::jsonb)`;
   return send(res,200,{ok:true,method,shortcode,environment});
  }
  const id=String(req.body?.tenantId||''),status=String(req.body?.status||'');
  if(!/^[0-9a-f-]{36}$/i.test(id)||!['active','suspended'].includes(status))return send(res,400,{error:'Invalid seller or status.'});
  const updated=await sql`UPDATE public.tenants SET status=${status},updated_at=now() WHERE id=${id} RETURNING id,name`;
  if(!updated.length)return send(res,404,{error:'Seller not found.'});
  await sql`INSERT INTO public.audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata) VALUES(${id},${users[0].id},'platform.tenant.status.updated','tenant',${id},${JSON.stringify({status})}::jsonb)`;
  return send(res,200,{ok:true});
 }catch(e:any){console.error('DAS platform admin error',e);return send(res,500,{error:'Platform admin operation failed.'})}
}