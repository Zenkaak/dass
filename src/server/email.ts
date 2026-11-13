type EmailInput={to:string;subject:string;html:string;text:string;replyTo?:string};
const env=(key:string)=>String((globalThis as any).process?.env?.[key]||'').trim();
export function escapeEmailHtml(value:unknown){
 return String(value??'').replace(/[&<>"']/g,(character)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character] as string));
}
export async function sendTransactionalEmail(input:EmailInput){
 const apiKey=env('RESEND_API_KEY');
 if(!apiKey){console.warn('Transactional email skipped: RESEND_API_KEY is not configured.');return {sent:false,reason:'not_configured'} as const;}
 const from=env('RESEND_FROM_EMAIL')||'DASMARKET <notifications@dasmarket.co.ke>';
 const replyTo=input.replyTo||env('RESEND_REPLY_TO')||'support@dasnet.co.ke';
 const response=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({from,to:[input.to],subject:input.subject,html:input.html,text:input.text,reply_to:replyTo}),
  signal:AbortSignal.timeout(10000)
 });
 const result:any=await response.json().catch(()=>({}));
 if(!response.ok){
  console.error('Resend email delivery failed',{status:response.status,error:String(result?.message||result?.name||'Provider rejected email').slice(0,240)});
  return {sent:false,reason:'provider_error'} as const;
 }
 return {sent:true,id:String(result?.id||'')} as const;
}
