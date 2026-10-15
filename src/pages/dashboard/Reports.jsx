import { useEffect, useState } from 'react';
import { useVisibleInterval } from '../../lib/hooks';
import { api } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, Badge, Field, Spinner } from '../../components/ui';
import { Modal, fmtDateTime, pretty } from '../../components/adminKit';

const STEPS = [['open', 'Received'], ['reviewed', 'Reviewed'], ['in_review', 'In progress'], ['resolved', 'Resolved']];
const tone = { open: 'amber', reviewed: 'blue', in_review: 'blue', resolved: 'green', dismissed: 'gray' };

function Progress({ status }) {
  if (status === 'dismissed') return <Badge>Closed without action</Badge>;
  const at = STEPS.findIndex(([k]) => k === status);
  return (
    <ol className="flex items-center" aria-label={`Progress: ${STEPS[at]?.[1]}`}>
      {STEPS.map(([k, l], i) => (
        <li key={k} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center"><span className={`h-3 w-3 rounded-full ${i <= at ? 'bg-brand-500' : 'bg-ink-300'}`} /><span className={`mt-1 whitespace-nowrap text-[10px] ${i === at ? 'font-bold text-ink-900' : 'text-ink-500'}`}>{l}</span></div>
          {i < STEPS.length - 1 && <span className={`mx-1 mb-4 h-0.5 flex-1 ${i < at ? 'bg-brand-500' : 'bg-ink-300'}`} />}
        </li>))}
    </ol>
  );
}

export default function Reports() {
  const { refreshSummary } = useDash();
  const [rows, setRows] = useState(null); const [err, setErr] = useState(''); const [sel, setSel] = useState(null);
  const [f, setF] = useState({ kind: 'complaint', subject: '', message: '' }); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null);
  const load = () => api.get('/inbox/reports').then((r) => setRows(r.rows)).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  useVisibleInterval(load, 60000); // PERF (changed): pauses in hidden tabs

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { const r = await api.post('/inbox/reports', f); setF({ kind: 'complaint', subject: '', message: '' }); setMsg({ kind: 'ok', text: `Report ${r.reference} sent to the Ordarly team. You'll see its progress below.` }); load(); refreshSummary(); }
    catch (x) { setMsg({ kind: 'error', text: x.message }); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="font-display text-2xl font-bold">Reports to Ordarly</h1><p className="text-sm text-ink-500">Tell the Ordarly team about a problem, a payment issue or an idea. Track what happens to each report here.</p></div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Type"><select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="complaint">Problem / complaint</option><option value="question">Question</option><option value="feedback">Feedback or idea</option></select></Field>
          <div className="sm:col-span-2"><Field label="Subject"><input className="input" required minLength={3} maxLength={120} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. Customer paid but order still unpaid" /></Field></div>
        </div>
        <Field label="What happened?"><textarea className="input" rows={4} required minLength={10} maxLength={2000} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Include order numbers or times if you can." /></Field>
        <button className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send report'}</button>
      </form>

      <section aria-label="Your reports">
        <h2 className="mb-2 font-bold">Your reports</h2>
        {err && <Alert>{err}</Alert>}{!rows && !err && <Spinner />}
        {rows && rows.length === 0 && <div className="card p-8 text-center text-sm text-ink-500">You haven't sent any reports yet.</div>}
        <div className="space-y-3">{rows?.map((c) => (
          <button key={c._id} onClick={() => setSel(c)} className="card block w-full p-4 text-left hover:border-brand-500/40">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="min-w-0"><div className="truncate font-semibold">{c.subject}</div><div className="text-xs text-ink-500">{c.reference} · {pretty(c.kind)} · {fmtDateTime(c.createdAt)}</div></div><Badge color={tone[c.status]}>{c.statusLabel}</Badge></div>
            <Progress status={c.status} />
            {c.replies?.length > 0 && <div className="mt-2 text-xs font-semibold text-brand-700">{c.replies.length} repl{c.replies.length > 1 ? 'ies' : 'y'} from Ordarly</div>}
          </button>))}</div>
      </section>

      {sel && (
        <Modal title={sel.subject} onClose={() => setSel(null)} wide>
          <div className="space-y-4">
            <div className="text-xs text-ink-500">{sel.reference} · {fmtDateTime(sel.createdAt)}</div>
            <Progress status={sel.status} />
            <div className="whitespace-pre-wrap rounded-2xl bg-mint-50 p-4 text-sm">{sel.message}</div>
            {(sel.replies || []).map((r, i) => <div key={i} className="ml-6 rounded-2xl border border-brand-500/20 bg-brand-50 p-3 text-sm"><div className="whitespace-pre-wrap">{r.message}</div><div className="mt-1 text-xs text-ink-500">Ordarly team · {fmtDateTime(r.at)}</div></div>)}
            {(sel.replies || []).length === 0 && <p className="text-sm text-ink-500">No reply yet. Replies from the team also arrive by email.</p>}
          </div>
        </Modal>)}
    </div>
  );
}
