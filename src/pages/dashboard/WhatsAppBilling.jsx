import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Badge, CardSkeleton, RetryError } from '../../components/ui';
import { WaTabs } from './WhatsAppCommerce';

const when = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const day = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
const TX = { monthly_allocation: 'Monthly credits added', message_deduction: 'Message delivered', topup_purchase: 'Credits bought', admin_adjustment: 'Adjusted by Ordarly', credit_expiry: 'Credits expired', message_refund: 'Refund' };
const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-ink-500">{k}</span><span className="text-right font-medium">{v}</span></div>;

// Two separate worlds on one page, on purpose: Ordarly credits (what Ordarly meters) and Meta billing (what Meta charges you directly).
export default function WhatsAppBilling() {
  const [sp, setSp] = useSearchParams();
  const [cr, setCr] = useState(null); const [meta, setMeta] = useState(null); const [tx, setTx] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState('');
  const load = useCallback(() => {
    setErr('');
    api.get('/whatsapp/credits').then(setCr).catch((e) => setErr(e.message));
    api.get('/whatsapp/credits/transactions').then(setTx).catch(() => {});
    api.get('/whatsapp/meta-status').then(setMeta).catch(() => setMeta({ error: 'Could not load Meta information.' }));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Back from Paystack: the server asks Paystack itself whether the payment really succeeded. Nothing is added just because this page opened.
  const ref = sp.get('reference') || sp.get('trxref');
  useEffect(() => {
    if (!ref || !/^WAC-/.test(ref)) return;
    api.post('/whatsapp/credits/verify', { reference: ref }).then((r) => {
      setMsg(r.status === 'success' ? { kind: 'ok', text: 'Payment confirmed. Your credits have been added.' } : r.status === 'pending' ? { kind: 'info', text: 'We are still waiting for Paystack to confirm the payment. Refresh in a minute; credits are added automatically once it is confirmed.' } : { kind: 'error', text: r.status === 'attention' ? 'We received a payment that needs manual checking. Please contact support with your reference.' : 'The payment was not completed. You have not been charged for credits.' });
      setSp({}, { replace: true }); load();
    }).catch((e) => setMsg({ kind: 'error', text: e.message }));
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  const buy = async (id) => { setBusy(id); setMsg(null); try { const r = await api.post('/whatsapp/credits/purchase', { packageId: id }); window.location.href = r.authorizationUrl; } catch (e) { setMsg({ kind: 'error', text: e.message }); setBusy(''); } };
  const refreshMeta = () => { setMeta(null); api.get('/whatsapp/meta-status?refresh=1').then(setMeta).catch(() => setMeta({ error: 'Could not load Meta information.' })); };

  if (err && !cr) return <RetryError message={err} onRetry={load} />;
  if (!cr) return <CardSkeleton lines={6} />;
  const w = cr.wallet;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h3 className="text-lg font-bold">WhatsApp usage &amp; billing</h3><p className="text-sm text-ink-500">Two separate things: <b>Ordarly credits</b> (managed here) and <b>Meta billing</b> (charged to you by Meta).</p></div>
      <WaTabs here="/dashboard/whatsapp/billing" />
      {msg && <div role="status"><Alert kind={msg.kind}>{msg.text}</Alert></div>}

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-base font-bold">Ordarly message credits</h4>{w.level === 'zero' ? <Badge color="red">Finished</Badge> : w.level ? <Badge color="amber">Running low</Badge> : <Badge color="green">OK</Badge>}</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-brand-50 p-4"><div className="text-xs text-ink-500">Total available</div><div className="text-3xl font-bold">{w.totalAvailable}</div></div>
          <div className="rounded-2xl bg-black/5 p-4"><div className="text-xs text-ink-500">Monthly ({w.plan} plan)</div><div className="text-2xl font-bold">{w.monthlyRemaining}<span className="text-sm font-normal text-ink-500"> of {w.monthlyAllowance}</span></div><div className="text-xs text-ink-500">Renews {day(w.nextRenewal)}. Unused monthly credits do not roll over.</div></div>
          <div className="rounded-2xl bg-black/5 p-4"><div className="text-xs text-ink-500">Bought credits</div><div className="text-2xl font-bold">{w.purchasedBalance}</div><div className="text-xs text-ink-500">{w.nextPurchasedExpiry ? `Some expire ${day(w.nextPurchasedExpiry.at)}` : 'Kept until used'}</div></div>
        </div>
        {w.reserved > 0 && <p className="text-xs text-ink-500">{w.reserved} credit{w.reserved === 1 ? ' is' : 's are'} held for messages waiting to be confirmed as delivered. They are only spent once WhatsApp confirms delivery.</p>}
        <p className="text-sm text-ink-500">{cr.rules}</p>
        {cr.policy && <p className="text-xs text-ink-500">{cr.policy}</p>}
        <div>
          <h5 className="mb-2 font-semibold">Buy more credits</h5>
          {cr.packages.length === 0 ? <p className="text-sm text-ink-500">Credit packs are not available yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-3">{cr.packages.map((p) => (
              <div key={p.id} className="rounded-2xl border border-black/10 p-4"><div className="font-bold">{p.name}</div><div className="text-2xl font-bold">{p.credits}<span className="text-sm font-normal text-ink-500"> credits</span></div><div className="text-sm">{naira(p.price)}</div><div className="mb-3 text-xs text-ink-500">{p.expiryDays ? `Expires ${p.expiryDays} days after purchase` : 'Never expires'}</div>
                <button className="btn-primary w-full !py-2 text-sm" disabled={!!busy} onClick={() => buy(p.id)}>{busy === p.id ? 'Opening payment…' : 'Buy'}</button></div>))}</div>)}
          <p className="mt-2 text-xs text-ink-500">Paid securely with Paystack. Credits are added only after Paystack confirms the payment. This buys Ordarly credits only; it does not pay Meta.</p>
        </div>
      </section>

      <section className="card p-5">
        <h4 className="mb-2 text-base font-bold">Credit history</h4>
        {!tx ? <CardSkeleton lines={3} /> : tx.transactions.length === 0 ? <p className="text-sm text-ink-500">No credit activity yet.</p> : (
          <ul className="divide-y divide-black/5 text-sm">{tx.transactions.map((t) => (
            <li key={t._id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><b>{TX[t.transactionType] || t.transactionType}</b>{t.description ? <span className="block text-xs text-ink-500">{t.description}</span> : null}</span>
              <span className="text-right"><span className={t.amount > 0 ? 'font-semibold text-green-700' : 'font-semibold'}>{t.amount > 0 ? '+' : ''}{t.amount}</span><span className="block text-xs text-ink-500">{when(t.createdAt)} · balance {t.newBalance}</span></span></li>))}</ul>)}
      </section>

      <section className="card space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-base font-bold">Meta WhatsApp billing &amp; limits</h4><button className="btn-ghost !px-3 !py-1 text-xs" onClick={refreshMeta}>Refresh from Meta</button></div>
        <p className="text-sm text-ink-500">Charges for WhatsApp conversations and templates are billed by Meta to your own WhatsApp Business Account, not by Ordarly. Ordarly only shows what Meta tells it. Anything Meta does not provide says “Not available from Meta.”</p>
        {!meta ? <CardSkeleton lines={4} /> : !meta.connected ? <p className="text-sm text-ink-500">Connect WhatsApp to see Meta information.</p> : (
          <div className="divide-y divide-black/5">
            {meta.error && <Alert kind="info">Meta could not be fully reached: some details may be missing.</Alert>}
            <Row k="Number" v={meta.phone.number} /><Row k="Verified business name" v={meta.phone.verifiedName} /><Row k="Number status" v={meta.phone.status} />
            <Row k="Quality rating" v={meta.phone.quality} /><Row k="Messaging limit" v={meta.phone.messagingLimitTier} />
            <Row k="Account review" v={meta.account.reviewStatus} /><Row k="Business verification" v={meta.account.businessVerification} /><Row k="Billing currency" v={meta.account.currency} />
            <Row k="Free messaging allowance" v={meta.billing.freeAllowance} /><Row k="Order-update template" v={meta.templates.orderUpdate} />
            <p className="pt-2 text-xs text-ink-500">{meta.billing.note} Add or change your payment method in Meta Business Suite → WhatsApp Manager. {meta.fetchedAt ? `Last checked ${when(meta.fetchedAt)}.` : ''}</p>
          </div>)}
      </section>
    </div>
  );
}
