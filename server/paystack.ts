import crypto from 'node:crypto';
import { getDb } from './db.js';

export interface PaystackCredentials { secretKey:string; publicKey:string; webhookSecret?:string; environment:'test'|'live'; }
export interface KESQuote { originalUsdAmount:number; fxRateUsed:number; chargedKesAmount:number; amountSubunits:number; source:string; }
interface PaystackInitializeResult { status:boolean; message:string; data?:{authorization_url:string;access_code:string;reference:string}; }
const env=(key:string)=>(process.env[key]||'').trim();
let fxMemory:{rate:number;fetchedAt:number;source:string}|null=null;

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
export async function initializeCentralPaystack(input:{email:string;reference:string;amountSubunits:number;callbackUrl:string;metadata:Record<string,unknown>;subaccountCode?:string}):Promise<{authorizationUrl:string;accessCode:string;reference:string}>{
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||!/^[A-Za-z0-9._:-]{8,100}$/.test(input.reference)||!Number.isSafeInteger(input.amountSubunits)||input.amountSubunits<=0)throw new Error('Invalid Paystack initialization details.');
 const credentials=await getCentralPaystackCredentials();
 const body:any={email:input.email,reference:input.reference,amount:input.amountSubunits,currency:'KES',callback_url:input.callbackUrl,metadata:input.metadata};
 if(input.subaccountCode){body.subaccount=input.subaccountCode;body.bearer='subaccount';}
 const response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+credentials.secretKey,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const payload:PaystackInitializeResult=await response.json().catch(()=>({status:false,message:'Invalid Paystack response'}));
 if(!response.ok||!payload.status||!payload.data?.authorization_url||!payload.data?.access_code||!payload.data?.reference)throw new Error(String(payload.message||'Paystack could not initialize this KES payment.'));
 return {authorizationUrl:payload.data.authorization_url,accessCode:payload.data.access_code,reference:payload.data.reference};
}
