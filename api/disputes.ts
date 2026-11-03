import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

const env=(k:string)=>(process.env[k]||'').trim();
const db=()=>{const u=env('POSTGRES_URL')||env('DATABASE_URL')||env('NEON_DATABASE_URL');if(!u)throw Error('DB_CONFIG');return neon(u)};
const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
const send=(res:any,status:number,data:any)=>res.status(status).json(data);
const cookie=(req:any,name:string)=>{const c=String(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith(name+'='));try{return c?decodeURIComponent(c.slice(name.length+1)):''}catch{return ''}};
const phoneOf=(v:any)=>{let p=String(v||'').trim().replace(/[\s().-]/g,'');if(/^0[17]\d{8}$/.test(p))p='+254'+p.slice(1);else if(/^254[17]\d{8}$/.test(p))p='+'+p;return /^\+254[17]\d{8}$/.test(p)?p:''};
const fileTypes:any={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',txt:'text/plain',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'};
function awsEncode(s:string){return encodeURIComponent(s).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}
function hmac(key:any,value:string,encoding?:any){return crypto.createHmac('sha256',key).update(value).digest(encoding)}
function storageUrl(key:string,method:'PUT'|'GET',mime='application/octet-stream'){
 const endpoint=env('AWS_ENDPOINT_URL_S3'),access=env('AWS_ACCESS_KEY_ID'),secret=env('AWS_SECRET_ACCESS_KEY'),bucket=env('NEON_STORAGE_BUCKET')||'documents';
 if(!endpoint||!access||!secret)throw Error('ATTACHMENT_STORAGE_CONFIG');
 const host=new URL(endpoint).host,region=host.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/)?.[1]||env('AWS_REGION')||'us-east-2',now=new Date(),amz=now.toISOString().slice(0,19).replace(/[-:T]/g,'')+'Z',day=amz.slice(0,8),scope=day+'/'+region+'/s3/aws4_request',path='/'+bucket+'/'+key.split('/').map(awsEncode).join('/');
 const params:any={'X-Amz-Algorithm':'AWS4-HMAC-SHA256','X-Amz-Credential':access+'/'+scope,'X-Amz-Date':amz,'X-Amz-Expires':'300','X-Amz-SignedHeaders':'host'};if(method==='GET')params['response-content-disposition']='attachment';
 const query=Object.keys(params).sort().map(k=>awsEncode(k)+'='+awsEncode(params[k])).join('&'),canonical=[method,path,query,'host:'+host+'\n','host','UNSIGNED-PAYLOAD'].join('\n'),toSign=['AWS4-HMAC-SHA256',amz,scope,crypto.createHash('sha256').update(canonical).digest('hex')].join('\n');
 const kd=hmac('AWS4'+secret,day),kr=hmac(kd,region),ks=hmac(hmac(kr,'s3'),'aws4_request');
 return endpoint.replace(/\/$/,'')+path+'?'+query+'&X-Amz-Signature='+hmac(ks,toSign,'hex');
}
function validSignature(b:Buffer,m:string){if(m==='application/pdf')return b.subarray(0,5).toString()==='%PDF-';if(m==='image/jpeg')return b[0]===255&&b[1]===216&&b[2]===255;if(m==='image/png')return b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));if(m==='image/webp')return b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP';if(m==='text/plain')return !b.includes(0);if(m.includes('officedocument'))return b[0]===80&&b[1]===75;if(m==='application/msword'||m==='application/vnd.ms-excel')return b.subarray(0,4).equals(Buffer.from([208,207,17,224]));return false}
async function validateObject(key:string,mime:string,size:number){const r=await fetch(storageUrl(key,'GET'));if(!r.ok)throw Error('UPLOAD_UNAVAILABLE');const b=Buffer.from(await r.arrayBuffer());if(b.length!==size||b.length<1||b.length>10485760||!validSignature(b,mime))throw Error('UPLOAD_INVALID')}
async function actor(sql:any,req:any,tenantId:string){
 const global=cookie(req,'das_session');
 if(global){const s=await sql`SELECT u.id,u.display_name,u.phone,u.email,m.tenant_id,m.role,t.name AS shop_name FROM public.auth_sessions a JOIN public.users u ON u.id=a.user_id JOIN public.memberships m ON m.user_id=u.id JOIN public.tenants t ON t.id=m.tenant_id WHERE a.token_hash=${hash(global)} AND a.expires_at>now() AND m.tenant_id=${tenantId} AND t.status IN ('trial','active') LIMIT 1`;if(s.length)return {...s[0],role:'seller',senderRole:'seller',senderId:s[0].id,name:s[0].display_name};
  const adminPhones=env('DAS_PLATFORM_ADMIN_PHONES').split(',').map((x:string)=>phoneOf(x)).filter(Boolean);
  if(adminPhones.length){const a=await sql`SELECT u.id,u.display_name,u.phone FROM public.auth_sessions x JOIN public.users u ON u.id=x.user_id WHERE x.token_hash=${hash(global)} AND x.expires_at>now() LIMIT 1`;if(a.length&&adminPhones.includes(phoneOf(a[0].phone)))return {...a[0],role:'admin',senderRole:'admin',senderId:a[0].id,name:a[0].display_name||'DASNET Support'};}
 }
 const legacy=cookie(req,'das_buyer_session');
 const buyerToken=global||legacy;
 if(buyerToken){const b=await sql`SELECT c.id,c.full_name,c.phone,c.email,c.tenant_id FROM public.store_customers c LEFT JOIN public.auth_sessions a ON a.user_id=c.user_id AND a.token_hash=${hash(buyerToken)} AND a.expires_at>now() LEFT JOIN public.store_customer_sessions x ON x.customer_id=c.id AND x.token_hash=${hash(buyerToken)} AND x.expires_at>now() WHERE c.tenant_id=${tenantId} AND (a.user_id IS NOT NULL OR x.token_hash IS NOT NULL) AND c.is_banned=false AND (c.banned_until IS NULL OR c.banned_until<=now()) LIMIT 1`;if(b.length)return {...b[0],role:'buyer',senderRole:'buyer',senderId:b[0].id,name:b[0].full_name};}
 return null;
}
async function notify(sql:any,tenantId:string,complaintId:string,role:'buyer'|'seller'|'admin',phone:string|null,userId:string|null,title:string,detail:string){await sql`INSERT INTO public.dispute_notifications(tenant_id,complaint_id,recipient_role,recipient_phone,recipient_user_id,title,detail) VALUES(${tenantId},${complaintId},${role},${phone},${userId},${title},${detail})`}
async function loadCase(sql:any,id:string,tenantId:string){const c=await sql`SELECT c.*,t.name AS shop_name,t.slug AS shop_slug,t.created_by AS seller_user_id,u.display_name AS seller_name,u.phone AS seller_phone FROM public.shop_complaints c JOIN public.tenants t ON t.id=c.tenant_id LEFT JOIN public.users u ON u.id=t.created_by WHERE c.id=${id} AND c.tenant_id=${tenantId} LIMIT 1`;return c[0]||null}
async function escalateExpired(sql:any,tenantId:string){const rows=await sql`UPDATE public.shop_complaints SET dispute_status='escalated',status='under_review',dispute_escalated_at=now(),updated_at=now() WHERE tenant_id=${tenantId} AND dispute_status IN ('open','resolution_pending') AND dispute_deadline_at<=now() RETURNING id,buyer_phone`;for(const r of rows){await notify(sql,tenantId,r.id,'buyer',r.buyer_phone,null,'Dispute escalated to DASNET support','The one-hour resolution window has ended. DASNET support will review the case.');const seller=await sql`SELECT created_by FROM public.tenants WHERE id=${tenantId}`;await notify(sql,tenantId,r.id,'seller',null,seller[0]?.created_by||null,'Dispute escalated to DASNET support','The one-hour resolution window has ended. DASNET support will review the case.');await notify(sql,tenantId,r.id,'admin',null,null,'Dispute requires support review','A dispute has reached its one-hour deadline.');}}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return send(res,405,{error:'Method not allowed'});
 try{
  const sql=db(),b=req.body||{},slug=String(req.method==='GET'?req.query?.slug:b.slug||'').toLowerCase().trim(),shops=await sql`SELECT id,name,created_by FROM public.tenants WHERE slug=${slug} AND status IN ('trial','active','banned') LIMIT 1`;
  if(!shops.length)return send(res,404,{error:'Shop not found.'});
  const tenantId=shops[0].id,who=await actor(sql,req,tenantId);if(!who)return send(res,401,{error:'Sign in to access dispute reports.'});
  await escalateExpired(sql,tenantId);
  if(req.method==='GET'){
   const id=String(req.query?.id||'');
   if(id){
    const c=await loadCase(sql,id,tenantId);if(!c)return send(res,404,{error:'Report not found.'});
    if(who.role==='buyer'&&phoneOf(who.phone)!==phoneOf(c.buyer_phone))return send(res,403,{error:'This report belongs to another buyer.'});
    const messages=await sql`SELECT id,sender_role,sender_name,message,mentions,created_at FROM public.dispute_messages WHERE tenant_id=${tenantId} AND complaint_id=${id} ORDER BY created_at ASC LIMIT 300`;
    const attachments=await sql`SELECT id,file_name,content_type,size_bytes,created_at,uploader_role,object_key FROM public.shop_complaint_attachments WHERE tenant_id=${tenantId} AND complaint_id=${id} AND upload_status='ready' AND scan_status='unscanned' ORDER BY created_at ASC`;
    return send(res,200,{report:c,messages,attachments:attachments.map((a:any)=>({...a,download_url:storageUrl(a.object_key,'GET')})),viewerRole:who.role,serverTime:new Date().toISOString()});
   }
   const rows=who.role==='seller'?await sql`SELECT c.id,c.buyer_name,c.buyer_phone,c.issue_type,c.details,c.status,c.dispute_status,c.dispute_initiated_by,c.dispute_deadline_at,c.resolution_proposed_by,c.resolution_note,c.created_at,c.updated_at,o.order_number FROM public.shop_complaints c LEFT JOIN public.orders o ON o.id=c.order_id AND o.tenant_id=c.tenant_id WHERE c.tenant_id=${tenantId} ORDER BY c.created_at DESC LIMIT 200`:await sql`SELECT c.id,c.buyer_name,c.issue_type,c.details,c.status,c.dispute_status,c.dispute_initiated_by,c.dispute_deadline_at,c.resolution_proposed_by,c.resolution_note,c.created_at,c.updated_at,o.order_number FROM public.shop_complaints c LEFT JOIN public.orders o ON o.id=c.order_id AND o.tenant_id=c.tenant_id WHERE c.tenant_id=${tenantId} AND right(regexp_replace(c.buyer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${who.phone},'[^0-9]','','g'),9) ORDER BY c.created_at DESC LIMIT 100`;
   const notifications=who.role==='buyer'?await sql`SELECT id,title,detail,created_at,read_at,complaint_id FROM public.dispute_notifications WHERE tenant_id=${tenantId} AND recipient_role='buyer' AND right(regexp_replace(recipient_phone,'[^0-9]','','g'),9)=right(regexp_replace(${who.phone},'[^0-9]','','g'),9) ORDER BY created_at DESC LIMIT 12`:who.role==='seller'?await sql`SELECT id,title,detail,created_at,read_at,complaint_id FROM public.dispute_notifications WHERE tenant_id=${tenantId} AND recipient_role='seller' AND recipient_user_id=${who.senderId} ORDER BY created_at DESC LIMIT 12`:await sql`SELECT id,title,detail,created_at,read_at,complaint_id FROM public.dispute_notifications WHERE tenant_id=${tenantId} AND recipient_role='admin' ORDER BY created_at DESC LIMIT 20`;
   return send(res,200,{reports:rows,notifications,viewerRole:who.role,serverTime:new Date().toISOString()});
  }
  const action=String(b.action||''),id=String(b.id||'');
  if(action==='mark_notifications_read'){const ids=Array.isArray(b.notificationIds)?b.notificationIds.filter((x:any)=>/^[0-9a-f-]{36}$/i.test(String(x))).slice(0,50):[];if(ids.length){if(who.role==='buyer')await sql`UPDATE public.dispute_notifications SET read_at=now() WHERE tenant_id=${tenantId} AND id=ANY(${ids}::uuid[]) AND recipient_role='buyer' AND right(regexp_replace(recipient_phone,'[^0-9]','','g'),9)=right(regexp_replace(${who.phone},'[^0-9]','','g'),9)`;else if(who.role==='seller')await sql`UPDATE public.dispute_notifications SET read_at=now() WHERE tenant_id=${tenantId} AND id=ANY(${ids}::uuid[]) AND recipient_role='seller' AND recipient_user_id=${who.senderId}`;else await sql`UPDATE public.dispute_notifications SET read_at=now() WHERE tenant_id=${tenantId} AND id=ANY(${ids}::uuid[]) AND recipient_role='admin'`;}return send(res,200,{ok:true});}
  if(action==='open'){
   const issue=String(b.issueType||'other'),details=String(b.details||'').trim().slice(0,5000),orderId=String(b.orderId||'').trim()||null;
   if(details.length<10)return send(res,400,{error:'Describe the issue in at least 10 characters.'});
   if(!['payment','delivery','product_quality','wrong_item','seller_communication','refund_return','shop_listing','other'].includes(issue))return send(res,400,{error:'Choose a valid issue type.'});
   let buyer:any;
   if(who.role==='buyer'){buyer={phone:who.phone,name:who.name};}
   else {const p=phoneOf(b.buyerPhone);if(!p)return send(res,400,{error:'Enter the buyer phone number.'});const found=await sql`SELECT phone,full_name FROM public.store_customers WHERE tenant_id=${tenantId} AND right(regexp_replace(phone,'[^0-9]','','g'),9)=right(regexp_replace(${p},'[^0-9]','','g'),9) LIMIT 1`;if(!found.length)return send(res,404,{error:'Buyer profile not found in this shop.'});buyer={phone:found[0].phone,name:found[0].full_name};}
   if(orderId){const owned=await sql`SELECT id FROM public.orders WHERE id=${orderId} AND tenant_id=${tenantId} AND right(regexp_replace(customer_phone,'[^0-9]','','g'),9)=right(regexp_replace(${buyer.phone},'[^0-9]','','g'),9) LIMIT 1`;if(!owned.length)return send(res,403,{error:'The selected order does not belong to this buyer.'});}
   const row=await sql`INSERT INTO public.shop_complaints(tenant_id,order_id,buyer_phone,buyer_name,issue_type,details,payment_made,status,dispute_status,dispute_initiated_by,dispute_deadline_at) VALUES(${tenantId},${orderId},${buyer.phone},${buyer.name||'Buyer'},${issue},${details},false,'open','open',${who.role},now()+interval '1 hour') RETURNING id,created_at,dispute_deadline_at`;
   const id2=row[0].id;
   await sql`INSERT INTO public.dispute_messages(tenant_id,complaint_id,sender_role,sender_id,sender_name,message) VALUES(${tenantId},${id2},${who.role},${who.senderId},${who.name},${'Report opened: '+details})`;
   await notify(sql,tenantId,id2,who.role==='buyer'?'seller':'buyer',who.role==='seller'?buyer.phone:null,who.role==='buyer'?shops[0].created_by:null,'A report has been initiated',who.role==='buyer'?'A buyer has opened a report. You can now discuss it in the dispute chat.':'The seller has opened a report concerning your order. You can now discuss it in the dispute chat.');
   await notify(sql,tenantId,id2,who.role,who.role==='buyer'?buyer.phone:null,who.role==='seller'?who.senderId:null,'Report opened successfully','Your report is now open. Both parties can communicate in the case chat for one hour.');
   await notify(sql,tenantId,id2,'admin',null,null,'New dispute report','A new buyer/seller report has been opened.');
   return send(res,201,{ok:true,id:id2,deadlineAt:row[0].dispute_deadline_at});
  }
  const c=await loadCase(sql,id,tenantId);if(!c)return send(res,404,{error:'Report not found.'});
  if(who.role==='buyer'&&phoneOf(who.phone)!==phoneOf(c.buyer_phone))return send(res,403,{error:'This report belongs to another buyer.'});
  if(['resolved','closed'].includes(c.dispute_status)||(c.dispute_status==='escalated'&&who.role!=='admin'))return send(res,409,{error:'This dispute is closed or escalated and can no longer be changed by the parties.'});
  if(action==='message'){
   const message=String(b.message||'').trim().slice(0,4000);if(!message)return send(res,400,{error:'Write a message first.'});
   if(who.role!=='admin'&&c.dispute_deadline_at&&new Date(c.dispute_deadline_at).getTime()<=Date.now())return send(res,409,{error:'The one-hour resolution window has ended. This case is being escalated.'});
   const mentions=[...new Set((message.match(/@(buyer|seller)\b/gi)||[]).map((x:string)=>x.toLowerCase().slice(1)))];
   const row=await sql`INSERT INTO public.dispute_messages(tenant_id,complaint_id,sender_role,sender_id,sender_name,message,mentions) VALUES(${tenantId},${id},${who.role},${who.senderId},${who.name},${message},${mentions}) RETURNING id,created_at`;
   const target=who.role==='buyer'?'seller':'buyer';
   if(who.role==='admin'){await notify(sql,tenantId,id,'buyer',c.buyer_phone,null,'DASNET support replied',who.name+' sent a message in your dispute.');await notify(sql,tenantId,id,'seller',null,c.seller_user_id,'DASNET support replied',who.name+' sent a message in the dispute.');}
   else await notify(sql,tenantId,id,target,target==='buyer'?c.buyer_phone:null,target==='seller'?c.seller_user_id:null,'New dispute message',who.name+' sent a message in report '+id.slice(0,8)+'.');
   for(const mention of mentions){const mr=mention==='buyer'?'buyer':'seller';if(mr!==who.role)await notify(sql,tenantId,id,mr,mr==='buyer'?c.buyer_phone:null,mr==='seller'?c.seller_user_id:null,'You were mentioned in a dispute',who.name+' mentioned @'+mr+' in the report chat.');}
   return send(res,201,{ok:true,message:row[0]});
  }
  if(action==='propose_resolution'){if(who.role==='admin')return send(res,403,{error:'Only the buyer or seller can propose a resolution.'});
   const note=String(b.note||'').trim().slice(0,1500);if(note.length<5)return send(res,400,{error:'Describe how the issue has been resolved.'});
   const next=who.role==='buyer'?'seller':'buyer';
   const updated=await sql`UPDATE public.shop_complaints SET dispute_status='resolution_pending',resolution_proposed_by=${who.role},resolution_note=${note},resolution_proposed_at=now(),updated_at=now() WHERE id=${id} AND tenant_id=${tenantId} AND dispute_status='open' AND dispute_deadline_at>now() RETURNING id`;
   if(!updated.length)return send(res,409,{error:'A resolution is already pending or the one-hour window has ended.'});
   await notify(sql,tenantId,id,next,next==='buyer'?c.buyer_phone:null,next==='seller'?c.seller_user_id:null,'Resolution proposed',who.name+' marked the issue as resolved. Accept or reject the proposal in the report.');
   await sql`INSERT INTO public.dispute_messages(tenant_id,complaint_id,sender_role,sender_id,sender_name,message) VALUES(${tenantId},${id},${who.role},${who.senderId},${who.name},${'Proposed resolution: '+note})`;
   return send(res,200,{ok:true,status:'resolution_pending'});
  }
  if(action==='respond_resolution'){if(who.role==='admin')return send(res,403,{error:'Only the other party can accept or reject a resolution.'});
   if(c.dispute_status!=='resolution_pending'||c.resolution_proposed_by===who.role)return send(res,409,{error:'Only the other party can respond to this resolution proposal.'});
   const decision=String(b.decision||'');if(!['accept','reject'].includes(decision))return send(res,400,{error:'Choose accept or reject.'});
   const status=decision==='accept'?'closed':'escalated';
   const updated=await sql`UPDATE public.shop_complaints SET dispute_status=${status},status=${decision==='accept'?'resolved':'under_review'},dispute_closed_at=${decision==='accept'?'now()':null},dispute_escalated_at=${decision==='reject'?'now()':null},updated_at=now() WHERE id=${id} AND tenant_id=${tenantId} AND dispute_status='resolution_pending' RETURNING id`;
   if(!updated.length)return send(res,409,{error:'This case has already changed. Refresh and try again.'});
   await sql`INSERT INTO public.dispute_messages(tenant_id,complaint_id,sender_role,sender_id,sender_name,message) VALUES(${tenantId},${id},${who.role},${who.senderId},${who.name},${decision==='accept'?'Resolution accepted. Case closed.':'Resolution rejected. Case escalated to DASNET support.'})`;
   const other=who.role==='buyer'?'seller':'buyer';
   await notify(sql,tenantId,id,other,other==='buyer'?c.buyer_phone:null,other==='seller'?c.seller_user_id:null,decision==='accept'?'Dispute closed':'Dispute escalated',decision==='accept'?'The resolution was accepted. This case is now closed.':'The proposed resolution was rejected. DASNET support will review the case.');
   if(decision==='reject')await notify(sql,tenantId,id,'admin',null,null,'Dispute escalated to support','A party rejected the proposed resolution.');
   return send(res,200,{ok:true,status});
  }
  if(action==='attachment-upload'||action==='attachment-complete'){
   const name=String(b.fileName||''),mime=String(b.contentType||''),size=Number(b.size||0),ext=(name.split('.').pop()||'').toLowerCase();
   if(action==='attachment-upload'){
    if(!fileTypes[ext]||fileTypes[ext]!==mime)return send(res,415,{error:'Use PDF, DOC/DOCX, XLS/XLSX, TXT, JPG, PNG or WEBP.'});
    if(!Number.isSafeInteger(size)||size<1||size>10485760)return send(res,413,{error:'Each evidence file must be 10 MB or smaller.'});
    const aid=crypto.randomUUID(),key=tenantId+'/disputes/'+id+'/'+aid+'-'+name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,100);
    await sql`INSERT INTO public.shop_complaint_attachments(id,tenant_id,complaint_id,buyer_phone,uploader_role,uploaded_by,object_key,file_name,content_type,size_bytes,upload_status,scan_status) VALUES(${aid},${tenantId},${id},${c.buyer_phone},${who.role},${who.senderId},${key},${name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)},${mime},${size},'pending','unscanned')`;
    return send(res,200,{ok:true,attachmentId:aid,uploadUrl:storageUrl(key,'PUT',mime)});
   }
   const aid=String(b.attachmentId||''),pending=await sql`SELECT id,object_key,content_type,size_bytes FROM public.shop_complaint_attachments WHERE id=${aid} AND tenant_id=${tenantId} AND complaint_id=${id} AND uploaded_by=${who.senderId} AND upload_status='pending' LIMIT 1`;
   if(!pending.length)return send(res,404,{error:'Evidence upload was not found.'});
   try{await validateObject(pending[0].object_key,pending[0].content_type,Number(pending[0].size_bytes));await sql`UPDATE public.shop_complaint_attachments SET upload_status='ready',scan_status='unscanned' WHERE id=${aid} AND tenant_id=${tenantId}`;return send(res,200,{ok:true});}catch{return send(res,415,{error:'Evidence file failed size or file-signature verification and was rejected.'});}
  }
  return send(res,400,{error:'Unknown dispute action.'});
 }catch(e:any){console.error('DASNET disputes API',e?.message||e);return send(res,e?.message==='DB_CONFIG'?503:500,{error:e?.message==='ATTACHMENT_STORAGE_CONFIG'?'Evidence storage is not configured.':'Could not process this dispute request. Check the server logs and migration status.'})}
}
