import crypto from 'node:crypto';
import { getDb } from './db.js';

export interface PaystackCredentials { secretKey:string; publicKey:string; webhookSecret?:string; environment:'test'|'live'; }
export interface KESQuote { originalUsdAmount:number; fxRateUsed:number; chargedKesAmount:number; amountSubunits:number; source:string; }
interface PaystackInitializeResult { status:boolean; message:string; code?:string; type?:string; data?:{authorization_url:string;access_code:string;reference:string}; }
export interface PaymentCallbackFailureLog {
 provider:'paystack'|'mpesa_daraja';
 stage:'callback'|'webhook'|'status_query'|'initialize'|'recovery_verify'|'daraja_callback';
 reference?:string|null;
 checkoutId?:string|null;
 paymentId?:string|null;
 orderId?:string|null;
 orderNumber?:string|null;
 tenantId?:string|null;
 paymentRoute?:string|null;
 environment?:string|null;
 httpStatus?:number|null;
 paystackStatus?:boolean|null;
 txStatus?:string|null;
 gatewayResponse?:string|null;
 apiMessage?:string|null;
 authChannel?:string|null;
 authHistory?:string[]|null;
 amountExpected?:number|null;
 amountReceived?:number|null;
 currency?:string|null;
 reason:string;
 error?:unknown;
 severity?:'error'|'warn';
 extra?:Record<string,unknown>;
}
export interface PaystackFailureAnalysis {
 isTerminal:boolean;
 terminalStatus:'failed'|'cancelled'|'reversed'|null;
 txStatus:string;
 gatewayResponse:string;
 apiMessage:string;
 authChannel:string;
 authHistory:string[];
 reasonCode:'provider_unauthorized'|'3ds_authentication_failed'|'cardholder_unauthorized'|'declined'|'abandoned'|'reversed'|'failed'|'pending';
 userMessage:string;
}

const env=(key:string)=>(process.env[key]||'').trim();
let fxMemory:{rate:number;fetchedAt:number;source:string}|null=null;

function redactSensitiveText(value:unknown,maxLength=300):string {
 const raw=String(value??'').replace(/[\r\n\t]+/g,' ').trim();
 if(!raw)return '';
 return raw
  .replace(/\b(sk|pk)_(test|live)_[A-Za-z0-9]+\b/gi,'[redacted_key]')
  .replace(/Bearer\s+[A-Za-z0-9._-]+/gi,'Bearer [redacted]')
  .replace(/\b\d{12,19}\b/g,'[redacted_number]')
  .slice(0,maxLength);
}

export function logPaymentCallbackFailure(entry:PaymentCallbackFailureLog):void {
 const record={
  event:'payment_callback_failure',
  timestamp:new Date().toISOString(),
  provider:entry.provider,
  stage:entry.stage,
  reason:redactSensitiveText(entry.reason,200),
  reference:entry.reference?String(entry.reference).slice(0,100):null,
  checkoutId:entry.checkoutId?String(entry.checkoutId).slice(0,100):null,
  paymentId:entry.paymentId?String(entry.paymentId).slice(0,80):null,
  orderId:entry.orderId?String(entry.orderId).slice(0,80):null,
  orderNumber:entry.orderNumber?String(entry.orderNumber).slice(0,80):null,
  tenantId:entry.tenantId?String(entry.tenantId).slice(0,80):null,
  paymentRoute:entry.paymentRoute||null,
  environment:entry.environment||null,
  httpStatus:typeof entry.httpStatus==='number'?entry.httpStatus:null,
  paystackStatus:typeof entry.paystackStatus==='boolean'?entry.paystackStatus:null,
  txStatus:entry.txStatus||null,
  gatewayResponse:entry.gatewayResponse?redactSensitiveText(entry.gatewayResponse,240):null,
  apiMessage:entry.apiMessage?redactSensitiveText(entry.apiMessage,240):null,
  authChannel:entry.authChannel?String(entry.authChannel).slice(0,60):null,
  authHistory:Array.isArray(entry.authHistory)?entry.authHistory.slice(0,8).map(item=>redactSensitiveText(item,160)):null,
  amountExpected:typeof entry.amountExpected==='number'?entry.amountExpected:null,
  amountReceived:typeof entry.amountReceived==='number'?entry.amountReceived:null,
  currency:entry.currency?String(entry.currency).slice(0,16):null,
  error:entry.error?redactSensitiveText(entry.error instanceof Error?entry.error.message:entry.error,240):null,
  ...(entry.extra?{extra:entry.extra}:{})
 };
 if(entry.severity==='warn')console.warn('[payment-callback]',JSON.stringify(record));
 else console.error('[payment-callback]',JSON.stringify(record));
}

