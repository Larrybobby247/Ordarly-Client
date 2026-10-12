import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui';
import { DataTable, Filters, PageHead, Pager, fmtDate, pretty, useDebounced, useList } from '../../components/adminKit';
import { subColor } from './Users';

const FIELDS = [
  { key: 'q', label: 'Restaurant name', type: 'search', placeholder: 'Type to search…' },
  { key: 'status', label: 'Status', type: 'select', options: [['trialing', 'Trialing'], ['active', 'Active'], ['expired', 'Expired'], ['free', 'Free (no plan)']] },
  { key: 'expiringDays', label: 'Ending within', type: 'select', options: [['3', '3 days'], ['7', '7 days'], ['14', '14 days'], ['30', '30 days']] },
];

export default function Subscriptions() {
  const go = useNavigate(); const [f, setF] = useState({ q: '', status: '', expiringDays: '' }); const [page, setPage] = useState(1);
  const q = useDebounced(f.q); const list = useList('/admin/subscriptions', { ...f, q }, page);
  const counts = list.data?.counts || {};
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Subscriptions" sub="Pro trials and paid plans." />
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {['trialing', 'active', 'expired', 'free'].map((k) => (
          <button key={k} onClick={() => { setF({ ...f, status: f.status === k ? '' : k }); setPage(1); }} className={`card p-4 text-left ${f.status === k ? '!border-brand-500' : ''}`}>
            <div className="text-xs text-ink-500">{pretty(k)}</div><div className="font-display text-2xl font-bold">{counts[k] || 0}</div>
          </button>))}
      </div>
      <Filters fields={FIELDS} values={f} onChange={(v) => { setF(v); setPage(1); }} />
      <DataTable state={list} onRow={(s) => s.restaurant && go(`/admin/restaurants/${s.restaurant._id}`)} empty="No subscriptions match."
        columns={[
          { head: 'Restaurant', cell: (s) => <><div className="font-semibold">{s.restaurant?.name || 'Deleted restaurant'}</div><div className="text-xs text-ink-500">/{s.restaurant?.slug}</div></> },
          { head: 'Status', cell: (s) => <Badge color={subColor(s.status)}>{pretty(s.status)}</Badge> },
          { head: 'Trial ends', cell: (s) => fmtDate(s.trialEnd) },
          { head: 'Period ends', cell: (s) => fmtDate(s.periodEnd) },
          { head: 'Updated', cell: (s) => <span className="text-xs text-ink-500">{fmtDate(s.updatedAt)}</span> },
        ]} />
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
