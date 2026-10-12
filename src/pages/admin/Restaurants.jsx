import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Badge } from '../../components/ui';
import { STATES } from '../../lib/api';
import { DataTable, Filters, PageHead, Pager, fmtDate, pretty, useDebounced, useList } from '../../components/adminKit';
import { subColor } from './Users';

const FIELDS = [
  { key: 'q', label: 'Search name, page link or email', type: 'search', placeholder: 'Type to search…' },
  { key: 'plan', label: 'Plan', type: 'select', options: [['free', 'Free'], ['pro', 'Pro']] },
  { key: 'status', label: 'Status', type: 'select', options: [['active', 'Active'], ['suspended', 'Suspended']] },
  { key: 'state', label: 'State', type: 'select', options: STATES.map((s) => [s, s]) },
];

export default function Restaurants() {
  const go = useNavigate(); const [sp] = useSearchParams();
  const [f, setF] = useState({ q: '', plan: '', status: sp.get('status') || '', state: '' }); const [page, setPage] = useState(1);
  const q = useDebounced(f.q);
  const list = useList('/admin/restaurants', { ...f, q }, page);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Restaurants" sub="Every restaurant on the platform." />
      <Filters fields={FIELDS} values={f} onChange={(v) => { setF(v); setPage(1); }} />
      <DataTable state={list} onRow={(x) => go(`/admin/restaurants/${x._id}`)} empty="No restaurants match these filters."
        columns={[
          { head: 'Restaurant', cell: (x) => <><div className="font-semibold">{x.name}</div><div className="text-xs text-ink-500">/{x.slug}{x.customDomain && ` · ${x.customDomain}`}</div></> },
          { head: 'Owner', cell: (x) => (x.owner ? <><div>{x.owner.name}</div><div className="text-xs text-ink-500">{x.owner.email}</div></> : '—') },
          { head: 'State', cell: (x) => x.state || '—' },
          { head: 'Plan', cell: (x) => <div className="flex flex-wrap gap-1"><Badge color={x.plan === 'pro' ? 'green' : 'gray'}>{(x.plan || 'free').toUpperCase()}</Badge>{x.subscription && <Badge color={subColor(x.subscription.status)}>{pretty(x.subscription.status)}</Badge>}</div> },
          { head: 'Status', cell: (x) => <Badge color={x.status === 'active' ? 'green' : 'red'}>{pretty(x.status)}</Badge> },
          { head: 'Joined', cell: (x) => <span className="whitespace-nowrap text-xs text-ink-500">{fmtDate(x.createdAt)}</span> },
        ]} />
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
