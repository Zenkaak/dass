import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(k:string)=>(process.env[k]||'').trim();
const send=(res:any,s:number,b:unknown)=>res.status(s).json(b);
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
const storageEnv=(k:string)=>(process.env[k]||'').trim();
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
 res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=300');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Method not allowed'});}
 try{
  const sql=db();
  let slug=String(req.query?.slug||'').toLowerCase().trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().split(':')[0].toLowerCase();
  const customHost=Boolean(host&&host!=='dasmarket.co.ke'&&host!=='www.dasmarket.co.ke'&&!host.endsWith('.dasmarket.co.ke')&&!host.endsWith('.vercel.app')&&host!=='localhost'&&host!=='127.0.0.1');
  if(customHost){
   const mapped=await sql`SELECT t.slug FROM public.domains d JOIN public.tenants t ON t.id=d.tenant_id WHERE lower(d.hostname)=${host} AND d.verified_at IS NOT NULL AND COALESCE(d.status,'active')='active' AND t.status IN ('trial','active') LIMIT 1`;
   const mappedSlug=String(mapped[0]?.slug||'');
   if(!mappedSlug|| (slug&&slug!==mappedSlug))return send(res,404,{error:'This domain is not connected to this shop.'});
   slug=mappedSlug;res.setHeader('Cache-Control','private, no-store, max-age=0');
  }
  if(!slug)return send(res,400,{error:'Shop slug is required'});
  const requestedLimit=Math.max(1,Math.min(60,Number(req.query?.limit)||35));
  const requestedOffset=Math.max(0,Number(req.query?.offset)||0);
  const rows=await sql`WITH expired_ban AS (
    UPDATE public.tenants
    SET status=COALESCE(NULLIF(status_before_ban,'banned'),'active'),status_before_ban=NULL,ban_reason=NULL,ban_expires_at=NULL,updated_at=now()
    WHERE slug=${slug} AND status='banned' AND ban_expires_at IS NOT NULL AND ban_expires_at<=now()
    RETURNING id
  ), target_tenant AS (
    SELECT t.id,t.name,t.slug
    FROM public.tenants t
    WHERE t.slug=${slug} AND (t.status IN ('trial','active') OR t.id IN (SELECT id FROM expired_ban))
    LIMIT 1
  ), review_stats AS (
    SELECT r.product_id,AVG(r.rating)::numeric(3,2) AS rating_average,COUNT(*)::int AS rating_count
    FROM public.product_reviews r
    JOIN target_tenant t ON t.id=r.tenant_id
    WHERE r.status='published'
    GROUP BY r.product_id
  ), product_page AS (
    SELECT p.id,p.name,p.description,p.product_type,p.price_minor,p.currency,p.stock_quantity,p.is_active,p.images,p.metadata,p.sku,COALESCE(rs.rating_average,0) AS rating_average,COALESCE(rs.rating_count,0) AS rating_count
    FROM public.products p JOIN target_tenant t ON t.id=p.tenant_id LEFT JOIN review_stats rs ON rs.product_id=p.id
    WHERE p.is_active=true ORDER BY p.created_at DESC LIMIT ${requestedLimit} OFFSET ${requestedOffset}
  ), page_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'product_type',p.product_type,'price_minor',p.price_minor,'currency',p.currency,'stock_quantity',p.stock_quantity,'is_active',p.is_active,'images',p.images,'metadata',p.metadata,'sku',p.sku,'rating_average',p.rating_average,'rating_count',p.rating_count) ORDER BY p.id),'[]'::jsonb) AS products FROM product_page p
  ), product_total AS (SELECT COUNT(*)::int AS total FROM public.products p JOIN target_tenant t ON t.id=p.tenant_id WHERE p.is_active=true)
  SELECT t.id AS tenant_id,t.name AS shop_name,t.slug,
    s.description,s.logo_url,s.whatsapp_number,s.contact_phone,s.contact_email,
    s.terms_and_conditions,s.privacy_policy,s.return_policy,s.delivery_policy,
    s.delivery_home_fee_minor,s.delivery_pickup_fee_minor,s.storefront_faqs,s.storefront_theme,
    COALESCE(pd.products,'[]'::jsonb) AS products,pt.total AS product_total
  FROM target_tenant t
  LEFT JOIN public.sites s ON s.tenant_id=t.id
  CROSS JOIN page_data pd CROSS JOIN product_total pt`;
  if(!rows.length)return send(res,404,{error:'Shop not found'});
  const row=rows[0];
  res.setHeader('Cache-Control','public, s-maxage=30, stale-while-revalidate=120');
  return send(res,200,{shop:{name:row.shop_name,slug:row.slug,description:row.description||'',logoUrl:typeof row.logo_url==='string'&&row.logo_url.startsWith('data:')&&row.logo_url.length>65536?'':row.logo_url||'',whatsappNumber:row.whatsapp_number||'',contactPhone:row.contact_phone||row.whatsapp_number||'',contactEmail:row.contact_email||'',termsAndConditions:row.terms_and_conditions||'',privacyPolicy:row.privacy_policy||'',returnPolicy:row.return_policy||'',deliveryPolicy:row.delivery_policy||'',deliveryHomeFee:Number(row.delivery_home_fee_minor||0)/100,deliveryPickupFee:Number(row.delivery_pickup_fee_minor||0)/100,faqs:Array.isArray(row.storefront_faqs)?row.storefront_faqs:[],theme:/^#[0-9a-f]{6}$/i.test(String(row.storefront_theme||''))?row.storefront_theme:'#e47a13'},products:(row.products||[]).map((p:any)=>productOut(p,false)),totalProducts:Number(row.product_total||0),nextOffset:requestedOffset+(row.products||[]).length,hasMore:requestedOffset+(row.products||[]).length<Number(row.product_total||0)});

  return send(res,404,{error:'Shop not found'});
 }catch(error:any){
  console.error('storefront API error',error);
  return send(res,500,{error:error?.message==='DB_CONFIG'?'Storefront database is not configured':'Could not load shop'});
 }
}