export function extractPaystackFailureReason(verifyJson:any,httpStatus?:number):PaystackFailureAnalysis {
 const tx=verifyJson?.data||{};
 const txStatus=String(tx?.status||'').toLowerCase().trim();
 const gatewayResponse=redactSensitiveText(tx?.gateway_response||tx?.message||'',240);
 const apiMessage=redactSensitiveText(verifyJson?.message||'',240);
 const authChannel=String(tx?.channel||tx?.authorization?.channel||'').toLowerCase().trim();
 const historyRaw:any[]=Array.isArray(tx?.log?.history)?tx.log.history:[];
 const authHistory=historyRaw
  .map(item=>[item?.type,item?.message].filter(Boolean).join(': '))
  .filter(Boolean)
  .slice(-6)
  .map(item=>redactSensitiveText(item,160));
 const combined=[gatewayResponse,apiMessage,...authHistory].join(' ').toLowerCase();

 if(httpStatus===401||httpStatus===403){
  return {
   isTerminal:false,
   terminalStatus:null,
   txStatus:txStatus||('http_'+httpStatus),
   gatewayResponse,
   apiMessage,
   authChannel,
   authHistory,
   reasonCode:'provider_unauthorized',
   userMessage:'Paystack rejected authorization for this payment check. Please contact the shop if this persists.'
  };
 }

 const is3dsFailure=/3[\s-]?d\s*secure|3ds|\bacs\b|\botp\b|challenge|authentication\s*(failed|cancelled|aborted|unsuccessful|timeout)|not\s*authenticated/i.test(combined);
 const isUnauthorizedCardholder=/unauthori[sz]ed|not\s*permitted|do\s*not\s*honou?r|invalid\s*card|authentication\s*required|issuer.*reject/i.test(combined);
 const isTerminal=['failed','abandoned','reversed'].includes(txStatus);

 if(txStatus==='reversed'){
  return {
   isTerminal:true,
   terminalStatus:'reversed',
   txStatus,
   gatewayResponse,
   apiMessage,
   authChannel,
   authHistory,
   reasonCode:'reversed',
   userMessage:gatewayResponse?`Card payment was reversed (${gatewayResponse}).`:'Paystack confirmed that this card payment was reversed.'
  };
 }

 if(is3dsFailure||(txStatus==='abandoned'&&/auth|3d|otp|open/i.test(combined))){
  return {
   isTerminal:true,
   terminalStatus:txStatus==='abandoned'?'cancelled':'failed',
   txStatus:txStatus||'failed',
   gatewayResponse,
   apiMessage,
   authChannel,
   authHistory,
   reasonCode:'3ds_authentication_failed',
   userMessage:'3-D Secure cardholder authentication was not completed or failed verification. Please retry and approve the bank verification prompt.'
  };
 }

 if(txStatus==='abandoned'){
  return {
   isTerminal:true,
   terminalStatus:'cancelled',
   txStatus,
   gatewayResponse,
   apiMessage,
   authChannel,
   authHistory,
   reasonCode:'abandoned',
   userMessage:gatewayResponse?`Card checkout ended before completion (${gatewayResponse}).`:'Card checkout was closed or timed out before completing authorization.'
  };
 }

 if(txStatus==='failed'){
  if(isUnauthorizedCardholder){
   return {
    isTerminal:true,
    terminalStatus:'failed',
    txStatus,
    gatewayResponse,
    apiMessage,
    authChannel,
    authHistory,
    reasonCode:'cardholder_unauthorized',
    userMessage:gatewayResponse?`Cardholder authorization was declined by the issuing bank (${gatewayResponse}). You can retry or pay with M-PESA.`:'Cardholder authorization was declined by the issuing bank. Please retry or use M-PESA.'
   };
  }
  return {
   isTerminal:true,
   terminalStatus:'failed',
   txStatus,
   gatewayResponse,
   apiMessage,
   authChannel,
   authHistory,
   reasonCode:/declined|insufficient|expired/i.test(combined)?'declined':'failed',
   userMessage:gatewayResponse?`Card payment failed: ${gatewayResponse}`:'Paystack confirmed that the card payment was not completed.'
  };
 }

 return {
  isTerminal,
  terminalStatus:null,
  txStatus:txStatus||'pending',
  gatewayResponse,
  apiMessage,
  authChannel,
  authHistory,
  reasonCode:'pending',
  userMessage:'Waiting for Paystack card confirmation…'
 };
}

