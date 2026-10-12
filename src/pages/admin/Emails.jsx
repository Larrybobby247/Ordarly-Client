import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert, Badge } from '../../components/ui';
import { DataTable, Filters, PageHead, Pager, fmtDateTime, pretty, useDebounced, useList } from '../../components/adminKit';

export default function Emails() {
  const [sp] = useSearchParams();
  const [f, setF] = useState({ q: '', status: sp.get('status') || '', type: '' }); const [page, setPage] = useState(1); const [msg, setMsg] = useState(null); const [busyId, setBusyId] = useState('');
  const q = useDebounced(f.q); const list = useList('/admin/emails', { ...f, q }, page);
  const types = list.data?.types || [];
  const retry = async (id) => {
    setBusyId(id); setMsg(null);
    try { const r = await api.post(`/admin/emails/${id}/retry`); setMsg(r.status === 'failed' ? { kind: 'error', text: `Still failing: ${r.lastError || 'unknown error'}` } : { kind: 'ok', text: 'Accepted by the email provider.' }); list.reload(); }
    catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusyId(''); }
  };
  const fields = [
    { key: 'q', label: 'Recipient', type: 'search', placeholder: 'name@example.com' },
    { key: 'status', label: 'Status', type: 'select', options: [['failed', 'Failed'], ['accepted', 'Accepted'], ['queued', 'Queued']] },
    { key: 'type', label: 'Type', type: 'select', options: types.map((t) => [t, pretty(t)]) },
  ];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Emails" sub="Every transactional email the platform tried to send." />
      {msg && <div className="mb-4"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
      <p className="mb-3 text-xs text-ink-500">"Accepted" means the email provider took the message. It does not prove it reached the inbox.</p>
      <Filters fields={fields} values={f} onChange={(v) => { setF(v); setPage(1); }} />
      <DataTable state={list} empty="No emails match."
        columns={[
          { head: 'To', cell: (m) => <span className="break-all">{m.to}</span> },
          { head: 'Type', cell: (m) => pretty(m.type) },
          { head: 'Status', cell: (m) => <><Badge color={m.status === 'failed' ? 'red' : m.status === 'accepted' ? 'green' : 'amber'}>{pretty(m.status)}</Badge>{m.lastError && <div className="mt-1 max-w-xs text-xs text-red-600">{m.lastError}</div>}</> },
          { head: 'Tries', cell: (m) => m.attempts },
          { head: 'When', cell: (m) => <span className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(m.createdAt)}</span> },
          { head: '', cell: (m) => (m.status === 'failed' ? <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={busyId === m._id} onClick={() => retry(m._id)}>{busyId === m._id ? 'Retrying…' : 'Retry'}</button> : null) },
        ]} />
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
