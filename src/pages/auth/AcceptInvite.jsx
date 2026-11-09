import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { Alert, Field, Logo, PasswordInput, Spinner } from '../../components/ui';

const ROLE = { branch_manager: 'Branch manager', all_branches_manager: 'All-branches manager', custom: 'Team member' };

// Opened from the invitation email. A new person sets a name + password; someone with an account signs in as the invited email first.
export default function AcceptInvite() {
  const [sp] = useSearchParams(); const token = sp.get('token') || ''; const go = useNavigate(); const { refresh } = useAuth();
  const [info, setInfo] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [name, setName] = useState(''); const [password, setPassword] = useState('');
  useEffect(() => { if (!token) { setErr('This invitation link is incomplete.'); return; } api.get(`/auth/invite/${encodeURIComponent(token)}`).then(setInfo).catch((e) => setErr(e.message)); }, [token]);
  const accept = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (info.hasAccount) await api.post('/auth/login', { email: info.email, password }); // sign in as the invited email, then accept
      await api.post('/auth/accept-invite', { token, ...(info.hasAccount ? {} : { name, password }) });
      await refresh(); go('/dashboard', { replace: true });
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-mint-50 p-4"><div className="card w-full max-w-md space-y-4 p-8">
      <Logo />
      {!info && !err ? <Spinner /> : !info ? <><Alert>{err}</Alert><Link to="/login" className="btn-ghost">Go to sign in</Link></> : (<>
        <div><h1 className="font-display text-2xl font-bold">Join {info.restaurant}</h1><p className="mt-1 text-sm text-ink-500">You have been invited as <b>{ROLE[info.role] || 'team member'}</b> with the email <b>{info.email}</b>.</p></div>
        {err && <Alert>{err}</Alert>}
        <form onSubmit={accept} className="space-y-3">
          {info.hasAccount ? <Field label={`Password for ${info.email}`}><PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field> : <>
            <Field label="Your name"><input className="input" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
            <Field label="Choose a password" hint="At least 8 characters."><PasswordInput required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field></>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Joining…' : info.hasAccount ? 'Sign in & accept' : 'Create account & accept'}</button>
        </form></>)}
    </div></div>
  );
}