function isTrustedPlatformHostname(hostname:string):boolean {
 const host=hostname.toLowerCase();
 return host==='dasmarket.co.ke'||host==='www.dasmarket.co.ke'||host==='app.dasmarket.co.ke'||host==='mambu.dasmarket.co.ke'||host.endsWith('.dasmarket.co.ke')||host.endsWith('.vercel.app')||host.endsWith('.run.app')||host.endsWith('.googleusercontent.com')||host.endsWith('.aistudio.google.com')||host==='localhost'||host==='127.0.0.1';
}

export function sanitizeRequestHostOrigin(req:any):string|null {
 const rawHost=String(req?.headers?.['x-forwarded-host']||req?.headers?.host||'').split(',')[0].trim().toLowerCase();
 const rawProto=String(req?.headers?.['x-forwarded-proto']||'https').split(',')[0].trim().toLowerCase();
 if(!rawHost)return null;
 try{
  const proto=(rawProto==='http'&&(rawHost.startsWith('localhost')||rawHost.startsWith('127.0.0.1')))?'http':'https';
  const parsed=new URL(`${proto}://${rawHost}`);
  return `${parsed.protocol}//${parsed.host.toLowerCase()}`;
 }catch{
  return null;
 }
}

export function sanitizeReturnOrigin(req:any):string|null {
 const rawOrigin=String(req?.headers?.origin||'').trim();
 if(rawOrigin){
  try{
   const parsed=new URL(rawOrigin);
   if((parsed.protocol==='https:'||(parsed.protocol==='http:'&&(parsed.hostname==='localhost'||parsed.hostname==='127.0.0.1')))&&parsed.host){
    return `${parsed.protocol}//${parsed.host.toLowerCase()}`;
   }
  }catch{}
 }
 return sanitizeRequestHostOrigin(req);
}

export async function resolveTenantPaystackCallbackUrl(sql:any,tenantId:string,req:any):Promise<string> {
 const defaultOrigin=(env('DASNET_PUBLIC_URL')||'https://dasmarket.co.ke').replace(/\/$/,'');
 const candidateOrigin=sanitizeReturnOrigin(req);
 if(!candidateOrigin)return defaultOrigin+'/api/paystack/callback';
 let candidateHost='';
 try{
  candidateHost=new URL(candidateOrigin).hostname.toLowerCase();
 }catch{
  return defaultOrigin+'/api/paystack/callback';
 }
 if(isTrustedPlatformHostname(candidateHost)){
  return candidateOrigin+'/api/paystack/callback';
 }
 try{
  const rows=await sql`SELECT hostname,verified_at,status,verification_data FROM public.domains WHERE tenant_id=${tenantId} AND hostname NOT LIKE '%.dasmarket.co.ke'`;
  const allowedCustomHosts=new Set<string>();
  for(const row of rows){
   const storeHost=String(row?.hostname||'').trim().toLowerCase();
   const meta=row?.verification_data||{};
   const isActiveOrVerified=Boolean(row?.verified_at)||String(row?.status||'').toLowerCase()==='active';
   const storefrontOk=isActiveOrVerified||meta?.storefrontVerified===true||String(meta?.storefrontVerified)==='true'||meta?.config?.misconfigured===false;
   if(storeHost&&storefrontOk)allowedCustomHosts.add(storeHost);
   const adminHost=String(meta?.adminHostname||(storeHost?'adm.'+storeHost:'')).trim().toLowerCase();
   const adminOk=isActiveOrVerified||meta?.adminVerified===true||String(meta?.adminVerified)==='true'||meta?.adminConfig?.misconfigured===false;
   if(adminHost&&adminOk)allowedCustomHosts.add(adminHost);
  }
  if(allowedCustomHosts.has(candidateHost)){
   return candidateOrigin+'/api/paystack/callback';
  }
 }catch(error:any){
  console.warn('Could not verify tenant custom domain for Paystack callback',String(error?.message||error).slice(0,160));
 }
 return defaultOrigin+'/api/paystack/callback';
}

