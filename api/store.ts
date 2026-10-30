import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(k:string)=>(process.env[k]||'').trim();
const send=(res:any,s:number,b:unknown)=>res.status(s).json(b);
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
function token(req:any){const c=String(req.headers.cookie||'').split(';').map((s:string)=>s.trim()).find((s:string)=>s.startsWith('das_session='));try{return c?decodeURIComponent(c.slice(12)):''}catch{return ''}}
async function seller(sql:any,req:any){
 const t=token(req);if(!t)return null;
 const rows=await sql`SELECT u.id AS user_id,m.tenant_id,t.slug,t.name AS shop_name,m.role FROM public.auth_sessions s JOIN public.users u ON u.id=s.user_id JOIN public.memberships m ON m.user_id=u.id JOIN public.tenants t ON t.id=m.tenant_id WHERE s.token_hash=${hash(t)} AND s.expires_at>now() AND t.status IN ('trial','active') ORDER BY m.created_at LIMIT 1`;
 return rows[0]||null;
}
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
function productOut(p:any){return {id:p.id,name:p.name,description:p.description,category:p.product_type==='data_bundle'?'Data bundles':p.product_type==='digital'?'Digital products':'Shop products',type:p.product_type,price:Number(p.price_minor)/100,currency:p.currency,stockQuantity:p.stock_quantity,active:p.is_active,sku:p.sku||''};}
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
   const b=req.body||{},slug=String(b.slug||'').toLowerCase(),name=String(b.customerName||'').trim().slice(0,120),phone=String(b.customerPhone||'').replace(/[^0-9+]/g,'').slice(0,20),items=Array.isArray(b.items)?b.items:[];
   const shops=await sql`SELECT id FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active') LIMIT 1`;
   if(!shops.length)return send(res,404,{error:'Shop not found.'});
   if(!name||!/^\\+?\\d{9,15}$/.test(phone)||!items.length||items.length>30)return send(res,400,{error:'Enter your name, valid phone number and at least one item.'});
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
  if(req.method==='GET'&&action==='products'){
   const ps=await sql`SELECT id,name,description,product_type,price_minor,currency,stock_quantity,is_active,sku FROM public.products WHERE tenant_id=${me.tenant_id} ORDER BY created_at DESC`;
   return send(res,200,{shop:{name:me.shop_name,slug:me.slug},products:ps.map(productOut)});
  }
  if(req.method==='GET'&&action==='orders'){
   const os=await sql`SELECT o.id,o.order_number,o.customer_name,o.customer_phone,o.total_minor,o.currency,o.status,o.created_at,COALESCE(json_agg(json_build_object('name',i.product_name,'quantity',i.quantity,'lineTotal',i.line_total_minor)) FILTER (WHERE i.id IS NOT NULL),'[]'::json) AS items FROM public.orders o LEFT JOIN public.order_items i ON i.tenant_id=o.tenant_id AND i.order_id=o.id WHERE o.tenant_id=${me.tenant_id} GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`;
   return send(res,200,{orders:os.map((o:any)=>({...o,total:Number(o.total_minor)/100,items:o.items}))});
  }
  if(req.method==='POST'&&action==='product'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission to edit products.'});
   const b=req.body||{},name=String(b.name||'').trim().slice(0,120),description=String(b.description||'').trim().slice(0,2000),type=['physical','data_bundle','digital'].includes(b.type)?b.type:'physical',price=Number(b.price),stock=b.stock===''||b.stock==null?null:Number(b.stock),sku=String(b.sku||'').trim().slice(0,80)||null;
   if(!name||!Number.isFinite(price)||price<0||price>100000000|| (stock!==null&&(!Number.isInteger(stock)||stock<0)))return send(res,400,{error:'Enter a product name, valid KES price and valid stock quantity.'});
   const id=String(b.id||'');
   if(id){
    const updated=await sql`UPDATE public.products SET name=${name},slug=${slugify(name)+'-'+id.slice(0,8)},description=${description},product_type=${type},price_minor=${Math.round(price*100)},stock_quantity=${stock},sku=${sku},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
    if(!updated.length)return send(res,404,{error:'Product not found.'});
    return send(res,200,{ok:true});
   }
   await sql`INSERT INTO public.products(tenant_id,name,slug,description,product_type,price_minor,stock_quantity,sku) VALUES(${me.tenant_id},${name},${slugify(name)+'-'+crypto.randomBytes(4).toString('hex')},${description},${type},${Math.round(price*100)},${stock},${sku})`;
   return send(res,201,{ok:true});
  }
  if(req.method==='POST'&&action==='product-status'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission.'});
   const id=String(req.body?.id||''),active=!!req.body?.active;
   const r=await sql`UPDATE public.products SET is_active=${active},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Product not found.'});
  }
  if(req.method==='DELETE'&&action==='product'){
   if(!['owner','admin'].includes(me.role))return send(res,403,{error:'Only an owner or admin can delete products.'});
   const id=String(req.query?.id||'');
   const r=await sql`DELETE FROM public.products WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Product not found.'});
  }
  if(req.method==='POST'&&action==='order-status'){
   if(!['owner','admin','editor'].includes(me.role))return send(res,403,{error:'You do not have permission.'});
   const id=String(req.body?.id||''),status=String(req.body?.status||'');
   if(!['confirmed','processing','fulfilled','cancelled'].includes(status))return send(res,400,{error:'Invalid order status.'});
   const r=await sql`UPDATE public.orders SET status=${status},updated_at=now() WHERE id=${id} AND tenant_id=${me.tenant_id} RETURNING id`;
   return r.length?send(res,200,{ok:true}):send(res,404,{error:'Order not found.'});
  }
  if(req.method==='POST'&&action==='order'){
   const b=req.body||{},name=String(b.customerName||'').trim().slice(0,120),phone=String(b.customerPhone||'').replace(/[^0-9+]/g,'').slice(0,20),items=Array.isArray(b.items)?b.items:[];
   if(!name||!/^\+?\d{9,15}$/.test(phone)||!items.length||items.length>30)return send(res,400,{error:'Enter your name, valid phone number and at least one item.'});
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