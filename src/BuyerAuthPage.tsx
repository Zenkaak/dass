import { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, UserRound, LockKeyhole } from 'lucide-react';

type Mode='login'|'signup'|'reset';

export function BuyerAuthPage({slug,shopName,initial='login',onBack,onAuthenticated}:{slug:string;shopName:string;initial?:Mode;onBack:()=>void;onAuthenticated:(user:any)=>void}) {
 const [mode,setMode]=useState<Mode>(initial),[step,setStep]=useState(1),[name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[alt,setAlt]=useState(''),[address,setAddress]=useState(''),[password,setPassword]=useState(''),[code,setCode]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function call(action:string,payload:any={}){const r=await fetch('/api/buyer-auth?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({slug,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
 async function sendCode(resend=false){setBusy(true);setError('');setNotice('');try{const d=await call(mode==='reset'?'send-reset-code':'send-code',{phone});setSent(true);setNotice(d.message||(resend?'A new SMS code has been sent.':'Check your phone for the SMS code.'));return true}catch(e:any){setError(e.message||'Could not send SMS code.');return false}finally{setBusy(false)}}
 async function submit(e:any){e.preventDefault();setError('');setNotice('');if(mode==='signup'&&step<3){setStep(s=>s+1);return}if(mode==='signup'&&step===3){if(await sendCode())setStep(4);return}if(mode==='reset'&&!sent){await sendCode();return}setBusy(true);try{if(mode==='signup'){const d=await call('signup',{name,email,phone,alternativePhone:alt,address,password,code});onAuthenticated(d.customer)}else if(mode==='login'){const d=await call('login',{phone,password});onAuthenticated(d.customer)}else{await call('reset-password',{phone,password,code});setMode('login');setStep(1);setSent(false);setCode('');setPassword('');setNotice('Password updated. Please sign in.')}}catch(e:any){setError(e.message||'Authentication failed')}finally{setBusy(false)}}
 function changeMode(next:Mode){setMode(next);setStep(1);setSent(false);setCode('');setPassword('');setError('');setNotice('')}
 const stepTitle=step===1?'Personal details':step===2?'Phone number':step===3?'Delivery details':'Verify account';
 const title=mode==='signup'?'Create your account':mode==='reset'?'Reset your password':'Sign in';
 const intro=mode==='signup'?'Set up your buyer account for this shop. Your orders and details stay connected to this shop.':mode==='reset'?'We’ll send a one-time code to your registered mobile number.':'Access your orders, delivery updates and conversations with this shop.';
 return <main className="buyer-auth-page buyer-auth-redesign buyer-auth-v2">
  <div className="buyer-auth-v2-shell">
   <header className="buyer-auth-v2-top">
    <button className="buyer-auth-back" type="button" onClick={onBack}><ArrowLeft size={17}/> <span>Back to shop</span></button>
    <div className="buyer-auth-v2-shop"><span className="buyer-auth-v2-shop-mark">{(shopName||'S').trim().slice(0,1).toUpperCase()}</span><span><b>{shopName}</b><small>BUYER ACCOUNT</small></span></div>
   </header>
   <section className="buyer-auth-card buyer-auth-modal buyer-auth-v2-card" role="dialog" aria-modal="true" aria-labelledby="buyer-auth-title">
    <div className="buyer-auth-v2-icon">{mode==='login'?<LockKeyhole size={21}/>:<UserRound size={21}/>}</div>
    <div className="buyer-auth-v2-heading"><span className="buyer-auth-eyebrow">{mode==='signup'?'NEW CUSTOMER':mode==='reset'?'ACCOUNT RECOVERY':'WELCOME BACK'}</span><h1 id="buyer-auth-title">{title}</h1><p>{intro}</p></div>
    {mode==='signup'&&<div className="buyer-auth-progress buyer-auth-v2-progress" aria-label={'Signup step '+step+' of 4'}><div>{[1,2,3,4].map(n=><span key={n} className={n<=step?'done':''}/>)}</div><small><b>STEP {String(step).padStart(2,'0')} OF 04</b><span>{stepTitle}</span></small></div>}
    <form className="buyer-auth-form buyer-auth-v2-form" onSubmit={submit}>
     {mode==='signup'&&step===1&&<><label>Full name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" placeholder="Your full name"/></label><label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="email" placeholder="name@example.com"/></label></>}
     {(mode==='signup'&&step===2||mode!=='signup')&&<label>Mobile number<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="07XX XXX XXX" autoComplete="tel"/></label>}
     {mode==='signup'&&step===3&&<><label>Alternative phone <span>(optional)</span><input type="tel" inputMode="tel" value={alt} onChange={e=>setAlt(e.target.value)} placeholder="07XX XXX XXX"/></label><label>Delivery address<input value={address} onChange={e=>setAddress(e.target.value)} required maxLength={300} autoComplete="street-address" placeholder="Estate, town or area"/></label></>}
     {(mode==='signup'&&step===4||mode==='reset'&&sent)&&<><label>Verification code<input inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required minLength={6} maxLength={6} autoComplete="one-time-code" placeholder="Enter 6-digit code"/></label><button className="buyer-auth-resend" type="button" disabled={busy||!phone.trim()} onClick={()=>sendCode(true)}>{busy?'Sending…':'Resend verification code'}</button></>}
     {(mode==='login'||mode==='signup'&&step===4||mode==='reset'&&sent)&&<label>{mode==='reset'?'New password':'Password'}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="At least 10 characters"/><small className="buyer-auth-v2-hint">Use at least 10 characters, including letters and numbers.</small></label>}
     {error&&<div className="buyer-auth-error" role="alert">{error}</div>}{notice&&<div className="buyer-auth-notice" role="status">{notice}</div>}
     <div className="buyer-auth-actions buyer-auth-v2-actions">{mode==='signup'&&step>1&&<button className="buyer-auth-secondary" type="button" onClick={()=>setStep(s=>Math.max(1,s-1))}>Back</button>}<button className="buyer-auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?(step<3?'Continue':step===3?'Send SMS code':'Create account'):mode==='login'?'Sign in':sent?'Update password':'Send reset code'} <ArrowRight size={17}/></button></div>
    </form>
    <div className="buyer-auth-v2-switch">{mode==='login'?<><span>New to {shopName}?</span><button type="button" onClick={()=>changeMode('signup')}>Create buyer account</button><button className="buyer-auth-v2-forgot" type="button" onClick={()=>changeMode('reset')}>Forgot password?</button></>:<button type="button" onClick={()=>changeMode('login')}>Already have an account? <b>Sign in</b></button>}</div>
    <div className="buyer-auth-secure buyer-auth-v2-secure"><ShieldCheck size={17}/><span><b>Private to this shop</b><small>Your buyer profile and orders are kept separate for each shop.</small></span></div>
   </section>
   <footer className="buyer-auth-v2-foot">SECURE BUYER ACCESS <span>·</span> {shopName}</footer>
  </div>
 </main>;
}
