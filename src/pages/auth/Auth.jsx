import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, STATES } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Logo, Field, Alert } from '../../components/ui';

const Shell = ({ title, sub, children }) => (
  <div className="grid min-h-screen md:grid-cols-2">
    <div className="flex flex-col px-6 py-8 md:px-14">
      <Logo />
      <div className="m-auto w-full max-w-md py-10">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-ink-500">{sub}</p>
        {children}
      </div>
    </div>
    <div className="relative hidden bg-brand-500 p-12 text-white md:flex md:flex-col md:justify-end">
      <div className="max-w-sm"><div className="font-display text-4xl font-bold leading-tight">Your menu. Your link. Your orders.</div><p className="mt-3 text-white/80">Join restaurants taking cleaner orders with Orderly.</p></div>
    </div>
  </div>
);

export function Login() {
  const nav = useNavigate(); const { refresh } = useAuth();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api.post('/auth/login', f); await refresh(); nav(r.role === 'admin' ? '/admin' : '/dashboard'); }
    catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <Shell title="Welcome back" sub="Sign in to manage your restaurant.">
      <form onSubmit={go} className="space-y-4">
        <Alert>{err}</Alert>
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><input className="input" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="flex justify-between text-sm"><Link to="/forgot-password" className="text-brand-600">Forgot password?</Link><Link to="/register" className="text-brand-600">Create account</Link></div>
      </form>
    </Shell>
  );
}

export function Register() {
  const [f, setF] = useState({ name: '', restaurantName: '', email: '', phone: '', password: '', address: '', state: 'Lagos' });
  const [err, setErr] = useState(''); const [done, setDone] = useState(false); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/auth/register', f); setDone(true); } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  if (done) return (
    <Shell title="Check your email" sub="We sent a verification link. Click it to activate your account, then sign in.">
      <Link to="/login" className="btn-primary">Go to sign in</Link>
    </Shell>
  );
  return (
    <Shell title="Create your restaurant page" sub="Free forever. Upgrade to Pro whenever you're ready.">
      <form onSubmit={go} className="space-y-4">
        <Alert>{err}</Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your full name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
          <Field label="Restaurant name"><input className="input" required value={f.restaurantName} onChange={set('restaurantName')} /></Field>
          <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
          <Field label="Phone"><input className="input" required placeholder="08012345678" value={f.phone} onChange={set('phone')} /></Field>
        </div>
        <Field label="Restaurant address"><input className="input" required value={f.address} onChange={set('address')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="State"><select className="input" value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Password" hint="At least 8 characters"><input className="input" type="password" minLength={8} required value={f.password} onChange={set('password')} /></Field>
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
        <p className="text-center text-xs text-ink-500">By signing up you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>. You can add your logo and cover image in Settings after signing in.</p>
        <p className="text-center text-sm">Already registered? <Link to="/login" className="text-brand-600">Sign in</Link></p>
      </form>
    </Shell>
  );
}

export function VerifyEmail() {
  const [sp] = useSearchParams(); const [state, setState] = useState('loading');
  useEffect(() => { api.post('/auth/verify-email', { token: sp.get('token') }).then(() => setState('ok')).catch(() => setState('bad')); }, [sp]);
  return (
    <Shell title={state === 'ok' ? 'Email verified' : state === 'bad' ? 'Link invalid or used' : 'Verifying…'} sub={state === 'ok' ? 'You can now sign in.' : ''}>
      {state !== 'loading' && <Link to="/login" className="btn-primary">Go to sign in</Link>}
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  return (
    <Shell title="Reset your password" sub="We'll email you a link if the account exists.">
      {sent ? <Alert kind="ok">If that email is registered, a reset link is on its way.</Alert> : (
        <form onSubmit={async (e) => { e.preventDefault(); await api.post('/auth/forgot-password', { email }); setSent(true); }} className="space-y-4">
          <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <button className="btn-primary w-full">Send reset link</button>
        </form>
      )}
    </Shell>
  );
}

export function Reset() {
  const [sp] = useSearchParams(); const nav = useNavigate(); const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  return (
    <Shell title="Choose a new password" sub="At least 8 characters.">
      <form onSubmit={async (e) => { e.preventDefault(); try { await api.post('/auth/reset-password', { token: sp.get('token'), password: pw }); nav('/login'); } catch (x) { setErr(x.message); } }} className="space-y-4">
        <Alert>{err}</Alert>
        <Field label="New password"><input className="input" type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <button className="btn-primary w-full">Update password</button>
      </form>
    </Shell>
  );
}
