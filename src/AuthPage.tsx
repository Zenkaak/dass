import { useState } from 'react';
import { ArrowRight, ArrowLeft, ShieldCheck, Store, CheckCircle2 } from 'lucide-react';
type Mode = 'signup'|'login'|'reset';
export function AuthPage({initial='signup'}:{initial?:Mode}) {
 const [mode,setMode]=useState<Mode>(initial),[step,setStep]=useState(1),[phone,setPhone]=useState(''),[code,setCode]=useState(''),[name,setName]=useState(''),[shop,setShop]=useState(''),[slug,setSlug]=useState(''),[password,setPassword]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function call(action:string,payload:Record<string,string>={}){const r=await fetch('/api/auth?action='+encodeURIComponent(action),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Request failed. Please try again.');return d}
 async function sendCode(){setBusy(true);setError('');setMessage('');try{const d=await call(mode==='signup'?'signup-code':'reset-code',{phone});setSent(true);setMessage(d.message||'Check your phone for the SMS code.');if(mode==='signup')setStep(4)}catch(err){setError(err instanceof Error?err.message:'Could not send SMS code.')}finally{setBusy(false)}}
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setMessage('');if(mode==='signup'&&step===1){setStep(2);return}if(mode==='signup'&&step===2){setStep(3);return}if(mode==='signup'&&step===3){await sendCode();return}if(mode==='reset'&&!sent){await sendCode();return}setBusy(true);try{if(mode==='signup'){await call('signup',{phone,code,displayName:name,shopName:shop,slug,password});setMessage('Your shop is ready. Opening your dashboard…');window.location.href='/dashboard'}else if(mode==='login'){await call('login',{phone,password});window.location.href='/dashboard'}else{const d=await call('reset-password',{phone,code,password});setMessage(d.message||'Password reset. Sign in again.');setMode('login');setStep(1);setSent(false);setCode('');setPassword('')}}catch(err){setError(err instanceof Error?err.message:'Something went wrong.')}finally{setBusy(false)}}
 function changeMode(next:Mode){setMode(next);setStep(1);setSent(false);setCode('');setPassword('');setError('');setMessage('')}
 const heading=mode==='signup'?'Build your shop online.':mode==='login'?'Welcome back.':'Get back into your account.';
 const sub=mode==='signup'?'A few details and your business will have its own online home.':mode==='login'?'Sign in to manage your shop, products and orders.':'We’ll send a one-time code to your registered phone number.';
 return <main className="account-page dm-auth-page dm-auth-v3">
  <header className="dm-auth-v3-header">
   <a className="dm-home-brand" href="/" aria-label="DASMARKET home"><span className="dm-home-mark">D</span><span><b>DASMARKET</b><small>YOUR BUSINESS. ONLINE.</small></span></a>
   <div className="dm-auth-v3-header-action">{mode==='login'?<>New here? <button type="button" onClick={()=>changeMode('signup')}>Create a shop</button></>:<>Already registered? <button type="button" onClick={()=>changeMode('login')}>Sign in</button></>}</div>
  </header>
  <section className="dm-auth-v3-wrap">
   <div className="dm-auth-v3-heading">
    <span className="dm-auth-v3-kicker"><i/> SELLER ACCOUNT</span>
    <h1>{mode==='signup'?'Create your online shop':mode==='login'?'Sign in to DASMARKET':'Reset your password'}</h1>
    <p>{mode==='signup'?'Set up your shop in a few simple steps.':mode==='login'?'Manage your products, orders and shop settings.':'Verify your phone number to reset your password.'}</p>
   </div>
   <section className="dm-auth-v3-card">
    {mode==='signup'&&<div className="dm-auth-v3-progress"><div className="dm-auth-stepper"><div>{[1,2,3,4].map(n=><i key={n} className={n<=step?'active':''}/>)}</div><small>STEP {step} OF 4 <span>· {['Your details','Shop address','Phone number','Verify & secure'][step-1]}</span></small></div></div>}
    <form className="auth-form dm-auth-form dm-auth-v3-form" onSubmit={submit}>
     {mode==='signup'&&step===1&&<><label>Your full name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={100} autoComplete="name" placeholder="Enter your full name"/></label><label>Business / shop name<input value={shop} onChange={e=>{setShop(e.target.value);if(!slug)setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}} required maxLength={100} placeholder="e.g. Kingsley Stores"/></label></>}
     {mode==='signup'&&step===2&&<label>Choose your shop address<div className="dm-auth-domain-input"><input value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} required minLength={3} maxLength={50} pattern="[a-z0-9][a-z0-9-]{1,48}[a-z0-9]" placeholder="your-shop"/><span>.dasmarket.co.ke</span></div><small className="dm-auth-hint">You can connect your own domain later.</small></label>}
     {(mode==='signup'&&step===3||mode!=='signup')&&<label>Mobile number<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} required autoComplete="tel" placeholder="07XX XXX XXX"/></label>}
     {(mode==='signup'&&step===4||mode==='reset'&&sent)&&<><label>SMS verification code<input inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} required minLength={6} maxLength={6} autoComplete="one-time-code" placeholder="Enter 6-digit code"/></label><button className="auth-resend" type="button" disabled={busy||!phone.trim()} onClick={sendCode}>{busy?'Sending…':'Resend verification code'}</button></>}
     {(mode==='login'||mode==='signup'&&step===4||mode==='reset'&&sent)&&<label>{mode==='reset'?'New password':'Password'}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} placeholder="At least 10 characters"/></label>}
     {error&&<div className="auth-message error" role="alert">{error}</div>}{message&&<div className="auth-message success" role="status">{message}</div>}
     <div className="auth-form-actions">{mode==='signup'&&step>1&&<button type="button" className="auth-back-step" onClick={()=>setStep(s=>Math.max(1,s-1))}><ArrowLeft size={15}/> Back</button>}<button className="button primary auth-submit dm-auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?(step<3?'Continue':step===3?'Send verification code':'Create shop'):mode==='login'?'Sign in':sent?'Reset password':'Send reset code'} <ArrowRight size={16}/></button></div>
    </form>
    {(mode==='signup'||mode==='reset')&&sent&&<button className="auth-text-button" type="button" onClick={()=>{setSent(false);setCode('');setMessage('');setStep(3)}}>Change phone number</button>}
    {mode==='login'&&<button className="dm-auth-forgot" type="button" onClick={()=>changeMode('reset')}>Forgot your password?</button>}
    {mode==='reset'&&<button className="dm-auth-forgot" type="button" onClick={()=>changeMode('login')}>Back to sign in</button>}
    <div className="dm-auth-v3-secure"><ShieldCheck size={16}/><span>Your account is protected with phone verification.</span></div>
   </section>
   <footer className="dm-auth-v3-footer"><span>© {new Date().getFullYear()} DASMARKET</span><a href="mailto:support@dasnet.co.ke">Need help? Contact support</a></footer>
  </section>
 </main>;
