import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, upload, naira, ORDER_LABEL, PAY_LABEL } from '../../lib/api';
import { Spinner, Badge, statusColor, payColor, Logo, Alert } from '../../components/ui';
import { ReportModal } from '../../components/ReportForm';
import InstallBanner from '../../components/InstallBanner';
import { useVisibleInterval } from '../../lib/hooks';

const FLOW = ['pending', 'accepted', 'preparing', 'ready', 'completed'];

export default function Track() {
  const { token } = useParams(); const [o, setO] = useState(null); const [err, setErr] = useState('');
  const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [report, setReport] = useState(false);
  const refetch = () => api.get(`/public/track/${token}`).then(setO);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  // Returning from Paystack: ask the SERVER to verify. The URL alone proves nothing.
  useEffect(() => {
    if (!new URLSearchParams(location.search).get('pay')) return undefined;
    let stop = false, tries = 0;
    setMsg({ kind: 'info', text: 'Confirming your payment…' });
    const check = async () => {
      if (stop) return;
      tries += 1;
      try {
        const r = await api.post(`/public/track/${token}/verify-payment`);
        if (stop) return;
        if (r.status === 'success') { setMsg({ kind: 'ok', text: 'Payment confirmed. Thank you!' }); refetch(); return; }
        if (r.status === 'failed') { setMsg({ kind: 'error', text: 'Payment did not go through. You can try again below.' }); refetch(); return; }
      } catch { /* try again */ }
      if (tries < 10) setTimeout(check, 3000); // bank transfers can take a few seconds to settle
      else { setMsg({ kind: 'info', text: 'We are still confirming your payment. This page will update on its own.' }); refetch(); }
    };
    check();
    return () => { stop = true; };
  }, [token]);
  useEffect(() => {
    let stop = false;
    api.get(`/public/track/${token}`).then((d) => !stop && setO(d)).catch((e) => !stop && setErr(e.message));
    return () => { stop = true; };
  }, [token]);
  // PERF (changed): status polling (every 15s) now pauses in hidden tabs and stops entirely once the order is finished,
  // instead of polling forever. Errors during a refresh are ignored so a brief network drop doesn't replace the page with "not found".
  const finished = o && ['completed', 'cancelled'].includes(o.status) && !['awaiting_payment', 'pending', 'awaiting_verification'].includes(o.paymentStatus);
  useVisibleInterval(() => { if (!finished) api.get(`/public/track/${token}`).then(setO).catch(() => {}); }, 15000);
  if (err) return <div className="grid min-h-screen place-items-center p-6 text-center"><div><h1 className="font-display text-3xl font-bold">Order not found</h1><p className="mt-2 text-ink-500">Check that you used the full link from your confirmation.</p></div></div>;
  if (!o) return <Spinner />;
  const idx = FLOW.indexOf(o.status);
  return (
    <div className="mx-auto max-w-lg p-4 pb-16">
      <div className="py-4"><Logo /></div>
      <InstallBanner id={`track:${o.restaurantSlug || 'x'}`} name={o.restaurant} text="Add to your home screen to follow your order and reorder fast." className="mb-3" />
      <div className="card space-y-5 p-6">
        <div><div className="text-xs text-ink-500">{o.restaurant}</div><div className="font-display text-2xl font-bold">{o.reference}</div></div>
        <div className="flex flex-wrap gap-2"><Badge color={statusColor(o.status)}>{ORDER_LABEL[o.status]}</Badge><Badge color={payColor(o.paymentStatus)}>{PAY_LABEL[o.paymentStatus]}</Badge></div>
        {o.status !== 'cancelled' && <div className="flex items-center">{FLOW.map((s, i) => <div key={s} className="flex flex-1 items-center"><div className={`h-3 w-3 rounded-full ${i <= idx ? 'bg-brand-500' : 'bg-ink-300'}`} />{i < FLOW.length - 1 && <div className={`h-0.5 flex-1 ${i < idx ? 'bg-brand-500' : 'bg-ink-300'}`} />}</div>)}</div>}
        <div className="rounded-2xl bg-mint-50 p-4 text-sm">{o.items.map((i, k) => <div key={k} className="py-0.5"><div className="flex justify-between"><span>{i.quantity} × {i.name}</span><span>{naira(i.price * i.quantity)}</span></div>{(i.addons || []).length > 0 && <div className="pl-4 text-xs text-ink-500">+ {i.addons.map((a) => a.name).join(', ')}</div>}</div>)}
          {o.deliveryFee > 0 && <div className="flex justify-between py-0.5"><span>Delivery</span><span>{naira(o.deliveryFee)}</span></div>}
          <div className="mt-2 flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{naira(o.total)}</span></div></div>
        <div className="text-sm text-ink-700"><b>{o.fulfillment?.replace('_', ' ')}</b>{o.deliveryAddress && <> · {o.deliveryAddress}</>}{o.pickupAddress && <> · Collect from {o.pickupAddress}</>}</div>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        {o.paymentMethod === 'paystack' && ['awaiting_payment', 'pending', 'failed'].includes(o.paymentStatus) && o.status !== 'cancelled' && (
          <button className="btn-accent w-full" disabled={busy} onClick={() => run(async () => { const r = await api.post(`/public/track/${token}/pay`); location.href = r.authorizationUrl; })}>{o.paymentStatus === 'failed' ? 'Try payment again' : 'Pay now'} · {naira(o.total)}</button>
        )}
        {o.paymentMethod === 'bank_transfer' && ['awaiting_payment', 'rejected', 'awaiting_verification'].includes(o.paymentStatus) && o.status !== 'cancelled' && (
          <div className="space-y-2 rounded-2xl bg-mint-50 p-4 text-sm">
            <b>{o.paymentStatus === 'awaiting_verification' ? 'Proof received, awaiting the restaurant' : o.paymentStatus === 'rejected' ? 'Proof not accepted. Please upload a clearer one.' : 'Upload your payment proof'}</b>
            <p className="text-xs text-ink-500">Transfer {naira(o.total)}, then upload a screenshot. The restaurant checks its bank records before confirming. Uploading does not mark your order as paid.</p>
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 5 * 1024 * 1024) return setMsg({ kind: 'error', text: 'Image must be under 5 MB.' }); run(async () => { await upload(`/public/track/${token}/proof`, f, 'proof'); setMsg({ kind: 'ok', text: 'Proof uploaded. The restaurant will review it.' }); await refetch(); }); e.target.value = ''; }} />
          </div>
        )}
        <p className="text-xs text-ink-500">This page refreshes automatically. Last update {new Date(o.updatedAt).toLocaleString()}. <button className="underline" onClick={() => setReport(true)}>Report a problem with this order</button></p>
      </div>
      {report && <ReportModal onClose={() => setReport(false)} source="tracking" orderRef={o.reference} defaultKind="complaint" />}
    </div>
  );
}
