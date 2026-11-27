import crypto from 'node:crypto';
import { getDb } from '../server/db.js';

const send=(res:any,s:number,b:unknown)=>res.status(s).json(b);
const db=()=>getDb();
const storageEnv=(k:string)=>(process.env[k]||'').trim();
function awsEncode(s:string){return encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}
function hmac(key:any,value:string,encoding?:any){return crypto.createHmac('sha256',key).update(value).digest(encoding)}

let cachedStorageConfig:{endpoint:string;endpointClean:string;access:string;secret:string;host:string;region:string;bucket:string}|null=null;
function getStorageConfig(){
 if(cachedStorageConfig)return cachedStorageConfig;
 const endpoint=storageEnv('AWS_ENDPOINT_URL_S3'),access=storageEnv('AWS_ACCESS_KEY_ID'),secret=storageEnv('AWS_SECRET_ACCESS_KEY'),configuredRegion=storageEnv('AWS_REGION'),bucket=storageEnv('NEON_STORAGE_BUCKET')||'documents';
 if(!endpoint||!access||!secret)throw Error('ATTACHMENT_STORAGE_CONFIG');
 const host=new URL(endpoint).host,endpointRegion=host.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/)?.[1],region=endpointRegion||configuredRegion||'us-east-2';
 cachedStorageConfig={endpoint,endpointClean:endpoint.replace(/\/$/,''),access,secret,host,region,bucket};
 return cachedStorageConfig;
}