export function resolveSafeReturnOrigin(candidate:unknown,fallbackHost:string,verifiedCustomHosts:string[]=[]):{origin:string;isHostScoped:boolean} {
 const trustedCustom=new Set(verifiedCustomHosts.map(h=>String(h||'').trim().toLowerCase()).filter(Boolean));
 const cleanFallbackHost=String(fallbackHost||'dasmarket.co.ke').trim().toLowerCase();
 const isValidCandidate=(value:unknown):{origin:string;hostname:string}|null=>{
  if(typeof value!=='string'||!value.trim())return null;
  try{
   const parsed=new URL(value.trim());
   const host=parsed.hostname.toLowerCase();
   const protoOk=parsed.protocol==='https:'||(parsed.protocol==='http:'&&(host==='localhost'||host==='127.0.0.1'));
   if(!protoOk)return null;
   if(isTrustedPlatformHostname(host)||trustedCustom.has(host)){
    return {origin:`${parsed.protocol}//${parsed.host.toLowerCase()}`,hostname:host};
   }
   return null;
  }catch{
   return null;
  }
 };
 const resolved=isValidCandidate(candidate);
 if(resolved){
  const host=resolved.hostname;
  const tenantSubdomain=host.endsWith('.dasmarket.co.ke')&&!['www','app','mambu'].includes(host.split('.')[0]);
  const isHostScoped=Boolean(tenantSubdomain||trustedCustom.has(host));
  return {origin:resolved.origin,isHostScoped};
 }
 let fallbackOrigin='https://'+(cleanFallbackHost||'dasmarket.co.ke');
 let fallbackHostname=cleanFallbackHost.split(':')[0];
 try{
  const parsedFallback=new URL(fallbackOrigin);
  fallbackOrigin=`${parsedFallback.protocol}//${parsedFallback.host.toLowerCase()}`;
  fallbackHostname=parsedFallback.hostname.toLowerCase();
 }catch{}
 const fallbackTenantSubdomain=fallbackHostname.endsWith('.dasmarket.co.ke')&&!['www','app','mambu'].includes(fallbackHostname.split('.')[0]);
 const isHostScoped=Boolean(fallbackTenantSubdomain||trustedCustom.has(fallbackHostname));
 return {origin:fallbackOrigin,isHostScoped};
}

