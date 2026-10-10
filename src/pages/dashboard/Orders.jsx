import { useEffect, useState, useCallback } from 'react';
import { api, naira, ORDER_LABEL, PAY_LABEL, NEXT_STATUS } from '../../lib/api';
import ProofReview from './ProofReview';
import { Badge, statusColor, payColor, Spinner, Alert } from '../../components/ui';

export default function Orders() {
  const [f, setF] = useState({ q: '', status: '', fulfillment: '', paymentMethod: '' });
  const [res, setRes] = useState(null); const [sel, setSel] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
    api.get('/orders?' + qs).then(setRes);
  }, [f]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const act = async (fn) => { setErr(''); try { const o = await fn(); setSel(o); load(); } catch (e) { setErr(e.message); } };

  return (
    <div className="space-y-4">
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
              {[['Customer', sel.customerName], ['Phone', sel.customerPhone], ['Email', sel.customerEmail], ['Fulfilment', sel.fulfillment?.replace('_', ' ')], ['Address', sel.deliveryAddress && `${sel.deliveryAddress}, ${sel.deliveryState}`], ['Table', sel.tableNumber], ['Notes', sel.notes]].filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-4"><span className="text-ink-500">{k}</span><span className="text-right">{v}</span></div>)}
            </div>
            <div className="mt-4 rounded-2xl bg-mint-50 p-4 text-sm">
              {sel.items.map((i, k) => <div key={k} className="flex justify-between py-0.5"><span>{i.quantity} × {i.name}</span><span>{naira(i.price * i.quantity)}</span></div>)}
              <div className="mt-2 flex justify-between border-t border-black/10 pt-2"><span>Subtotal</span><span>{naira(sel.subtotal)}</span></div>
              {sel.deliveryFee > 0 && <div className="flex justify-between"><span>Delivery</span><span>{naira(sel.deliveryFee)}</span></div>}
              <div className="flex justify-between font-bold"><span>Total</span><span>{naira(sel.total)}</span></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><Badge color={statusColor(sel.status)}>{ORDER_LABEL[sel.status]}</Badge>{sel.channel === 'checkout' && <><Badge color={payColor(sel.paymentStatus)}>{PAY_LABEL[sel.paymentStatus]}</Badge><Badge>{sel.paymentMethod.replace('_', ' ')}</Badge></>}</div>
            {sel.paymentMethod === 'bank_transfer' && <ProofReview order={sel} onDone={(o) => { setSel(o); load(); }} />}
            {err && <div className="mt-3"><Alert>{err}</Alert></div>}
            <div className="mt-5 flex flex-wrap gap-2">
              {(NEXT_STATUS[sel.status] || []).filter((s) => !(sel.channel === 'whatsapp' && s === 'out_for_delivery')).map((s) => (
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
