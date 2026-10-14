import { useEffect, useState, useCallback, useRef } from 'react';
import { api, naira, ORDER_LABEL, PAY_LABEL, NEXT_STATUS } from '../../lib/api';
import ProofReview from './ProofReview';
import { Badge, statusColor, payColor, Spinner, Alert } from '../../components/ui';
import { useDash } from '../../components/DashboardLayout';

const PAID = ['paid', 'paid_manual'];
const needsPayment = (o) => o.channel === 'checkout' && ['paystack', 'bank_transfer'].includes(o.paymentMethod) && !PAID.includes(o.paymentStatus);

const TILES = [
  ['Pending', ['pending', 'awaiting_whatsapp'], 'bg-amber-50 text-amber-700'],
  ['Accepted', ['accepted'], 'bg-sky-50 text-sky-700'],
  ['Preparing', ['preparing'], 'bg-violet-50 text-violet-700'],
  ['Ready', ['ready'], 'bg-teal-50 text-teal-700'],
  ['In delivery', ['out_for_delivery'], 'bg-indigo-50 text-indigo-700'],
  ['Completed', ['completed'], 'bg-brand-50 text-brand-700'],
  ['Cancelled', ['cancelled'], 'bg-red-50 text-red-600'],
];

export default function Orders() {
  const [f, setF] = useState({ q: '', status: '', fulfillment: '', paymentMethod: '' });
  const [res, setRes] = useState(null); const [sel, setSel] = useState(null); const [err, setErr] = useState('');
  const { refreshSummary } = useDash(); const refreshRef = useRef(refreshSummary); refreshRef.current = refreshSummary; // a ref keeps load() stable, so the page never re-requests itself in a loop
  const [today, setToday] = useState({ byStatus: {}, total: 0, waiting: 0 });
  const loadToday = useCallback(() => api.get('/orders/summary').then(setToday).catch(() => {}), []);
  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    api.get('/orders?' + qs).then(setRes);
    loadToday(); refreshRef.current?.();
  }, [f, loadToday]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]); // pick up new orders without a refresh

  const act = async (fn) => { setErr(''); try { const o = await fn(); setSel(o); load(); } catch (e) { setErr(e.message); } };

  return (
    <div className="space-y-4">
      <section aria-label="Today's orders">
        <div className="mb-2 flex items-baseline justify-between"><h2 className="font-bold">Today</h2><span className="text-xs text-ink-500">{`${today.total || 0} order${today.total === 1 ? '' : 's'} placed today (Lagos time)`}</span></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {TILES.map(([label, keys, tone]) => {
            const n = keys.reduce((a, k) => a + ((today.byStatus || {})[k] || 0), 0);
            return <div key={label} className="card p-3"><div className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${tone}`}>{label}</div><div className="mt-1 font-display text-2xl font-bold">{n}</div></div>;
          })}
        </div>
        {today.waiting > 0 && <p className="mt-2 text-xs text-ink-500"><b>{today.waiting}</b> order{today.waiting === 1 ? ' is' : 's are'} waiting for you to accept (including earlier days).</p>}
      </section>
      <div className="card grid gap-3 p-4 sm:grid-cols-4">
        <input className="input" placeholder="Search ref, name, phone" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">All statuses</option>{Object.entries(ORDER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className="input" value={f.fulfillment} onChange={(e) => setF({ ...f, fulfillment: e.target.value })}><option value="">All fulfilment</option>{['whatsapp_pickup', 'delivery', 'pickup', 'dine_in'].map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}</select>
        <select className="input" value={f.paymentMethod} onChange={(e) => setF({ ...f, paymentMethod: e.target.value })}><option value="">All payment</option>{['none', 'paystack', 'bank_transfer', 'pod'].map((k) => <option key={k} value={k}>{k.replace('_', ' ')}</option>)}</select>
      </div>
      {!res ? <Spinner /> : res.orders.length === 0 ? <div className="card p-10 text-center text-sm text-ink-500">No orders yet. Share your page link to get started.</div> : (
        <div className="card divide-y divide-black/5">
          {res.orders.map((o) => (
            <button key={o._id} onClick={() => setSel(o)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-mint-50">
              <div><div className="text-sm font-bold">{o.reference} <span className="font-normal text-ink-500">· {o.customerName || 'Customer'}</span></div><div className="text-xs text-ink-500">{new Date(o.createdAt).toLocaleString()} · {o.items.length} item(s)</div></div>
              <div className="flex items-center gap-2"><Badge color={statusColor(o.status)}>{ORDER_LABEL[o.status]}</Badge>{o.channel === 'checkout' && <Badge color={payColor(o.paymentStatus)}>{PAY_LABEL[o.paymentStatus]}</Badge>}<b className="text-sm">{naira(o.total)}</b></div>
            </button>
          ))}
        </div>
      )}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6" onClick={() => setSel(null)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><div><div className="font-display text-xl font-bold">{sel.reference}</div><div className="text-xs text-ink-500">{new Date(sel.createdAt).toLocaleString()}</div></div><button onClick={() => setSel(null)} className="text-xl">×</button></div>
            {sel.channel === 'whatsapp' && sel.status === 'awaiting_whatsapp' && <div className="mt-3"><Alert kind="info">WhatsApp order <b>request</b>. It is not confirmed until the customer messages you and you accept it.</Alert></div>}
            <div className="mt-4 space-y-1 text-sm">
              {[['Customer', sel.customerName], ['Phone', sel.customerPhone], ['Email', sel.customerEmail], ['Fulfilment', sel.fulfillment?.replace('_', ' ')], ['Address', sel.deliveryAddress && `${sel.deliveryAddress}${sel.deliveryPlace ? ', ' + sel.deliveryPlace : ''}${sel.deliveryDistanceKm ? ` (${sel.deliveryDistanceKm} km)` : ''}`], ['Table', sel.tableNumber], ['Notes', sel.notes]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-ink-500">{k}</span><span className="text-right">{v}</span></div>)}
            </div>
            <div className="mt-4 rounded-2xl bg-mint-50 p-4 text-sm">
              {sel.items.map((i, k) => <div key={k} className="py-0.5"><div className="flex justify-between"><span>{i.quantity} × {i.name}</span><span>{naira(i.price * i.quantity)}</span></div>{(i.addons || []).length > 0 && <div className="pl-4 text-xs text-ink-500">+ {i.addons.map((a) => a.name).join(', ')}</div>}</div>)}
              <div className="mt-2 flex justify-between border-t border-black/10 pt-2"><span>Subtotal</span><span>{naira(sel.subtotal)}</span></div>
              {sel.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>{naira(sel.deliveryFee)}</span></div>}
              <div className="flex justify-between font-bold"><span>Total</span><span>{naira(sel.total)}</span></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Badge color={statusColor(sel.status)}>{ORDER_LABEL[sel.status]}</Badge>{sel.channel === 'checkout' && <><Badge color={payColor(sel.paymentStatus)}>{PAY_LABEL[sel.paymentStatus]}</Badge><Badge>{sel.paymentMethod.replace('_', ' ')}</Badge></>}</div>
            {sel.paymentMethod === 'bank_transfer' && <ProofReview order={sel} onDone={(o) => { setSel(o); load(); }} />}
            {err && <div className="mt-3"><Alert>{err}</Alert></div>}
            {needsPayment(sel) && sel.status !== 'cancelled' && (
              <div className="mt-4"><Alert kind="info"><b>Payment not confirmed yet.</b> {sel.paymentMethod === 'bank_transfer' ? 'Review the transfer proof above. You can accept the order once you confirm the money arrived.' : 'You can accept this order as soon as Paystack confirms the payment.'}
                {sel.paymentMethod === 'paystack' && <button className="ml-2 font-semibold underline" onClick={() => act(() => api.post(`/orders/${sel._id}/recheck-payment`))}>Check payment now</button>}</Alert></div>)}
            <div className="mt-5 flex flex-wrap gap-2">
              {(NEXT_STATUS[sel.status] || []).filter((s) => !(sel.channel === 'whatsapp' && s === 'out_for_delivery')).filter((s) => s === 'cancelled' || !needsPayment(sel)).map((s) => (
                <button key={s} onClick={() => act(() => api.patch(`/orders/${sel._id}/status`, { status: s }))} className={s === 'cancelled' ? 'btn-ghost !text-red-600' : 'btn-primary'}>{s === 'accepted' && sel.status.match(/pending|awaiting/) ? 'Accept' : ORDER_LABEL[s]}</button>
              ))}
              {sel.paymentStatus === 'unpaid_pod' && <button onClick={() => act(() => api.post(`/orders/${sel._id}/pod-collected`))} className="btn-dark">Mark cash collected</button>}
            </div>
            <p className="mt-3 text-xs text-ink-500">Order status and payment status are tracked separately. Completing an order never marks it paid.</p>
          </div>
        </div>
      )}
    </div>
  );
}
