import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert, Badge, Field, PasswordInput } from '../../components/ui';
import { DataTable, Filters, Modal, PageHead, Pager, fmtDate, pretty, useDebounced, useList } from '../../components/adminKit';

export const userStatusColor = (s) => (s === 'active' ? 'green' : s === 'suspended' ? 'red' : 'gray');
export const subColor = (s) => ({ active: 'green', trialing: 'blue', expired: 'red', free: 'gray', none: 'gray' }[s] || 'gray');

const FIELDS = [
  { key: 'q', label: 'Search name, email, phone or restaurant', type: 'search', placeholder: 'Type to search…' },
  { key: 'plan', label: 'Plan', type: 'select', options: [['free', 'Free'], ['pro', 'Pro']] },
  { key: 'subStatus', label: 'Subscription', type: 'select', options: [['trialing', 'Trialing'], ['active', 'Active'], ['expired', 'Expired'], ['free', 'Free (no plan)']] },
  { key: 'status', label: 'Account', type: 'select', options: [['active', 'Active'], ['suspended', 'Suspended']] },
  { key: 'role', label: 'Role', type: 'select', options: [['owner', 'Restaurant owner'], ['admin', 'Admin']] },
];

export default function Users() {
  const go = useNavigate(); const [sp] = useSearchParams();
  const [f, setF] = useState({ q: '', plan: sp.get('plan') || '', subStatus: '', status: '', role: '' });
  const [page, setPage] = useState(1); const [adding, setAdding] = useState(false);
  const q = useDebounced(f.q);
  const list = useList('/admin/users', { ...f, q }, page);
  const change = (v) => { setF(v); setPage(1); };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Users" sub="Everyone with an account: restaurant owners and admins."><button className="btn-primary" onClick={() => setAdding(true)}>+ Add admin</button></PageHead>
      <Filters fields={FIELDS} values={f} onChange={change} />
      <DataTable state={list} onRow={(u) => go(`/admin/users/${u._id}`)} empty="No users match these filters."
        columns={[
          { head: 'User', cell: (u) => <><div className="font-semibold">{u.name}</div><div className="text-xs text-ink-500">{u.email}</div></> },
          { head: 'Restaurant', cell: (u) => (u.restaurant ? <><div>{u.restaurant.name}</div><div className="text-xs text-ink-500">{u.restaurant.state}</div></> : <span className="text-ink-500">—</span>) },
          { head: 'Plan', cell: (u) => (u.restaurant ? <div className="flex flex-wrap gap-1"><Badge color={u.restaurant.plan === 'pro' ? 'green' : 'gray'}>{(u.restaurant.plan || 'free').toUpperCase()}</Badge>{u.sub && <Badge color={subColor(u.sub.status)}>{pretty(u.sub.status)}</Badge>}</div> : '—') },
          { head: 'Status', cell: (u) => <div className="flex flex-wrap gap-1"><Badge color={userStatusColor(u.status)}>{pretty(u.status)}</Badge>{u.role === 'admin' && <Badge color="blue">Admin</Badge>}{!u.emailVerified && <Badge color="amber">Unverified</Badge>}</div> },
          { head: 'Joined', cell: (u) => <span className="whitespace-nowrap text-xs text-ink-500">{fmtDate(u.createdAt)}</span> },
        ]} />
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
      {adding && <AddAdmin onClose={() => setAdding(false)} onDone={() => { setAdding(false); list.reload(); }} />}
    </div>
  );
}

function AddAdmin({ onClose, onDone }) {
  const [f, setF] = useState({ name: '', email: '', password: '', yourPassword: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api.post('/admin/users', f); onDone(); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Add an admin" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Alert kind="info">Admins can see every restaurant and user on the platform. This action is recorded in the audit log.</Alert>
        <Alert>{err}</Alert>
        <Field label="Full name"><input className="input" required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Temporary password" hint="At least 10 characters. Ask them to change it after signing in."><PasswordInput required minLength={10} autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>
        <Field label="Your password" hint="To confirm it's really you."><PasswordInput required autoComplete="current-password" value={f.yourPassword} onChange={set('yourPassword')} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create admin'}</button>
      </form>
    </Modal>
  );
}
