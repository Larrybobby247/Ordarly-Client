import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Badge, Spinner } from '../../components/ui';
import { DataTable, Filters, KV, Modal, PageHead, Pager, fmtDate, fmtDateTime, pretty, useDebounced, useList } from '../../components/adminKit';

const FIELDS = [
  { key: 'q', label: 'Restaurant or reference', type: 'search', placeholder: 'e.g. SUB-… or restaurant name' },
  { key: 'status', label: 'Status', type: 'select', options: [['success', 'Success'], ['pending', 'Pending'], ['failed', 'Failed']] },
  { key: 'from', label: 'From', type: 'date' },
  { key: 'to', label: 'To', type: 'date' },
];
const color = (s) => (s === 'success' || s === 'paid' ? 'green' : s === 'failed' ? 'red' : 'amber');

function TxnModal({ type, id, onClose }) {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api.get(`/admin/transactions/${type}/${id}`).then(setD).catch((e) => setErr(e.message)); }, [type, id]);
  const t = d?.transaction; const r = t?.restaurant; const o = t?.order; const sub = d?.subscription;
  return (
    <Modal title="Transaction details" wide onClose={onClose}>
      {err ? <Alert>{err}</Alert> : !d ? <Spinner /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><div className="font-display text-3xl font-bold">{naira(t.amount)}</div><div className="text-xs text-ink-500">{t.currency || 'NGN'} · {type === 'food' ? 'Food-order payment' : 'Pro subscription'}</div></div>
            <Badge color={color(t.status)}>{pretty(t.status)}</Badge>
          </div>
          <KV items={[['Reference', <span key="r" className="break-all font-mono text-xs">{t.providerReference}</span>], ['Provider', pretty(t.provider)], ['Created', fmtDateTime(t.createdAt)], ['Verified', t.verifiedAt && fmtDateTime(t.verifiedAt)]]} />
          <div><h3 className="mb-2 text-sm font-bold">Restaurant</h3>
            {r ? <KV items={[['Name', <Link key="n" className="text-brand-600 hover:underline" to={`/admin/restaurants/${r._id}`}>{r.name}</Link>], ['Plan', pretty(r.plan)], ['Status', pretty(r.status)], ['State', r.state], ['Business email', r.email], ['Phone', r.phone],
              ['Owner', r.owner && `${r.owner.name} (${r.owner.email})`]]} /> : <p className="text-sm text-ink-500">Restaurant no longer exists.</p>}</div>
          {type === 'food' && o && <div><h3 className="mb-2 text-sm font-bold">Order</h3>
            <KV items={[['Order', o.reference], ['Customer', o.customerName], ['Fulfilment', pretty(o.fulfillment)], ['Order status', pretty(o.status)], ['Payment status', pretty(o.paymentStatus)], ['Subtotal', naira(o.subtotal)], ['Delivery fee', o.deliveryFee > 0 && naira(o.deliveryFee)], ['Order total', naira(o.total)], ['Placed', fmtDateTime(o.createdAt)]]} /></div>}
          {type === 'subscription' && <div><h3 className="mb-2 text-sm font-bold">Subscription period</h3>
            <KV items={[['Period start', t.periodStart && fmtDate(t.periodStart)], ['Period end', t.periodEnd && fmtDate(t.periodEnd)], ['Subscription status', sub && pretty(sub.status)], ['Current period ends', sub?.periodEnd && fmtDate(sub.periodEnd)]]} /></div>}
          <p className="text-xs text-ink-500">Card details and raw gateway responses are never stored or shown here.</p>
        </div>)}
    </Modal>
  );
}

export default function Transactions() {
  const [open, setOpen] = useState(null);
  const [type, setType] = useState('subscription');
  const [f, setF] = useState({ q: '', status: '', from: '', to: '' }); const [page, setPage] = useState(1);
  const q = useDebounced(f.q); const list = useList('/admin/transactions', { type, ...f, q }, page);
  const sum = list.data?.summary || {};
  const food = type === 'food';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Transactions" sub="Subscription payments are platform revenue. Food-order payments go to the restaurants." />
      <div className="mb-4 inline-flex rounded-2xl bg-white p-1 shadow-card" role="tablist">
        {[['subscription', 'Pro subscriptions'], ['food', 'Food-order payments']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={type === k} onClick={() => { setType(k); setPage(1); }} className={`rounded-xl px-4 py-2 text-sm font-semibold ${type === k ? 'bg-brand-500 text-white' : 'text-ink-700'}`}>{l}</button>))}
      </div>
      {food && <div className="mb-4"><Alert kind="info">These payments settle directly to each restaurant's own Paystack subaccount. They are shown for support and dispute checks and are not Ordarly revenue.</Alert></div>}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {['success', 'pending', 'failed'].map((k) => (
          <div key={k} className="card p-4"><div className="text-xs text-ink-500">{pretty(k)} (all time)</div><div className="font-display text-2xl font-bold">{sum[k]?.count || 0}</div><div className="text-xs text-ink-500">{naira(sum[k]?.amount || 0)}</div></div>))}
      </div>
      <Filters fields={FIELDS} values={f} onChange={(v) => { setF(v); setPage(1); }} />
      <DataTable state={list} onRow={(t) => setOpen(t._id)} empty="No transactions match. Click a row to see its details."
        columns={[
          { head: 'Reference', cell: (t) => <span className="break-all font-mono text-xs">{t.providerReference || '—'}</span> },
          { head: 'Restaurant', cell: (t) => t.restaurant?.name || '—' },
          ...(food ? [{ head: 'Order', cell: (t) => (t.order ? <>{t.order.reference}<div className="text-xs text-ink-500">{pretty(t.order.paymentMethod)}</div></> : '—') }] : []),
          { head: 'Amount', cell: (t) => <b>{naira(t.amount)}</b> },
          { head: 'Status', cell: (t) => <Badge color={color(t.status)}>{pretty(t.status)}</Badge> },
          { head: 'Date', cell: (t) => <span className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(t.createdAt)}</span> },
        ]} />
      {open && <TxnModal type={type} id={open} onClose={() => setOpen(null)} />}
      {list.data && <Pager page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
