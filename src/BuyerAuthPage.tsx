import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type Mode='login'|'signup'|'reset';

export function BuyerAuthPage({slug,shopName,initial='login',onBack,onAuthenticated}:{slug:string;shopName:string;initial?:Mode;onBack:()=>void;onAuthenticated:(user:any)=>void}) {
 const [mode,setMode]=useState<Mode>(initial),[step,setStep]=useState(1),[name,setName]=useState(''),[email,setEmail]=useState(''),[phone,setPhone]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[code,setCode]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function call(action:string,payload:any={}){const r=await fetch('/api/buyer-auth?action='+action,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({slug,...payload})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Request failed');return d}
 async function sendCode(resend=false){setBusy(true);setError('');setNotice('');try{const d=await call(mode==='reset'?'send-reset-code':'send-code',{phone});setSent(true);setNotice(d.message||(resend?'A new SMS code has been sent.':'Check your phone for the SMS code.'));return true}catch(e:any){setError(e.message||'Could not send SMS code.');return false}finally{setBusy(false)}}
 async function submit(e:any){e.preventDefault();setError('');setNotice('');if(mode==='signup'&&step<3){if(step===2&&!phone.trim()){setError('Enter your mobile number.');return}setStep(s=>s+1);return}if(mode==='signup'&&step===3){if(password!==confirmPassword){setError('Your passwords do not match.');return}if(password.length<10||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)){setError('Use at least 10 characters, including letters and numbers.');return}if(await sendCode())setStep(4);return}if(mode==='reset'&&!sent){await sendCode();return}setBusy(true);try{if(mode==='signup'){const d=await call('signup',{name,email,phone,password,code});onAuthenticated(d.customer)}else if(mode==='login'){const d=await call('login',{phone,password});onAuthenticated(d.customer)}else{await call('reset-password',{phone,password,code});setMode('login');setStep(1);setSent(false);setCode('');setPassword('');setNotice('Password updated. Please sign in.')}}catch(e:any){setError(e.message||'Authentication failed')}finally{setBusy(false)}}
 function changeMode(next:Mode){setMode(next);setStep(1);setSent(false);setCode('');setPassword('');setConfirmPassword('');setError('');setNotice('')}
 const title=mode==='signup'?'Create your account':mode==='reset'?'Reset your password':'Welcome back';
 const intro=mode==='signup'?'Create your buyer account to shop with '+shopName+'.':mode==='reset'?'Enter your mobile number to recover your account.':'Sign in to your '+shopName+' buyer account.';
 return <main className={`buyer-auth-page buyer-auth-exact ${mode==='login'?'is-login':'is-signup'}`}>
  {mode==='login'&&<div className="buyer-auth-keyboard-backdrop" aria-hidden="true"><div className="buyer-auth-keyboard"><div className="buyer-auth-keys">{Array.from({length:60},(_,i)=><i key={i}/>)}</div></div></div>}
  <section className="buyer-auth-exact-panel" aria-labelledby="buyer-auth-title">
   <div className="buyer-auth-exact-inner">
    <header className="buyer-auth-exact-header">
     <span className="buyer-auth-exact-logo" aria-hidden="true">D</span>
     <span className="buyer-auth-exact-brand"><b>DASMARKET</b><small>{shopName}</small></span>
     <button className="buyer-auth-exact-back" type="button" onClick={onBack}><ArrowLeft size={16}/> Back to shop</button>
    </header>
    {mode==='signup'&&<div className="buyer-auth-exact-steps" aria-label={'Signup step '+step+' of 4'}>
     <div className={step>=1?'active':''}><i>1</i><span>Your<br/>details</span></div><b/>
     <div className={step>=4?'active':''}><i>2</i><span>Verify<br/>email</span></div><b/>
     <div className={step>=4?'active':''}><i>3</i><span>Verify<br/>phone</span></div>
    </div>}
    <div className="buyer-auth-exact-heading">
     <h1 id="buyer-auth-title">{title}</h1>
     <p>{intro}</p>
    </div>
    <form className="buyer-auth-form buyer-auth-exact-form" onSubmit={submit}>
     {mode==='signup'&&step===1&&<><label>Full name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" placeholder="e.g. Your Full Name"/></label><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} autoComplete="email" placeholder="e.g. you@example.com"/></label></>}
     {(mode==='signup'&&step===2||mode!=='signup')&&<label>{mode==='login'?'Phone or mobile number':'Phone'}<input type="tel" inputMode="tel" value={phone} onChange={e=>setPhone(e.target.value)} required placeholder="e.g. 712 345 678" autoComplete="tel"/></label>}
     {mode==='signup'&&step===3&&<><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete="new-password" placeholder="At least 10 characters"/><small className="buyer-auth-exact-hint">Use at least 10 characters, including letters and numbers.</small></label><label>Confirm password<input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete="new-password" placeholder="Re-enter your password"/></label></>}
     {(mode==='signup'&&step===4||mode==='reset'&&sent)&&<><label>Verification code<input inputMode="numeric" value={code} onChange={e=>setCode(e.target.value.replace(/\\D/g,'').slice(0,6))} required minLength={6} maxLength={6} autoComplete="one-time-code" placeholder="Enter 6-digit code"/></label><button className="buyer-auth-exact-link" type="button" disabled={busy||!phone.trim()} onClick={()=>sendCode(true)}>{busy?'Sending…':'Resend verification code'}</button></>}
     {mode==='login'&&<label><span className="buyer-auth-password-label">Password<button className="buyer-auth-exact-link" type="button" onClick={()=>changeMode('reset')}>Forgot password?</button></span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete="current-password" placeholder="Your password"/></label>}
     {mode==='reset'&&sent&&<label>New password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={10} maxLength={128} autoComplete="new-password" placeholder="At least 10 characters"/></label>}
     {error&&<div className="buyer-auth-error" role="alert">{error}</div>}{notice&&<div className="buyer-auth-notice" role="status">{notice}</div>}
     <div className="buyer-auth-actions buyer-auth-exact-actions">{mode==='signup'&&step>1&&<button className="buyer-auth-exact-secondary" type="button" onClick={()=>setStep(s=>Math.max(1,s-1))}>Back</button>}<button className="buyer-auth-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?(step<3?'Continue':step===3?'Continue':'Create account'):mode==='login'?'Sign In':sent?'Update password':'Continue'}{!busy&&<ArrowRight size={17}/>}</button></div>
    </form>
    <div className="buyer-auth-exact-switch">{mode==='login'?<>Don't have an account? <button type="button" onClick={()=>changeMode('signup')}>Sign up</button></>:<button type="button" onClick={()=>changeMode('login')}>Already have an account? <b>Sign in</b></button>}</div>
    {mode==='signup'&&<p className="buyer-auth-exact-terms">By proceeding, you agree to this shop's <a href="/terms">Terms &amp; Conditions</a> and <a href="/privacy">Privacy Policy</a>.</p>}
    <footer className="buyer-auth-exact-footer"><button type="button" onClick={onBack}><ArrowLeft size={15}/> Back to shop</button><span>Secure buyer access · {shopName}</span></footer>
   </div>
  </section>
 </main>;
}
