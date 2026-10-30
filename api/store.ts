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
function productOut(p:any){return {id:p.id,name:p.name,description:p.description,images:Array.isArray(p.images)?p.images:[],imageUrl:Array.isArray(p.images)?(p.images[0]||''):'',category:p.product_type==='data_bundle'?'Data bundles':p.product_type==='digital'?'Digital products':'Shop products',type:p.product_type,price:Number(p.price_minor)/100,currency:p.currency,stockQuantity:p.stock_quantity,active:p.is_active,sku:p.sku||''};}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST','DELETE'].includes(req.method)){res.setHeader('Allow','GET, POST, DELETE');return send(res,405,{error:'Method not allowed'});}
 try{
  const sql=db(),action=String(req.query?.action||req.body?.action||'');
  if(req.method==='GET'&&action==='storefront'){
   const slug=String(req.query?.slug||'').toLowerCase();
   const rows=await sql`SELECT t.id AS tenant_id,t.name AS shop_name,t.slug,s.description FROM public.tenants t LEFT JOIN public.sites s ON s.tenant_id=t.id WHERE t.slug=${slug} AND t.status IN ('trial','active') LIMIT 1`;
   if(!rows.length)return send(res,404,{error:'Shop not found'});
   const ps=await sql`SELECT id,name,description,product_type,price_minor,currency,stock_quantity,is_active FROM public.products WHERE tenant_id=${rows[0].tenant_id} AND is_active=true ORDER BY created_at DESC`;
   return send(res,200,{shop:{name:rows[0].shop_name,slug:rows[0].slug,description:rows[0].description||''},products:ps.map(productOut)});
  }
  const me=await seller(sql,req);
  if(req.method==='POST'&&action==='order'){
   const b=req.body||{},slug=String(b.slug||'').toLowerCase(),name=String(b.customerName||'').trim().slice(0,120),phone=normalizePhone(b.customerPhone),items=Array.isArray(b.items)?b.items:[];
   const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   if(!name||!phone||!items.length||items.length>30)return send(res,400,{error:'Enter your name, valid phone number and at least one item.'});
   const tenantId=shops[0].id,ids=items.map((x:any)=>String(x.id||'')).filter(Boolean);
   const ps=await sql`SELECT id,name,price_minor,stock_quantity FROM public.products WHERE tenant_id=${tenantId} AND is_active=true AND id=ANY(${ids}::uuid[])`;
   if(ps.length!==new Set(ids).size)return send(res,400,{error:'One or more products are no longer available.'});
   let total=0;const lines=ps.map((p:any)=>{const qty=Math.max(1,Math.min(99,Math.floor(Number(items.find((x:any)=>x.id===p.id)?.quantity)||1)));if(p.stock_quantity!==null&&p.stock_quantity<qty)throw Error('OUT_OF_STOCK');const line=Number(p.price_minor)*qty;total+=line;return {p,qty,line};});
   if(total<=0)return send(res,400,{error:'Order total must be greater than zero.'});
   const orderNo='DAS-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();
   const o=await sql`INSERT INTO public.orders(tenant_id,order_number,customer_name,customer_phone,subtotal_minor,total_minor,status) VALUES(${tenantId},${orderNo},${name},${phone},${total},${total},'pending') RETURNING id,order_number`;
   for(const l of lines){await sql`INSERT INTO public.order_items(tenant_id,order_id,product_id,product_name,quantity,unit_price_minor,line_total_minor) VALUES(${tenantId},${o[0].id},${l.p.id},${l.p.name},${l.qty},${Number(l.p.price_minor)},${l.line})`;}
   return send(res,201,{ok:true,orderNumber:o[0].order_number,message:'Order received. Payment is not enabled yet.'});
  }
  if(!me)return send(res,401,{error:'Sign in to manage your shop.'});

  if(req.method==='GET'&&action==='payment-settings'){
   const rows=await sql`SELECT payout_method,party_b,account_reference,shortcode,account_type,environment,encrypted_credentials FROM public.payment_configs WHERE tenant_id=${me.tenant_id} LIMIT 1`;
   const c=rows[0]||{};
   let credentialFlags:any={consumerKey:false,consumerSecret:false,passkey:false};
   if(c.encrypted_credentials&&c.encrypted_credentials.ciphertext)credentialFlags={consumerKey:true,consumerSecret:true,passkey:true};
   return send(res,200,{payoutMethod:c.payout_method||'till',partyB:c.party_b||'',accountReference:c.account_reference||'',shortcode:c.shortcode||'',accountType:c.account_type||null,environment:c.environment||'production',credentialsConfigured:credentialFlags});
  }
  if(req.method==='POST'&&action==='payout-settings'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can update payout settings.'});
   const b=req.body||{},method=b.payoutMethod==='paybill'?'paybill':'till',partyB=String(b.partyB||'').replace(/\\s/g,'').slice(0,20),account=String(b.accountReference||'').trim().slice(0,32);
   if(!/^\\d{5,12}$/.test(partyB))return send(res,400,{error:'Enter a valid merchant Till or PayBill number.'});
   if(method==='paybill'&&!/^[A-Za-z0-9-]{1,32}$/.test(account))return send(res,400,{error:'Enter the account number/reference required by the merchant PayBill.'});
   const type=method==='paybill'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline';
   await sql`INSERT INTO public.payment_configs(tenant_id,provider,environment,party_b,account_reference,payout_method,account_type,is_enabled) VALUES(${me.tenant_id},'mpesa_daraja','production',${partyB},${method==='paybill'?account:null},${method},${type},true) ON CONFLICT(tenant_id) DO UPDATE SET party_b=EXCLUDED.party_b,account_reference=EXCLUDED.account_reference,payout_method=EXCLUDED.payout_method,account_type=EXCLUDED.account_type,updated_at=now()`;
   await audit(sql,me.tenant_id,me.user_id,'payout.destination.updated','payment_config',me.tenant_id,{method,partyB,accountReference:method==='paybill'?account:'[not-required]'});
   return send(res,200,{ok:true,payoutMethod:method,accountType:type});
  }
  if(req.method==='POST'&&action==='api-credentials'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can update API credentials.'});
   const b=req.body||{},type=b.accountType==='CustomerPayBillOnline'?'CustomerPayBillOnline':'CustomerBuyGoodsOnline',shortcode=String(b.shortcode||'').trim().slice(0,20),environment=b.environment==='sandbox'?'sandbox':'production';
   const key=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
   if(!key)return send(res,503,{error:'Secure credential storage is not configured. Contact DASNET support.'});
   const raw=Buffer.from(key,'base64');if(raw.length!==32)return send(res,503,{error:'Credential encryption configuration is invalid.'});
   const current=await sql`SELECT encrypted_credentials FROM public.payment_configs WHERE tenant_id=${me.tenant_id} LIMIT 1`;
   let secrets:any={};
   if(current[0]?.encrypted_credentials?.ciphertext){
    try{const old=current[0].encrypted_credentials,dec=crypto.createDecipheriv('aes-256-gcm',raw,Buffer.from(old.iv,'base64'));dec.setAuthTag(Buffer.from(old.tag,'base64'));secrets=JSON.parse(Buffer.concat([dec.update(Buffer.from(old.ciphertext,'base64')),dec.final()]).toString('utf8'));}catch{return send(res,500,{error:'Saved credentials could not be decrypted. Contact support before replacing them.'});}
   }
   for(const field of ['consumerKey','consumerSecret','passkey'])if(typeof b[field]==='string'&&b[field].trim())secrets[field]=b[field].trim();
   if(!shortcode||!secrets.consumerKey||!secrets.consumerSecret||!secrets.passkey)return send(res,400,{error:'Enter shortcode, consumer key, consumer secret and passkey. Blank secret fields preserve saved values.'});
   const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',raw,iv),encrypted=Buffer.concat([cipher.update(JSON.stringify(secrets),'utf8'),cipher.final()]);
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
   if(email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))return send(res,400,{error:'Enter a valid email address.'});
   if(avatar&&avatar.length>1500000)return send(res,400,{error:'Profile image is too large. Choose an image under 1 MB.'});
   if(avatar&&!/^https:\\/\\//.test(avatar)&&!/^data:image\\/(png|jpeg|webp);base64,/.test(avatar))return send(res,400,{error:'Use a PNG, JPEG or WebP profile image.'});
   await sql`UPDATE public.users SET display_name=${name},email=${email||null},avatar_url=${avatar||null},updated_at=now() WHERE id=${me.user_id}`;
   await audit(sql,me.tenant_id,me.user_id,'profile.updated','user',me.user_id,{name,email:email||null,avatarUpdated:!!avatar});
   return send(res,200,{ok:true});
  }

  if(req.method==='POST'&&action==='settings'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only the shop owner or admin can change settings.'});
   const name=String(req.body?.name||'').trim().slice(0,100),description=String(req.body?.description||'').trim().slice(0,1000);
   if(!name)return send(res,400,{error:'Shop name is required.'});
   await sql`UPDATE public.tenants SET name=${name},updated_at=now() WHERE id=${me.tenant_id}`;
   await sql`UPDATE public.sites SET title=${name},description=${description},updated_at=now() WHERE tenant_id=${me.tenant_id}`;
   await audit(sql,me.tenant_id,me.user_id,'shop.settings.updated','shop',me.tenant_id,{name});
   return send(res,200,{ok:true});
  }
  if(req.method==='GET'&&action==='products'){
   const ps=await sql`SELECT id,name,description,product_type,price_minor,currency,stock_quantity,is_active,sku,images FROM public.products WHERE tenant_id=${me.tenant_id} ORDER BY created_at DESC`;
   return send(res,200,{shop:{name:me.shop_name,slug:me.slug,description:me.shop_description||''},products:ps.map(productOut)});
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
 }catch(e:any){if(e?.message==='DB_CONFIG')return send(res,503,{error:'Database connection is not configured.'});if(e?.message==='OUT_OF_STOCK')return send(res,409,{error:'Insufficient stock for one or more items.'});console.error('DAS store API error',e);return send(res,500,{error:'Store operation failed. Check database schema and server logs.'});}
}