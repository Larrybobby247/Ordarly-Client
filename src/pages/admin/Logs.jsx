import { useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert, Badge, Spinner } from '../../components/ui';
import { DataTable, Filters, PageHead, Pager, fmtDateTime, pretty, useList } from '../../components/adminKit';

const TABS = [['audit', 'Audit trail'], ['errors', 'Server errors'], ['payments', 'Failed payments'], ['integrations', 'Payout setups']];

export default function Logs() {
  const [tab, setTab] = useState('audit');
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Logs & audit" sub="What admins did, what broke, and which payments failed." />
      <div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-white p-1 shadow-card" role="tablist" style={{ width: 'fit-content' }}>
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === k ? 'bg-brand-500 text-white' : 'text-ink-700'}`}>{l}</button>)}
      </div>
      {tab === 'audit' && <Audit />}{tab === 'errors' && <Errors />}{tab === 'payments' && <Failures />}{tab === 'integrations' && <Integrations />}
    </div>
  );
}

function Audit() {
  const [f, setF] = useState({ action: '' }); const [page, setPage] = useState(1);
  const list = useList('/admin/audit', f, page);
  const fields = [{ key: 'action', label: 'Action', type: 'select', options: (list.data?.actions || []).map((a) => [a, pretty(a)]) }];
  return (<>
    <Filters fields={fields} values={f} onChange={(v) => { setF(v); setPage(1); }} />
    <DataTable state={list} empty="No audit entries."
      columns={[
        { head: 'When', cell: (a) => <span className="whitespace-nowrap text-xs">{fmtDateTime(a.createdAt)}</span> },
        { head: 'Admin', cell: (a) => a.actor?.name || 'Unknown' },
        { head: 'Action', cell: (a) => <b>{pretty(a.action)}</b> },
        { head: 'Target', cell: (a) => <span className="break-all font-mono text-xs">{a.target}</span> },
        { head: 'Detail', cell: (a) => <span className="break-all text-xs text-ink-500">{a.detail ? JSON.stringify(a.detail) : ''}</span> },
      ]} />
    {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
  </>);
}

function Errors() {
  const [page, setPage] = useState(1); const list = useList('/admin/error-logs', {}, page);
  return (<>
    <DataTable state={list} empty="No server errors recorded."
      columns={[
        { head: 'When', cell: (e) => <span className="whitespace-nowrap text-xs">{fmtDateTime(e.createdAt)}</span> },
        { head: 'Route', cell: (e) => <span className="font-mono text-xs">{e.method} {e.route}</span> },
        { head: 'Status', cell: (e) => <Badge color="red">{e.status || 500}</Badge> },
        { head: 'Message', cell: (e) => <span className="break-words text-xs">{e.message}</span> },
      ]} />
    {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
  </>);
}

function Failures() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/payment-failures').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!d) return <Spinner />;
  const Table = ({ title, rows }) => (
    <div className="card mb-4 overflow-x-auto p-5"><h2 className="mb-3 font-bold">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-ink-500">No failed payments.</p> : (
        <table className="w-full min-w-[480px] text-left text-sm"><tbody>{rows.map((p) => (
          <tr key={p._id} className="border-b border-black/5 last:border-0"><td className="py-2">{p.restaurant?.name || '—'}</td><td className="break-all font-mono text-xs">{p.providerReference}</td><td className="font-semibold">{naira(p.amount)}</td><td className="text-xs text-ink-500">{fmtDateTime(p.updatedAt)}</td></tr>))}</tbody></table>)}
    </div>);
  return (<><Table title="Pro subscription payments" rows={d.subscription} /><Table title="Food-order payments (restaurant money)" rows={d.foodOrders} /></>);
}

function Integrations() {
  const [rows, setRows] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get('/admin/integration-summary').then(setRows).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert>{err}</Alert>;
  if (!rows) return <Spinner />;
  return (
    <div className="card p-5"><h2 className="mb-3 font-bold">Paystack payout setups by status</h2>
      {rows.length === 0 ? <p className="text-sm text-ink-500">No restaurant has started payout setup.</p> : <ul className="space-y-2 text-sm">{rows.map((r) => <li key={r._id || 'none'} className="flex justify-between"><span>{pretty(r._id || 'not set')}</span><b>{r.n}</b></li>)}</ul>}
      <p className="mt-3 text-xs text-ink-500">Counts only. Bank details and subaccount codes are never shown here.</p>
    </div>
  );
}