function storageUrl(key:string,method:'PUT'|'GET'){
 const cfg=getStorageConfig();
 const now=new Date(),amz=now.toISOString().slice(0,19).replace(/[-:T]/g,'')+'Z',day=amz.slice(0,8),scope=day+'/'+cfg.region+'/s3/aws4_request',path='/'+cfg.bucket+'/'+key.split('/').map(awsEncode).join('/');
 const params:any={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':cfg.access+'/'+scope,'X-Amz-Date':amz,'X-Amz-Expires':'300','X-Amz-SignedHeaders':'host'};
 const canonicalQuery=Object.keys(params).sort().map(k=>awsEncode(k)+'='+awsEncode(params[k])).join('&');
 const canonical=[method,path,canonicalQuery,'host:'+cfg.host+'\n','host','UNSIGNED-PAYLOAD'].join('\n');
 const toSign=['AWS4-HMAC-SHA256',amz,scope,crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
 const kDate=hmac('AWS4'+cfg.secret,day),kRegion=hmac(kDate,cfg.region),kService=hmac(kRegion,'s3'),kSigning=hmac(kService,'aws4_request'),signature=hmac(kSigning,toSign,'hex');
 return cfg.endpointClean+path+'?'+canonicalQuery+'&X-Amz-Signature='+signature;
}

let cashColumnsPromise:Promise<void>|null=null;
function ensureCashColumns(sql:any){
 if(!cashColumnsPromise){
  cashColumnsPromise=(async()=>{
   await sql`ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS cash_on_delivery_enabled boolean NOT NULL DEFAULT false`;
   await sql`ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS cash_on_pickup_enabled boolean NOT NULL DEFAULT false`;
  })().catch(err=>{cashColumnsPromise=null;throw err;});
 }
 return cashColumnsPromise;
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
 return {id:p.id,name:p.name,description:p.description,images,imageUrl:images[0]||'',category:String(p.metadata?.category||(p.product_type==='data_bundle'?'Data bundles':p.product_type==='digital'?'Digital products':'Shop products')),parentCategory:String(p.metadata?.parent_category||''),spotlight:Boolean(p.metadata?.spotlight),testProduct:Boolean(p.metadata?.test_product),type:p.product_type,price:Number(p.price_minor)/100,currency:p.currency,stockQuantity:p.stock_quantity,active:p.is_active,sku:p.sku||'',ratingAverage:Number(p.rating_average||0),ratingCount:Number(p.rating_count||0),...(includeMetadata?{metadata:p.metadata||{}}:{})};
}

export default async function handler(req:any,res:any){
 res.setHeader('Vary','Host');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return send(res,405,{error:'Method not allowed'});}
 try{
  const sql=db();
  let slug=String(req.query?.slug||'').toLowerCase().trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim().split(':')[0].toLowerCase();
  const customHost=Boolean(host&&host!=='dasmarket.co.ke'&&host!=='www.dasmarket.co.ke'&&!host.endsWith('.dasmarket.co.ke')&&!host.endsWith('.vercel.app')&&!host.endsWith('.run.app')&&!host.endsWith('.googleusercontent.com')&&!host.endsWith('.aistudio.google.com')&&host!=='localhost'&&host!=='127.0.0.1');
  if(customHost){
   const mapped=await sql`SELECT t.slug FROM public.domains d JOIN public.tenants t ON t.id=d.tenant_id WHERE lower(d.hostname)=${host} AND (d.verified_at IS NOT NULL OR d.verification_data->>'storefrontVerified'='true') AND COALESCE(d.status,'pending') IN ('active','pending') AND t.status IN ('trial','active') LIMIT 1`;
   const mappedSlug=String(mapped[0]?.slug||'');
   if(!mappedSlug||(slug&&slug!==mappedSlug)){res.setHeader('Cache-Control','no-store');return send(res,404,{error:'This domain is not connected to this shop.'});}
   slug=mappedSlug;
  }
  if(!slug){res.setHeader('Cache-Control','no-store');return send(res,400,{error:'Shop slug is required'});}
  if(!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)){res.setHeader('Cache-Control','no-store');return send(res,400,{error:'Invalid shop slug'});}

  const requestedLimit=Math.max(1,Math.min(60,Number(req.query?.limit)||35));
  const requestedOffset=Math.max(0,Number(req.query?.offset)||0);
  const requestedSearch=String(req.query?.search||'').trim().slice(0,120);
  const requestedCategory=String(req.query?.category||'').trim().slice(0,100);
  const requestedProductKey=String(req.query?.productKey||'').trim().slice(0,120);
  const requestedIds=String(req.query?.ids||'').split(',').map((id:string)=>id.trim()).filter((id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)).slice(0,50);
  const searchPattern=requestedSearch?('%'+requestedSearch+'%'):'';

  await ensureCashColumns(sql);

  const rows=await sql`WITH expired_sub AS (
    UPDATE public.tenants t
    SET status='past_due',updated_at=now()
    WHERE t.slug=${slug} AND t.status IN ('trial','active') AND NOT EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.tenant_id=t.id AND ((s.status='trialing' AND COALESCE(s.trial_ends_at,s.current_period_end)>now()) OR (s.status='active' AND s.current_period_end>now()))
    )
    RETURNING id
  ), expired_ban AS (
    UPDATE public.tenants
    SET status=COALESCE(NULLIF(status_before_ban,'banned'),'active'),status_before_ban=NULL,ban_reason=NULL,ban_expires_at=NULL,updated_at=now()
    WHERE slug=${slug} AND status='banned' AND ban_expires_at IS NOT NULL AND ban_expires_at<=now()
    RETURNING id
  ), target_tenant AS (
    SELECT t.id,t.name,t.slug
    FROM public.tenants t
    WHERE t.slug=${slug}
      AND t.id NOT IN (SELECT id FROM expired_sub)
      AND (t.status IN ('trial','active') OR t.id IN (SELECT id FROM expired_ban))
    LIMIT 1
  ), filtered_products AS (
    SELECT p.* FROM public.products p JOIN target_tenant t ON t.id=p.tenant_id
    WHERE p.is_active=true
      AND (${requestedSearch}='' OR concat_ws(' ',p.name,p.description,p.sku,COALESCE(p.metadata->>'category',''),COALESCE(p.metadata->>'parent_category',''),p.product_type) ILIKE ${searchPattern})
      AND (${requestedCategory}='' OR EXISTS (
        SELECT 1 FROM unnest(string_to_array(${requestedCategory},'|')) AS selected(value)
        WHERE lower(trim(COALESCE(p.metadata->>'parent_category','')))=lower(trim(selected.value))
          OR lower(trim(COALESCE(p.metadata->>'category',CASE WHEN p.product_type='data_bundle' THEN 'Data bundles' WHEN p.product_type='digital' THEN 'Digital products' ELSE 'Shop products' END)))=lower(trim(selected.value))
          OR EXISTS (
            SELECT 1 FROM unnest(string_to_array(COALESCE(p.metadata->>'category',''),'>')) AS category_part(value)
            WHERE lower(trim(category_part.value))=lower(trim(selected.value))
          )
      ))
      AND (cardinality(${requestedIds}::uuid[])=0 OR p.id=ANY(${requestedIds}::uuid[]))
      AND (${requestedProductKey}='' OR p.sku=${requestedProductKey} OR p.id::text=${requestedProductKey})
  ), product_page_base AS (
    SELECT p.id,p.name,p.description,p.product_type,p.price_minor,p.currency,p.stock_quantity,p.is_active,p.images,p.metadata,p.sku,p.created_at
    FROM filtered_products p ORDER BY p.created_at DESC,p.id DESC LIMIT ${requestedLimit} OFFSET ${requestedOffset}
  ), review_stats AS (
    SELECT r.product_id,AVG(r.rating)::numeric(3,2) AS rating_average,COUNT(*)::int AS rating_count
    FROM public.product_reviews r
    JOIN product_page_base p ON p.id=r.product_id
    WHERE r.status='published'
    GROUP BY r.product_id
  ), product_page AS (
    SELECT p.*,COALESCE(rs.rating_average,0) AS rating_average,COALESCE(rs.rating_count,0) AS rating_count
    FROM product_page_base p LEFT JOIN review_stats rs ON rs.product_id=p.id
  ), page_data AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'description',p.description,'product_type',p.product_type,'price_minor',p.price_minor,'currency',p.currency,'stock_quantity',p.stock_quantity,'is_active',p.is_active,'images',p.images,'metadata',p.metadata,'sku',p.sku,'rating_average',p.rating_average,'rating_count',p.rating_count) ORDER BY p.created_at DESC,p.id DESC),'[]'::jsonb) AS products FROM product_page p
  ), product_total AS (SELECT COUNT(*)::int AS total FROM filtered_products)
  SELECT t.id AS tenant_id,t.name AS shop_name,t.slug,
    s.description,s.logo_url,s.whatsapp_number,s.contact_phone,s.contact_email,
    s.terms_and_conditions,s.privacy_policy,s.return_policy,s.delivery_policy,
    s.delivery_home_fee_minor,s.delivery_pickup_fee_minor,s.cash_on_delivery_enabled,s.cash_on_pickup_enabled,s.storefront_faqs,s.storefront_theme,
    COALESCE(pd.products,'[]'::jsonb) AS products,pt.total AS product_total
  FROM target_tenant t
  LEFT JOIN public.sites s ON s.tenant_id=t.id
  CROSS JOIN page_data pd CROSS JOIN product_total pt`;

  if(!rows.length){res.setHeader('Cache-Control','no-store');return send(res,404,{error:'Shop not found'});}
  const row=rows[0];
  res.setHeader('Cache-Control',customHost?'private, no-store, max-age=0':'public, max-age=0, s-maxage=30, stale-while-revalidate=120');
  return send(res,200,{shop:{name:row.shop_name,slug:row.slug,description:row.description||'',logoUrl:typeof row.logo_url==='string'&&row.logo_url.startsWith('data:')&&row.logo_url.length>65536?'':row.logo_url||'',whatsappNumber:row.contact_phone||row.whatsapp_number||'',contactPhone:row.contact_phone||row.whatsapp_number||'',contactEmail:row.contact_email||'',termsAndConditions:row.terms_and_conditions||'',privacyPolicy:row.privacy_policy||'',returnPolicy:row.return_policy||'',deliveryPolicy:row.delivery_policy||'',deliveryHomeFee:Number(row.delivery_home_fee_minor||0)/100,deliveryPickupFee:Number(row.delivery_pickup_fee_minor||0)/100,cashOnDeliveryEnabled:!!row.cash_on_delivery_enabled,cashOnPickupEnabled:!!row.cash_on_pickup_enabled,faqs:Array.isArray(row.storefront_faqs)?row.storefront_faqs:[],theme:/^#[0-9a-f]{6}$/i.test(String(row.storefront_theme||''))?row.storefront_theme:'#e47a13'},products:(row.products||[]).map((p:any)=>productOut(p,false)),totalProducts:Number(row.product_total||0),nextOffset:requestedOffset+(row.products||[]).length,hasMore:requestedOffset+(row.products||[]).length<Number(row.product_total||0)});
 }catch(error:any){
  console.error('storefront API error',error);
  res.setHeader('Cache-Control','no-store');
  return send(res,500,{error:error?.message==='DB_CONFIG'?'Storefront database is not configured':'Could not load shop'});
 }
}
