import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui';
import { DataTable, Filters, PageHead, Pager, fmtDateTime, pretty, useDebounced, useList } from '../../components/adminKit';

export const cStatusColor = (s) => ({ open: 'amber', reviewed: 'blue', in_review: 'blue', resolved: 'green', dismissed: 'gray' }[s] || 'gray');
export const prioColor = (p) => ({ high: 'red', normal: 'gray', low: 'gray' }[p] || 'gray');

const FIELDS = [
  { key: 'q', label: 'Search reference, name, email or message', type: 'search', placeholder: 'Type to search…' },
  { key: 'status', label: 'Status', type: 'select', options: [['active', 'Not finished yet'], ['open', 'Received'], ['reviewed', 'Reviewed'], ['in_review', 'In progress'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']] },
  { key: 'source', label: 'From', type: 'select', options: [['restaurant', 'Restaurants'], ['contact', 'Contact page'], ['restaurant_page', 'Customers (restaurant page)'], ['tracking', 'Customers (order page)']] },
  { key: 'kind', label: 'Type', type: 'select', options: [['complaint', 'Complaint'], ['question', 'Question'], ['feedback', 'Feedback']] },
  { key: 'priority', label: 'Priority', type: 'select', options: [['high', 'High'], ['normal', 'Normal'], ['low', 'Low']] },
];

export default function Complaints() {
  const go = useNavigate(); const [f, setF] = useState({ q: '', status: 'active', source: '', kind: '', priority: '' }); const [page, setPage] = useState(1);
  const q = useDebounced(f.q); const list = useList('/admin/complaints', { ...f, q }, page);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Complaints & feedback" sub="Messages from the contact page and from customers on restaurant and order pages." />
      <Filters fields={FIELDS} values={f} onChange={(v) => { setF(v); setPage(1); }} />
      <DataTable state={list} onRow={(c) => go(`/admin/complaints/${c._id}`)} empty="No messages match these filters."
        columns={[
          { head: 'Ref', cell: (c) => <span className="font-mono text-xs">{c.reference}</span> },
          { head: 'From', cell: (c) => <><div className="font-semibold">{c.name}</div><div className="text-xs text-ink-500">{c.email}</div></> },
          { head: 'Message', cell: (c) => <div className="max-w-xs"><div className="truncate font-medium">{c.subject || pretty(c.kind)}</div><div className="truncate text-xs text-ink-500">{c.message}</div>{(c.restaurant || c.orderRef) && <div className="mt-0.5 text-[11px] text-ink-500">{c.restaurant?.name}{c.orderRef && ` · ${c.orderRef}`}</div>}</div> },
          { head: 'Type', cell: (c) => <div className="flex flex-wrap gap-1"><Badge>{pretty(c.kind)}</Badge>{c.priority === 'high' && <Badge color="red">High</Badge>}</div> },
          { head: 'Status', cell: (c) => <Badge color={cStatusColor(c.status)}>{pretty(c.status)}</Badge> },
          { head: 'Received', cell: (c) => <span className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(c.createdAt)}</span> },
        ]} />
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
