import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert, Badge, Spinner } from '../../components/ui';
import { KV, fmtDateTime, pretty } from '../../components/adminKit';
import { cStatusColor } from './Complaints';

export default function ComplaintDetail() {
  const { id } = useParams();
  const [c, setC] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(null);
  const [reply, setReply] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get(`/admin/complaints/${id}`).then(setC).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  if (err) return <Alert>{err}</Alert>;
  if (!c) return <Spinner />;

  const run = async (fn, ok) => {
    setBusy(true); setMsg(null);
    try { const r = await fn(); setMsg({ kind: 'ok', text: typeof ok === 'function' ? ok(r) : ok }); await load(); return true; } catch (e) { setMsg({ kind: 'error', text: e.message }); return false; } finally { setBusy(false); }
  };
  const patch = (body, ok) => run(() => api.patch(`/admin/complaints/${id}`, body), ok);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/admin/complaints" className="text-sm text-ink-500 hover:underline">← All messages</Link>
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="font-mono text-xs text-ink-500">{c.reference}</div><h1 className="font-display text-2xl font-bold">{c.subject || pretty(c.kind)}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{pretty(c.kind)}</Badge><Badge color={cStatusColor(c.status)}>{pretty(c.status)}</Badge><Badge color={c.priority === 'high' ? 'red' : 'gray'}>{pretty(c.priority)} priority</Badge></div></div>
          <div className="flex flex-wrap gap-2">
            <select className="input !w-auto !py-2" aria-label="Status" value={c.status} disabled={busy} onChange={(e) => patch({ status: e.target.value }, 'Status updated.')}>
              {['open', 'reviewed', 'in_review', 'resolved', 'dismissed'].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</select>
            <select className="input !w-auto !py-2" aria-label="Priority" value={c.priority} disabled={busy} onChange={(e) => patch({ priority: e.target.value }, 'Priority updated.')}>
              {['low', 'normal', 'high'].map((s) => <option key={s} value={s}>{pretty(s)}</option>)}</select>
          </div>
        </div>
        <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-mint-50 p-4 text-sm">{c.message}</div>
        <div className="mt-5"><KV items={[['From', `${c.name} <${c.email}>`], ['Phone', c.phone], ['Received', fmtDateTime(c.createdAt)], ['Where it came from', pretty(c.source)],
          ['Restaurant', c.restaurant && <Link key="r" className="text-brand-600 hover:underline" to={`/admin/restaurants/${c.restaurant._id}`}>{c.restaurant.name}</Link>], ['Order', c.orderRef]]} /></div>
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}

      <div className="card p-6">
        <h2 className="mb-3 font-bold">Replies sent to {c.name}</h2>
        {c.replies.length === 0 ? <p className="mb-3 text-sm text-ink-500">No reply sent yet.</p> : (
          <ul className="mb-4 space-y-3">{c.replies.map((r, i) => <li key={i} className="rounded-2xl border border-black/5 p-3 text-sm"><div className="whitespace-pre-wrap">{r.message}</div><div className="mt-1 text-xs text-ink-500">{r.by} · {fmtDateTime(r.at)}</div></li>)}</ul>)}
        <form onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post(`/admin/complaints/${id}/reply`, { message: reply }), (r) => (r.email === 'failed' ? 'Reply saved, but the email could not be sent. Check the Emails page.' : 'Reply emailed.'))) setReply(''); }}>
          <label className="label" htmlFor="reply">Reply by email</label>
          <textarea id="reply" className="input" rows={4} required minLength={2} maxLength={2000} placeholder="This is emailed to the sender." value={reply} onChange={(e) => setReply(e.target.value)} />
          <button className="btn-primary mt-3" disabled={busy}>{busy ? 'Sending…' : 'Send reply'}</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-3 font-bold">Internal notes <span className="text-xs font-normal text-ink-500">(never sent to the customer)</span></h2>
        {c.notes.length > 0 && <ul className="mb-4 space-y-2">{c.notes.map((n, i) => <li key={i} className="rounded-2xl bg-amber-50 p-3 text-sm"><div className="whitespace-pre-wrap">{n.text}</div><div className="mt-1 text-xs text-ink-500">{n.by} · {fmtDateTime(n.at)}</div></li>)}</ul>}
        <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); if (await patch({ note }, 'Note added.')) setNote(''); }}>
          <input className="input" required maxLength={1000} placeholder="Add a note for the team" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-ghost" disabled={busy}>Add</button>
        </form>
      </div>
    </div>
  );
}
