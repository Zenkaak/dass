import { getDb, hasDatabaseConfig } from '../../server/db.js';
import {
  extractPaystackFailureReason,
  getCentralPaystackCredentials,
  getSellerPaystackCredentials,
  logPaymentCallbackFailure,
  resolveSafeReturnOrigin,
  sanitizeRequestHostOrigin,
} from '../../server/paystack.js';

export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return res.status(405).send('Method not allowed');
 const reference=String(req.query?.reference||req.query?.trxref||'').trim();
 if(!/^[A-Za-z0-9.=:_-]{8,100}$/.test(reference)){
  logPaymentCallbackFailure({provider:'paystack',stage:'callback',reference:reference||null,httpStatus:400,reason:'invalid_reference',severity:'warn'});
  return res.status(400).send('Invalid payment reference.');
 }
 if(!hasDatabaseConfig()){
  logPaymentCallbackFailure({provider:'paystack',stage:'callback',reference,httpStatus:503,reason:'database_unavailable'});
  return res.status(503).send('Payment service temporarily unavailable.');
 }
 try{
  const sql=getDb();
  const rows=await sql`SELECT p.id,p.order_id,p.amount_minor,p.currency,p.status,p.payment_route,p.provider_result,p.tenant_id,o.order_number,t.slug,d.hostname,
   ARRAY(SELECT hostname FROM public.domains WHERE tenant_id=t.id AND (verified_at IS NOT NULL OR status='active' OR verification_data->>'storefrontVerified'='true' OR verification_data->'config'->>'misconfigured'='false')) AS verified_hosts,
   ARRAY(SELECT COALESCE(NULLIF(verification_data->>'adminHostname',''), CASE WHEN hostname NOT LIKE '%.dasmarket.co.ke' THEN 'adm.' || hostname ELSE NULL END) FROM public.domains WHERE tenant_id=t.id AND hostname NOT LIKE '%.dasmarket.co.ke' AND (verified_at IS NOT NULL OR status='active' OR verification_data->>'adminVerified'='true' OR verification_data->'adminConfig'->>'misconfigured'='false')) AS verified_admin_hosts
   FROM public.payments p
   LEFT JOIN public.orders o ON o.id=p.order_id AND o.tenant_id=p.tenant_id
   JOIN public.tenants t ON t.id=p.tenant_id
   LEFT JOIN public.domains d ON d.tenant_id=t.id AND d.is_primary=true
   WHERE p.provider='paystack' AND p.provider_reference=${reference} LIMIT 1`;
  if(!rows.length){
   logPaymentCallbackFailure({provider:'paystack',stage:'callback',reference,httpStatus:404,reason:'payment_reference_not_found',severity:'warn'});
   return res.status(404).send('We could not find this payment. Please contact the shop.');
  }
  const p=rows[0];
  let credentials;
  try{
   credentials=p.payment_route==='own_paystack'?await getSellerPaystackCredentials(String(p.tenant_id)):await getCentralPaystackCredentials();
  }catch(credError:any){
   logPaymentCallbackFailure({provider:'paystack',stage:'callback',reference,paymentId:String(p.id),orderId:p.order_id?String(p.order_id):null,orderNumber:p.order_number?String(p.order_number):null,tenantId:String(p.tenant_id),paymentRoute:String(p.payment_route||''),httpStatus:503,reason:'credential_load_failed',error:credError});
   return res.status(503).send('Payment verification is temporarily unavailable. Refresh your order status shortly.');
  }

  const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{headers:{Authorization:'Bearer '+credentials.secretKey,Accept:'application/json'},signal:AbortSignal.timeout(12000)});
  const result:any=await response.json().catch(()=>({})),tx=result?.data;
  const analysis=extractPaystackFailureReason(result,response.status);
  const referenceMatched=String(tx?.reference||'')===reference;
  const currencyMatched=String(tx?.currency||'').toUpperCase()==='KES'&&String(p.currency||'').trim().toUpperCase()==='KES';
  const amountMatched=Number(tx?.amount)===Number(p.amount_minor);
  const verified=Boolean(response.ok&&result?.status&&tx?.status==='success'&&referenceMatched&&amountMatched&&currencyMatched);
  const isSubscription=['seller_subscription','seller_lifetime_license'].includes(String(p.provider_result?.source||''));

  let settledOnCallback=verified&&String(p.status)==='succeeded';
  if(verified&&!settledOnCallback){
   if(isSubscription){
    const source=String(p.provider_result?.source||'');
    const planId=String(p.provider_result?.planId||''),intervalDays=Number(p.provider_result?.intervalDays),lifetime=source==='seller_lifetime_license';
    if(/^[0-9a-f-]{36}$/i.test(planId)&&(lifetime?intervalDays===36500:[30,90,180,365].includes(intervalDays))){
     const settlement=await sql`WITH payment_mark AS (
      UPDATE public.payments SET status='succeeded',provider_receipt=${String(tx.id||reference)},verified_at=now(),provider_result=COALESCE(provider_result,'{}'::jsonb)||${JSON.stringify({paystack:{reference,channel:tx.channel||null,paidAt:tx.paid_at||null},callbackSettlement:true})}::jsonb,updated_at=now()
      WHERE id=${p.id} AND tenant_id=${p.tenant_id} AND status IN ('initiated','pending') RETURNING id,tenant_id
     ), current_subscription AS (
      SELECT s.id FROM public.subscriptions s WHERE s.tenant_id=${p.tenant_id}
        AND EXISTS(SELECT 1 FROM payment_mark) ORDER BY s.created_at DESC LIMIT 1
     ), updated_subscription AS (
      UPDATE public.subscriptions s SET plan_id=${planId},status='active',trial_ends_at=NULL,current_period_start=now(),
        current_period_end=CASE WHEN ${lifetime} THEN '9999-12-31 23:59:59+00'::timestamptz ELSE now()+make_interval(days=>${intervalDays}) END,
        provider_payment_id=pm.id,updated_at=now()
      FROM current_subscription cs,payment_mark pm WHERE s.id=cs.id RETURNING s.id
     ), inserted_subscription AS (
      INSERT INTO public.subscriptions(tenant_id,plan_id,status,trial_ends_at,current_period_start,current_period_end,provider_payment_id)
      SELECT pm.tenant_id,${planId},'active',NULL,now(),
        CASE WHEN ${lifetime} THEN '9999-12-31 23:59:59+00'::timestamptz ELSE now()+make_interval(days=>${intervalDays}) END,pm.id
      FROM payment_mark pm WHERE NOT EXISTS(SELECT 1 FROM current_subscription) RETURNING id
     ), tenant_activation AS (
      UPDATE public.tenants SET status='active',updated_at=now()
      WHERE id=${p.tenant_id} AND status IN ('trial','past_due')
        AND EXISTS(SELECT 1 FROM payment_mark) RETURNING id
     )
     SELECT (SELECT COUNT(*) FROM payment_mark)::int AS payment_count`;
     if(Number(settlement[0]?.payment_count||0)>0){
      settledOnCallback=true;
     }else{
      const recheck=await sql`SELECT status FROM public.payments WHERE id=${p.id} LIMIT 1`;
      if(String(recheck[0]?.status||'')==='succeeded')settledOnCallback=true;
     }
    }
   }else if(p.order_id){
    await sql`SELECT public.consume_inventory_reservations(${p.id})`;
    const settlement=await sql`WITH wanted AS (
      SELECT product_id,SUM(quantity)::integer AS quantity FROM public.order_items WHERE tenant_id=${p.tenant_id} AND order_id=${p.order_id} AND product_id IS NOT NULL GROUP BY product_id
     ), payment_mark AS (
      UPDATE public.payments SET status='succeeded',provider_receipt=${String(tx.id||reference)},verified_at=now(),provider_result=COALESCE(provider_result,'{}'::jsonb)||${JSON.stringify({paystack:{reference,channel:tx.channel||null,paidAt:tx.paid_at||null},callbackSettlement:true})}::jsonb,updated_at=now()
      WHERE id=${p.id} AND tenant_id=${p.tenant_id} AND status IN ('initiated','pending') RETURNING id,tenant_id,order_id
     ), stock_update AS (
      UPDATE public.products pr SET stock_quantity=CASE WHEN pr.stock_quantity IS NULL THEN NULL ELSE pr.stock_quantity-w.quantity END,updated_at=now()
      FROM wanted w,payment_mark pm WHERE pr.id=w.product_id AND pr.tenant_id=${p.tenant_id} AND (pr.stock_quantity IS NULL OR pr.stock_quantity>=w.quantity)
      AND NOT EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=pm.id) RETURNING pr.id
     ), inventory_finalize AS (
      UPDATE public.payments p2 SET provider_result=p2.provider_result||jsonb_build_object(
       'inventoryApplied',(EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id AND ir.status='consumed') OR ((SELECT COUNT(*) FROM stock_update)=(SELECT COUNT(*) FROM wanted) AND NOT EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id))),
       'inventoryIssue',CASE WHEN EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id) AND NOT EXISTS(SELECT 1 FROM public.inventory_reservations ir WHERE ir.payment_id=p2.id AND ir.status='consumed') THEN 'Payment confirmed after stock reservation was released. Seller review required.' WHEN (SELECT COUNT(*) FROM stock_update)=(SELECT COUNT(*) FROM wanted) THEN NULL ELSE 'Payment confirmed, but stock changed during checkout. Seller review required.' END
      ),updated_at=now() FROM payment_mark pm WHERE p2.id=pm.id RETURNING p2.id,p2.tenant_id,p2.order_id
     ), queued AS (
      INSERT INTO public.payment_reconciliation_jobs(payment_id,tenant_id,order_id,status)
      SELECT id,tenant_id,order_id,'pending' FROM inventory_finalize ON CONFLICT(payment_id) DO NOTHING RETURNING id
     ) SELECT (SELECT COUNT(*) FROM payment_mark)::int AS payment_count,(SELECT COUNT(*) FROM wanted)::int AS wanted_count,(SELECT COUNT(*) FROM stock_update)::int AS stock_count`;
    if(Number(settlement[0]?.payment_count||0)>0){
     settledOnCallback=true;
     if(Number(settlement[0]?.stock_count||0)!==Number(settlement[0]?.wanted_count||0))console.error('Callback-verified Paystack payment requires inventory review',{paymentId:p.id,orderId:p.order_id});
    }else{
     const recheck=await sql`SELECT status FROM public.payments WHERE id=${p.id} LIMIT 1`;
     if(String(recheck[0]?.status||'')==='succeeded')settledOnCallback=true;
    }
   }
  }

  if(!verified){
   const failureReason=!response.ok
    ?(response.status===401||response.status===403?'verify_unauthorized':'verify_http_error')
    :!result?.status
    ?'verify_status_false'
    :tx?.status==='success'
    ?(!referenceMatched?'reference_mismatch':!amountMatched?'amount_mismatch':'currency_mismatch')
    :analysis.reasonCode;
   logPaymentCallbackFailure({
    provider:'paystack',
    stage:'callback',
    reference,
    paymentId:String(p.id),
    orderId:p.order_id?String(p.order_id):null,
    orderNumber:p.order_number?String(p.order_number):null,
    tenantId:String(p.tenant_id),
    paymentRoute:String(p.payment_route||''),
    environment:credentials.environment,
    httpStatus:response.status,
    paystackStatus:Boolean(result?.status),
    txStatus:analysis.txStatus,
    gatewayResponse:analysis.gatewayResponse||null,
    apiMessage:analysis.apiMessage||null,
    authChannel:analysis.authChannel||null,
    authHistory:analysis.authHistory,
    amountExpected:Number(p.amount_minor),
    amountReceived:Number.isFinite(Number(tx?.amount))?Number(tx.amount):null,
    currency:String(tx?.currency||p.currency||''),
    reason:failureReason,
    severity:analysis.isTerminal?'warn':'error'
   });
   if(response.ok&&result?.status&&analysis.isTerminal&&analysis.terminalStatus){
    const failureMeta={
     paystackVerifyStatus:analysis.txStatus,
     paystackFailure:{
      txStatus:analysis.txStatus,
      gatewayResponse:analysis.gatewayResponse||null,
      reasonCode:analysis.reasonCode,
      failureReason:analysis.userMessage,
      failedAt:new Date().toISOString(),
      source:'callback'
     }
    };
    await sql`UPDATE public.payments SET status=${analysis.terminalStatus},provider_result=COALESCE(provider_result,'{}'::jsonb)||${JSON.stringify(failureMeta)}::jsonb,updated_at=now() WHERE id=${p.id} AND status IN ('initiated','pending')`;
    if(!isSubscription){
     await sql`SELECT public.release_inventory_reservations(${p.id})`;
    }
   }
  }

  const slug=String(p.slug||'').toLowerCase().trim();
  const verifiedStoreHosts=(Array.isArray(p.verified_hosts)?p.verified_hosts:[]).filter((v:any)=>typeof v==='string'&&v.trim()).map((v:string)=>v.trim().toLowerCase());
  const verifiedAdminHosts=(Array.isArray(p.verified_admin_hosts)?p.verified_admin_hosts:[]).filter((v:any)=>typeof v==='string'&&v.trim()).map((v:string)=>v.trim().toLowerCase());
  const preferredCustomStoreHost=verifiedStoreHosts.find((h:string)=>!h.endsWith('.dasmarket.co.ke'));
  const host=preferredCustomStoreHost||String(p.hostname||'').trim()||(slug+'.dasmarket.co.ke');
  if(!/^[a-z0-9.-]+$/i.test(host))return res.status(500).send('Shop redirect could not be resolved.');
  const verifiedCustomHosts=[...verifiedStoreHosts,...verifiedAdminHosts];
  const candidateOrigin=p.provider_result?.returnOrigin||sanitizeRequestHostOrigin(req);
  const returnTarget=resolveSafeReturnOrigin(candidateOrigin,isSubscription?'dasmarket.co.ke':host,verifiedCustomHosts);
  const paymentParam=verified?(settledOnCallback?'succeeded':'processing'):analysis.terminalStatus==='cancelled'?'cancelled':analysis.isTerminal?'failed':'pending';
  const reasonParam=(!verified&&(analysis.isTerminal||analysis.reasonCode==='provider_unauthorized'))?'&reason='+encodeURIComponent(analysis.reasonCode):'';
  const orderPathPrefix=returnTarget.isHostScoped?'':'/'+encodeURIComponent(slug);
  const destination=isSubscription
   ?returnTarget.origin+'/dashboard?payment='+paymentParam+'&subscription=1'+reasonParam
   :returnTarget.origin+orderPathPrefix+'/orders?payment='+paymentParam+'&order='+encodeURIComponent(String(p.order_number||''))+reasonParam;
  return res.redirect(303,destination);
 }catch(error:any){
  logPaymentCallbackFailure({provider:'paystack',stage:'callback',reference,httpStatus:503,reason:'callback_exception',error});
  return res.status(503).send('Payment verification is temporarily unavailable. Refresh your order status shortly.');
 }
}