function encryptionKey():Buffer {
 const raw=env('DASNET_CREDENTIALS_ENCRYPTION_KEY');
 const key=/^[a-f0-9]{64}$/i.test(raw)?Buffer.from(raw,'hex'):Buffer.from(raw,'base64');
 if(key.length!==32)throw new Error('Credential encryption is not configured correctly.');
 return key;
}
function decryptCredentials(blob:any):any {
 if(!blob?.iv||!blob?.tag||!blob?.data)throw new Error('Central Paystack credentials are not configured.');
 const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(blob.iv,'base64'));
 decipher.setAuthTag(Buffer.from(blob.tag,'base64'));
 return JSON.parse(Buffer.concat([decipher.update(Buffer.from(blob.data,'base64')),decipher.final()]).toString('utf8'));
}
export async function getSellerPaystackCredentials(tenantId:string):Promise<PaystackCredentials>{
 const sql=getDb(),rows=await sql`SELECT encrypted_credentials FROM public.tenant_paystack_configs WHERE tenant_id=${tenantId} AND account_mode='own_paystack' AND connection_status='connected' LIMIT 1`;
 if(!rows.length)throw new Error('Seller Paystack account is not connected.');
 const saved=decryptCredentials(rows[0].encrypted_credentials),secretKey=String(saved?.secretKey||''),environment=saved?.environment==='live'?'live':'test';
 if(!secretKey.startsWith(environment==='live'?'sk_live_':'sk_test_'))throw new Error('Seller Paystack credentials are invalid.');
 return {secretKey,publicKey:'',environment};
}
export async function getCentralPaystackCredentials():Promise<PaystackCredentials>{
 const sql=getDb();
 const rows=await sql`SELECT environment,encrypted_credentials FROM public.platform_paystack_config WHERE id='central' LIMIT 1`;
 if(!rows.length)throw new Error('Central Paystack has not been configured by the platform administrator.');
 const environment=String(rows[0].environment)==='live'?'live':'test';
 const credentials=decryptCredentials(rows[0].encrypted_credentials)?.[environment];
 const secretKey=String(credentials?.secretKey||''),publicKey=String(credentials?.publicKey||'');
 const prefix=environment==='live'?'sk_live_':'sk_test_';
 if(!secretKey.startsWith(prefix)||!publicKey.startsWith(environment==='live'?'pk_live_':'pk_test_'))throw new Error('Central Paystack credentials are incomplete or do not match the selected environment.');
 return {secretKey,publicKey,webhookSecret:String(credentials?.webhookSecret||'')||undefined,environment};
}
export async function getUsdKesRate():Promise<{rate:number;source:string}> {
 const now=Date.now();
 // Platform-controlled USD/KES rate. Defaults to the currently approved KES 130 rate.
 // Updating PAYSTACK_USD_KES_RATE changes new quotes; prior transactions retain their snapshot.
 const configured=Number(env('PAYSTACK_USD_KES_RATE')||'130');
 if(!Number.isFinite(configured)||configured<50||configured>300)throw new Error('Configured USD/KES rate is invalid.');
 if(fxMemory&&now-fxMemory.fetchedAt<15*60*1000&&fxMemory.rate===configured)return {rate:fxMemory.rate,source:fxMemory.source};
 const sql=getDb();
 await sql`INSERT INTO public.fx_rate_cache(base_currency,quote_currency,rate,source,fetched_at) VALUES('USD','KES',${configured},'platform_config',now()) ON CONFLICT(base_currency,quote_currency) DO UPDATE SET rate=EXCLUDED.rate,source=EXCLUDED.source,fetched_at=EXCLUDED.fetched_at`;
 fxMemory={rate:configured,fetchedAt:now,source:'platform_config'};
 return {rate:configured,source:'platform_config'};
}
export async function quoteUsdInKes(usdAmount:number):Promise<KESQuote>{
 if(!Number.isFinite(usdAmount)||usdAmount<=0||usdAmount>10000000)throw new Error('USD amount is invalid.');
 const fx=await getUsdKesRate();
 const chargedKesAmount=Math.round(usdAmount*fx.rate);
 const amountSubunits=Math.round(chargedKesAmount*100);
 if(!Number.isSafeInteger(amountSubunits)||amountSubunits<=0)throw new Error('Converted KES amount is outside supported payment limits.');
 return {originalUsdAmount:Math.round(usdAmount*1000000)/1000000,fxRateUsed:fx.rate,chargedKesAmount,amountSubunits,source:fx.source};
}
export async function initializeCentralPaystack(input:{email:string;reference:string;amountSubunits:number;callbackUrl:string;metadata:Record<string,unknown>;subaccountCode?:string;channels?:string[]}):Promise<{authorizationUrl:string;accessCode:string;reference:string}>{
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||!/^[A-Za-z0-9._:-]{8,100}$/.test(input.reference)||!Number.isSafeInteger(input.amountSubunits)||input.amountSubunits<=0)throw new Error('Invalid Paystack initialization details.');
 const credentials=await getCentralPaystackCredentials();
 const body:any={email:input.email,reference:input.reference,amount:input.amountSubunits,currency:'KES',callback_url:input.callbackUrl,metadata:input.metadata};
 if(input.channels?.length)body.channels=input.channels;
 if(input.subaccountCode){body.subaccount=input.subaccountCode;body.bearer='subaccount';}
 const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+credentials.secretKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const payload:PaystackInitializeResult=await response.json().catch(()=>({status:false,message:'Invalid Paystack response'}));
 if(!response.ok||!payload.status||!payload.data?.authorization_url||!payload.data?.access_code||!payload.data?.reference){
  logPaymentCallbackFailure({
   provider:'paystack',
   stage:'initialize',
   reference:input.reference,
   paymentId:typeof input.metadata?.paymentId==='string'?input.metadata.paymentId:null,
   orderId:typeof input.metadata?.orderId==='string'?input.metadata.orderId:null,
   tenantId:typeof input.metadata?.tenantId==='string'?input.metadata.tenantId:null,
   paymentRoute:'central_paystack',
   environment:credentials.environment,
   httpStatus:response.status,
   paystackStatus:Boolean(payload?.status),
   apiMessage:payload?.message||null,
   amountExpected:input.amountSubunits,
   currency:'KES',
   reason:response.status===401?'paystack_init_unauthorized':'paystack_init_failed',
   extra:{paystackCode:payload?.code||null,paystackType:payload?.type||null,hasSubaccount:Boolean(input.subaccountCode)}
  });
  throw new Error(response.status===401?'Paystack authorization failed for this merchant configuration. Please contact the shop owner.':String(payload.message||'Paystack could not initialize this KES payment.'));
 }
 return {authorizationUrl:payload.data.authorization_url,accessCode:payload.data.access_code,reference:payload.data.reference};
}
