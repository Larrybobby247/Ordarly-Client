import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, Badge, Spinner } from '../../components/ui';
import { Modal, Pager, fmtDateTime, pretty, useDebounced, useList } from '../../components/adminKit';

const color = { new: 'amber', read: 'gray', replied: 'green', closed: 'gray' };
const TABS = [['', 'All'], ['new', 'New'], ['read', 'Read'], ['replied', 'Replied'], ['closed', 'Closed']];

export default function Messages() {
  const { refreshSummary } = useDash();
  const [status, setStatus] = useState(''); const [q, setQ] = useState(''); const [page, setPage] = useState(1); const [openId, setOpenId] = useState(null);
  const dq = useDebounced(q);
  const list = useList('/inbox/messages', { status, q: dq }, page);
  const counts = list.data?.counts || {};
  const close = () => { setOpenId(null); list.reload(); refreshSummary(); };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4"><h1 className="font-display text-2xl font-bold">Messages</h1><p className="text-sm text-ink-500">Messages customers send from your restaurant page. We also email you each one, and your replies go to the customer's email.</p></div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-card" role="tablist">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={status === k} onClick={() => { setStatus(k); setPage(1); }} className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold ${status === k ? 'bg-brand-500 text-white' : 'text-ink-700'}`}>{l}{k && counts[k] ? ` (${counts[k]})` : ''}</button>)}
        </div>
        <input className="input !w-auto min-w-[12rem] flex-1 !py-2" type="search" placeholder="Search messages…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {list.error && <Alert>{list.error}</Alert>}
      {!list.data && !list.error && <Spinner />}
      {list.data && (
        <div className="card divide-y divide-black/5">
          {list.data.rows.map((m) => (
            <button key={m._id} onClick={() => setOpenId(m._id)} className="flex w-full items-start gap-3 p-4 text-left hover:bg-mint-50">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${m.status === 'new' ? 'bg-tomato-500' : 'bg-transparent'}`} aria-label={m.status === 'new' ? 'Unread' : ''} />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b className={m.status === 'new' ? '' : 'font-semibold'}>{m.name}</b><span className="truncate text-xs text-ink-500">{m.email}</span></div>
                <div className="truncate text-sm">{m.subject || m.message}</div>{m.subject && <div className="truncate text-xs text-ink-500">{m.message}</div>}</div>
              <div className="shrink-0 text-right"><Badge color={color[m.status]}>{pretty(m.status)}</Badge><div className="mt-1 text-[11px] text-ink-500">{fmtDateTime(m.createdAt)}</div></div>
            </button>))}
          {list.data.rows.length === 0 && <p className="p-10 text-center text-sm text-ink-500">No messages yet. Customers can write to you from the "Contact" button on your restaurant page.</p>}
        </div>)}
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
      {openId && <Thread id={openId} onClose={close} />}
    </div>
  );
}

function Thread({ id, onClose }) {
  const [m, setM] = useState(null); const [err, setErr] = useState(''); const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const load = useCallback(() => api.get(`/inbox/messages/${id}`).then(setM).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  const send = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { const r = await api.post(`/inbox/messages/${id}/reply`, { message: reply }); setM(r.message); setReply(''); setMsg(r.email === 'failed' ? { kind: 'error', text: 'Saved, but the email could not be sent. Check your email settings or contact the customer directly.' } : { kind: 'ok', text: 'Reply emailed to the customer.' }); }
    catch (x) { setMsg({ kind: 'error', text: x.message }); } finally { setBusy(false); }
  };
  const setStatus = async (status) => { try { setM(await api.patch(`/inbox/messages/${id}`, { status })); } catch (x) { setMsg({ kind: 'error', text: x.message }); } };

  return (
    <Modal title={m ? (m.subject || `Message from ${m.name}`) : 'Message'} onClose={onClose} wide>
      {err && <Alert>{err}</Alert>}{!m && !err && <Spinner />}
      {m && (<div className="space-y-4">
        <div className="text-xs text-ink-500">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone && <> · <a className="underline" href={`tel:${m.phone}`}>{m.phone}</a></>}{m.orderRef && <> · Order {m.orderRef}</>} · {fmtDateTime(m.createdAt)}</div>
        <div className="whitespace-pre-wrap rounded-2xl bg-mint-50 p-4 text-sm">{m.message}</div>
        {m.replies.map((r, i) => <div key={i} className="ml-6 rounded-2xl border border-brand-500/20 bg-brand-50 p-3 text-sm"><div className="whitespace-pre-wrap">{r.message}</div><div className="mt-1 text-xs text-ink-500">You · {fmtDateTime(r.at)}</div></div>)}
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <form onSubmit={send}>
          <label className="label" htmlFor="reply">Reply by email</label>
          <textarea id="reply" className="input" rows={4} required minLength={2} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Your reply is emailed to the customer." />
          <div className="mt-3 flex flex-wrap items-center gap-2"><button className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send reply'}</button>
            {m.status !== 'closed' ? <button type="button" className="btn-ghost" onClick={() => setStatus('closed')}>Mark as closed</button> : <button type="button" className="btn-ghost" onClick={() => setStatus('read')}>Reopen</button>}</div>
        </form>
      </div>)}
    </Modal>
  );
}
