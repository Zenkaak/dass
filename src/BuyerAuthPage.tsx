import './storefront-redesign.css';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';

type Mode = 'login' | 'signup' | 'reset';

export function BuyerAuthPage({
  slug,
  shopName,
  initial = 'login',
  onBack,
  onAuthenticated,
  onPolicyNavigate,
}: {
  slug: string;
  shopName: string;
  initial?: Mode;
  onBack: () => void;
  onAuthenticated: (user: any) => void;
  onPolicyNavigate: (page: string) => void;
}) {
  const [mode, setMode] = useState<Mode>(initial);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function call(action: string, payload: any = {}) {
    const r = await fetch('/api/buyer-auth?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ slug, ...payload }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Request failed');
    return d;
  }

  async function sendCode(resend = false) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const d = await call(mode === 'reset' ? 'send-reset-code' : 'send-code', { phone });
      setSent(true);
      setNotice(d.message || (resend ? 'A new SMS code has been sent.' : 'Check your phone for the SMS code.'));
      return true;
    } catch (e: any) {
      setError(e.message || 'Could not send SMS code.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: any) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (mode === 'signup' && step < 3) {
      if (step === 2 && !phone.trim()) {
        setError('Enter your mobile number.');
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (mode === 'signup' && step === 3) {
      if (password !== confirmPassword) {
        setError('Your passwords do not match.');
        return;
      }
      if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Use at least 10 characters, including letters and numbers.');
        return;
      }
      if (await sendCode()) setStep(4);
      return;
    }
    if (mode === 'reset' && !sent) {
      await sendCode();
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        const d = await call('signup', { name, email, phone, password, code });
        onAuthenticated(d.customer);
      } else if (mode === 'login') {
        const d = await call('login', { phone, password });
        onAuthenticated(d.customer);
      } else {
        await call('reset-password', { phone, password, code });
        setMode('login');
        setStep(1);
        setSent(false);
        setCode('');
        setPassword('');
        setNotice('Password updated. Please sign in.');
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: Mode) {
    setMode(next);
    setStep(1);
    setSent(false);
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setNotice('');
  }

  const title =
    mode === 'signup'
      ? 'Create your account'
      : mode === 'reset'
      ? 'Reset your password'
      : 'Welcome back';
  const intro =
    mode === 'signup'
      ? `Create your buyer account to shop with ${shopName}.`
      : mode === 'reset'
      ? 'Enter your mobile number to recover your account.'
      : `Sign in to your ${shopName} buyer account.`;

  return (
    <main className="sf-auth-shell">
      <section className="sf-auth-card" aria-labelledby="buyer-auth-title">
        <header className="sf-auth-top">
          <div className="sf-auth-brand">
            <span className="sf-auth-mark" aria-hidden="true">
              {(shopName || 'D').trim().charAt(0).toUpperCase()}
            </span>
            <div>
              <b>{shopName}</b>
              <small>Buyer account</small>
            </div>
          </div>
          <button className="sf-back-btn" type="button" onClick={onBack}>
            <ArrowLeft size={15} /> Back to shop
          </button>
        </header>

        {mode === 'signup' && (
          <div className="sf-auth-steps" aria-label={`Signup step ${step} of 4`}>
            <div className={`sf-auth-step ${step >= 1 ? 'active' : ''}`}>1 · Details</div>
            <div className={`sf-auth-step ${step >= 3 ? 'active' : ''}`}>2 · Security</div>
            <div className={`sf-auth-step ${step >= 4 ? 'active' : ''}`}>3 · Verify</div>
          </div>
        )}

        <div className="sf-auth-heading">
          <h1 id="buyer-auth-title">{title}</h1>
          <p>{intro}</p>
        </div>

        <form className="sf-auth-form" onSubmit={submit}>
          {mode === 'signup' && step === 1 && (
            <>
              <label className="sf-field">
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="e.g. Your Full Name"
                />
              </label>
              <label className="sf-field">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="e.g. you@example.com"
                />
              </label>
            </>
          )}

          {((mode === 'signup' && step === 2) || mode !== 'signup') && (
            <label className="sf-field">
              {mode === 'login' ? 'Phone number or email address' : 'Phone'}
              <input
                type={mode === 'login' ? 'text' : 'tel'}
                inputMode={mode === 'login' ? 'text' : 'tel'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder={mode === 'login' ? '07XX XXX XXX or you@example.com' : 'e.g. 0712 345 678'}
                autoComplete={mode === 'login' ? 'username' : 'tel'}
              />
            </label>
          )}

          {mode === 'signup' && step === 3 && (
            <>
              <label className="sf-field">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                />
                <small>Use at least 10 characters, including letters and numbers.</small>
              </label>
              <label className="sf-field">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={10}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </label>
            </>
          )}

          {((mode === 'signup' && step === 4) || (mode === 'reset' && sent)) && (
            <>
              <label className="sf-field">
                Verification code
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  minLength={6}
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                />
              </label>
              <button
                className="sf-auth-link"
                style={{ alignSelf: 'flex-start' }}
                type="button"
                disabled={busy || !phone.trim()}
                onClick={() => sendCode(true)}
              >
                {busy ? 'Sending…' : 'Resend verification code'}
              </button>
            </>
          )}

          {mode === 'login' && (
            <label className="sf-field">
              <span className="sf-auth-label-row">
                <span>Password</span>
                <button className="sf-auth-link" type="button" onClick={() => changeMode('reset')}>
                  Forgot password?
                </button>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                autoComplete="current-password"
                placeholder="Your password"
              />
            </label>
          )}

          {mode === 'reset' && sent && (
            <label className="sf-field">
              New password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                placeholder="At least 10 characters"
              />
            </label>
          )}

          {error && (
            <div className="sf-alert error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="sf-alert success" role="status">
              {notice}
            </div>
          )}

          <div className="sf-auth-actions">
            {mode === 'signup' && step > 1 && (
              <button
                className="sf-btn sf-btn-secondary"
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Back
              </button>
            )}
            <button className="sf-btn sf-btn-primary" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                ? step < 3
                  ? 'Continue'
                  : step === 3
                  ? 'Continue'
                  : 'Create account'
                : mode === 'login'
                ? 'Sign in'
                : sent
                ? 'Update password'
                : 'Continue'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </div>
        </form>

        <div className="sf-auth-switch">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button type="button" onClick={() => changeMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <button type="button" onClick={() => changeMode('login')}>
              Already have an account? <b>Sign in</b>
            </button>
          )}
        </div>

        {mode === 'signup' && (
          <p className="sf-auth-terms">
            By proceeding, you agree to this shop's{' '}
            <a
              href="/shop-terms"
              onClick={(e) => {
                e.preventDefault();
                onPolicyNavigate('shop-terms');
              }}
            >
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a
              href="/shop-privacy"
              onClick={(e) => {
                e.preventDefault();
                onPolicyNavigate('shop-privacy');
              }}
            >
              Privacy Policy
            </a>
            .
          </p>
        )}

        <div className="sf-summary-note" style={{ justifyContent: 'center' }}>
          <ShieldCheck size={15} />
          <span>Secure buyer access · {shopName}</span>
        </div>
      </section>
    </main>
  );
}
