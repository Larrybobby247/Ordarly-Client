import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert, Badge, Field, Spinner } from '../../components/ui';
import { useDash } from '../../components/DashboardLayout';

const ROLES = [
  ['branch_manager', 'Branch manager', 'Manages one or more chosen branches: their orders, sales, menu and availability. Cannot see other branches.'],
  ['all_branches_manager', 'All-branches manager', 'Manages every branch, sees combined sales and analytics, and can manage branches.'],
  ['custom', 'Custom access', 'You choose the branches and exactly what they can do.'],
];
const PERM_LABEL = { orders: 'Manage orders', menu: 'Update menu & availability', analytics: 'View sales & analytics', branches: 'Manage branch settings', staff: 'Invite & manage staff' };
const roleName = (r) => ROLES.find((x) => x[0] === r)?.[1] || r;
const statusColor = { active: 'green', invited: 'amber', revoked: 'gray' };
const blank = { email: '', name: '', role: 'branch_manager', branchIds: [], allBranches: false, perms: ['orders'] };

function Form({ initial, id, branches, canGivePerm, onDone, onCancel }) {
  const [f, setF] = useState(initial); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const needsBranches = f.role === 'branch_manager' || (f.role === 'custom' && !f.allBranches);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const body = { role: f.role, branchIds: f.role === 'all_branches_manager' ? [] : f.branchIds, allBranches: f.role === 'custom' ? f.allBranches : undefined, perms: f.role === 'custom' ? f.perms : [] };
      if (id) await api.patch(`/staff/${id}`, body); else await api.post('/staff/invite', { ...body, email: f.email.trim(), ...(f.name.trim() ? { name: f.name.trim() } : {}) });
      onDone();
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <h3 className="font-bold">{id ? `Change access for ${f.email}` : 'Invite a team member'}</h3>
      {err && <Alert>{err}</Alert>}
      {!id && <div className="grid gap-3 sm:grid-cols-2"><Field label="Email"><input type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="manager@example.com" /></Field><Field label="Name (optional)"><input className="input" maxLength={80} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field></div>}
      <div className="space-y-2" role="radiogroup" aria-label="Access level">{ROLES.map(([k, t, d]) => (
        <label key={k} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 text-sm ${f.role === k ? 'border-brand-500 bg-brand-50' : 'border-ink-300'}`}><input type="radio" name="role" checked={f.role === k} onChange={() => setF({ ...f, role: k })} /><span><b>{t}</b><span className="block text-xs text-ink-500">{d}</span></span></label>))}</div>
      {f.role === 'custom' && <div className="rounded-2xl bg-mint-50 p-4"><div className="mb-2 text-sm font-semibold">Permissions</div><div className="grid gap-1.5 sm:grid-cols-2">{Object.entries(PERM_LABEL).map(([p, l]) => (
        <label key={p} className={`flex items-center gap-2 text-sm ${canGivePerm(p) ? '' : 'opacity-40'}`}><input type="checkbox" disabled={!canGivePerm(p)} checked={f.perms.includes(p)} onChange={() => toggle('perms', p)} />{l}</label>))}</div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allBranches} onChange={(e) => setF({ ...f, allBranches: e.target.checked })} />Every branch (including ones added later)</label></div>}
      {needsBranches && <div className="rounded-2xl bg-mint-50 p-4"><div className="mb-2 text-sm font-semibold">{f.role === 'branch_manager' ? 'Branch(es) they manage' : 'Branches they can use'}</div>
        {branches.length === 0 ? <p className="text-xs text-ink-500">Create a branch first.</p> : <div className="grid gap-1.5 sm:grid-cols-2">{branches.map((b) => <label key={b._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.branchIds.includes(b._id)} onChange={() => toggle('branchIds', b._id)} />{b.name}</label>)}</div>}</div>}
      <p className="text-xs text-ink-500">Only you (the owner) can see or change subscription, payments, settings and your own account. Access is checked by our servers on every request.</p>
      <div className="flex gap-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save access' : 'Send invitation'}</button><button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

export default function Staff() {
  const { data, branches, access } = useDash();
  const [list, setList] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [form, setForm] = useState(null);
  const load = useCallback(() => api.get('/staff').then((d) => setList(d.staff)).catch((e) => { setErr(e.message); setList([]); }), []);
  useEffect(() => { if (data?.isBusiness) load(); }, [data?.isBusiness, load]);
  if (!data?.isBusiness) return <div className="mx-auto max-w-2xl"><div className="card p-8 text-center"><h1 className="font-display text-2xl font-bold">Staff access is part of the Business plan</h1><p className="mt-2 text-sm text-ink-500">Invite branch managers and team members with role-based access to the branches you choose.</p>{access.isOwner && <Link to="/dashboard/subscription" className="btn-accent mt-5">See the Business plan</Link>}</div></div>;
  if (!list) return <Spinner />;
  const act = async (fn, msg) => { setErr(''); setOk(''); try { await fn(); setOk(msg); load(); } catch (e) { setErr(e.message); } };
  const canGivePerm = (p) => access.isOwner || (p !== 'staff' && access.can(p));
  const editInit = (m) => ({ email: m.email, name: m.name || '', role: m.role, branchIds: (m.branches || []).map(String), allBranches: !!m.allBranches, perms: m.perms || [] });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Staff & permissions</h1><p className="text-sm text-ink-500">Invite people by email and choose what they can reach.</p></div>{!form && <button className="btn-primary" onClick={() => setForm({ initial: blank })}>+ Invite</button>}</div>
      {err && <Alert>{err}</Alert>}{ok && <Alert kind="ok">{ok}</Alert>}
      {form && <Form initial={form.initial} id={form.id} branches={branches} canGivePerm={canGivePerm} onCancel={() => setForm(null)} onDone={() => { setForm(null); setOk(form.id ? 'Access updated.' : 'Invitation sent. The link works for 7 days.'); load(); }} />}
      {list.length === 0 ? <div className="card p-8 text-center text-sm text-ink-500">No one has been invited yet.</div> : (
        <div className="card divide-y divide-black/5">{list.filter((m) => m.status !== 'revoked').map((m) => (
          <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0"><div className="truncate font-semibold">{m.name || m.email}</div><div className="truncate text-xs text-ink-500">{m.email} · {roleName(m.role)}{m.role === 'custom' && ` · ${m.perms.map((p) => PERM_LABEL[p]).join(', ') || 'no permissions'}`}</div>
              <div className="text-xs text-ink-500">{m.role === 'all_branches_manager' || m.allBranches ? 'All branches' : (m.branches || []).map((id) => branches.find((b) => b._id === String(id))?.name || 'Branch').join(', ')}</div></div>
            <div className="flex flex-wrap items-center gap-2"><Badge color={statusColor[m.status]}>{m.status === 'invited' ? 'Invited' : 'Active'}</Badge>
              {m.status === 'invited' && <button className="btn-ghost !py-1 !text-xs" onClick={() => act(() => api.post(`/staff/${m._id}/resend`), 'Invitation re-sent.')}>Resend</button>}
              <button className="btn-ghost !py-1 !text-xs" onClick={() => setForm({ id: m._id, initial: editInit(m) })}>Edit access</button>
              <button className="btn-ghost !py-1 !text-xs !text-red-600" onClick={() => { if (confirm(`Remove ${m.email}'s access? It stops immediately.`)) act(() => api.del(`/staff/${m._id}`), 'Access removed.'); }}>Remove</button></div>
          </div>))}</div>)}
    </div>
  );
}
