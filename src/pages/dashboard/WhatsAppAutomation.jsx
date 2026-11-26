import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Alert, CardSkeleton, Field, RetryError } from '../../components/ui';
import WhatsAppControls from '../../components/WhatsAppControls';
import { WaTabs } from './WhatsAppCommerce';

const STATUSES = [['paid', 'Payment received'], ['accepted', 'Accepted'], ['preparing', 'Being prepared'], ['ready', 'Ready'], ['out_for_delivery', 'Out for delivery'], ['completed', 'Completed'], ['cancelled', 'Cancelled']];
const DEFAULTS = { welcomeMessage: '', businessDescription: '', outOfHoursMessage: '', handoverMessage: '', categoryIds: [], allowDelivery: true, allowPickup: true, allowOnlinePayment: true, allowPayOnDelivery: true, confirmBeforeOrder: true, handoverEnabled: true, notifyStatuses: STATUSES.map(([k]) => k), staffNotify: { push: true, email: true }, abandonHours: 24, aiEnabled: false };

function Check({ checked, onChange, children, hint }) {
  return <label className="flex items-start gap-2.5 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{children}{hint && <span className="block text-xs text-ink-500">{hint}</span>}</span></label>;
}

const AI_STATE = { available: ['green', 'AI help is working'], temporarily_unavailable: ['amber', 'AI help is temporarily unavailable'], limit_reached: ['amber', 'AI limit reached'], disabled_by_admin: ['gray', 'AI help is switched off by Ordarly'], not_configured: ['gray', 'AI help is not available yet'] };
function AiSection({ s, set }) {
  const [st, setSt] = useState(null);
  useEffect(() => { api.get('/whatsapp/ai-status').then(setSt).catch(() => {}); }, [s.aiEnabled]);
  const [tone, label] = st ? (AI_STATE[st.state] || AI_STATE.not_configured) : ['gray', 'Checking…'];
  return (
    <section className="card space-y-3 p-5">
      <h4 className="font-bold">AI help for tricky messages</h4>
      <p className="text-xs text-ink-500">Your assistant always understands orders with its own rules first. When a message is unclear, AI can suggest what the customer meant. The AI never sets prices, never changes customer details and never places an order: Ordarly checks everything against your real menu, and the customer confirms before anything is added. Only the message text and your menu item names are sent, never phone numbers, names or addresses.</p>
      <Check checked={!!s.aiEnabled} onChange={set('aiEnabled')} hint="Save the form to apply. Turning this off never stops your WhatsApp automation; it simply works in basic mode.">Use AI help</Check>
      {st && (
        <div className="rounded-2xl bg-mint-50 p-3 text-sm">
          <div><b>Status:</b> {label}{st.basicMode && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs">Basic mode</span>}</div>
          {st.why && <div className="mt-1 text-xs text-ink-500">{st.why}</div>}
          <div className="mt-1 text-xs text-ink-500">AI requests today: {st.usage.today}{st.usage.dailyLimit ? ` of ${st.usage.dailyLimit}` : ''} · this month: {st.usage.month}{st.usage.monthlyLimit ? ` of ${st.usage.monthlyLimit}` : ''}. These do not use your Ordarly message credits.</div>
        </div>
      )}
    </section>
  );
}

// Automation settings: the three on/off controls, then what the assistant says and offers. Opening hours, delivery prices and your menu are read from
// the rest of Ordarly (Settings, Delivery & Pickup, Menu); they are not copied here.
export default function WhatsAppAutomation() {
  const [s, setS] = useState(null); const [cats, setCats] = useState([]); const [err, setErr] = useState(''); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  const load = () => { setErr(''); api.get('/whatsapp/settings').then((r) => setS({ ...DEFAULTS, ...r.settings, staffNotify: { ...DEFAULTS.staffNotify, ...(r.settings.staffNotify || {}) }, notifyStatuses: r.settings.notifyStatuses || DEFAULTS.notifyStatuses, categoryIds: (r.settings.categoryIds || []).map(String) })).catch((e) => setErr(e.message)); };
  useEffect(() => { load(); api.get('/menu').then((r) => setCats(Array.isArray(r) ? r : r.categories || [])).catch(() => {}); }, []);
  if (err && !s) return <RetryError message={err} onRetry={load} />;
  if (!s) return <CardSkeleton lines={6} />;
  const set = (k) => (v) => setS({ ...s, [k]: v });
  const text = (k) => (e) => setS({ ...s, [k]: e.target.value });
  const toggleIn = (k, v) => setS({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try { await api.patch('/whatsapp/settings', { ...s, abandonHours: Number(s.abandonHours) || 24 }); setMsg({ kind: 'ok', text: 'Saved. New settings apply to the very next message.' }); }
    catch (e2) { setMsg({ kind: 'error', text: e2.message }); } finally { setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div><h3 className="text-lg font-bold">WhatsApp automation settings</h3><p className="text-sm text-ink-500">Choose what Ordarly may do on your WhatsApp number, and what it says.</p></div>
      <WaTabs here="/dashboard/whatsapp/automation" />
      <WhatsAppControls />
      <form onSubmit={save} className="space-y-5">
        <section className="card space-y-4 p-5">
          <h4 className="font-bold">Messages</h4>
          <Field label="Welcome message" hint="Sent when a customer first says hello."><textarea rows={2} maxLength={600} className="input" value={s.welcomeMessage} onChange={text('welcomeMessage')} placeholder="Hello! Welcome to our restaurant." /></Field>
          <Field label="About your business" hint="Shown once after the welcome message."><textarea rows={2} maxLength={600} className="input" value={s.businessDescription} onChange={text('businessDescription')} /></Field>
          <Field label="Message when you are closed" hint="Opening hours come from your Settings page."><textarea rows={2} maxLength={600} className="input" value={s.outOfHoursMessage} onChange={text('outOfHoursMessage')} placeholder="We are closed right now. You can order ahead on our website:" /></Field>
          <Field label="Message when a customer asks for a person"><textarea rows={2} maxLength={600} className="input" value={s.handoverMessage} onChange={text('handoverMessage')} placeholder="Thanks! A member of our team will reply here shortly." /></Field>
        </section>
        <section className="card space-y-3 p-5">
          <h4 className="font-bold">What customers can do</h4>
          <Check checked={s.allowDelivery} onChange={set('allowDelivery')} hint="Uses your delivery prices and radius from Delivery & Pickup.">Offer delivery</Check>
          <Check checked={s.allowPickup} onChange={set('allowPickup')}>Offer pickup</Check>
          <Check checked={s.allowOnlinePayment} onChange={set('allowOnlinePayment')}>Allow online payment</Check>
          <Check checked={s.allowPayOnDelivery} onChange={set('allowPayOnDelivery')} hint="Pro plan; delivery orders only.">Allow pay on delivery</Check>
          <Check checked={s.handoverEnabled} onChange={set('handoverEnabled')} hint="When off, customers who ask for a person are told you will reply when you can.">Let customers ask for a team member</Check>
          {cats.length > 0 && <div><div className="mb-1.5 text-sm font-semibold">Menu categories to show <span className="font-normal text-ink-500">(none ticked = all)</span></div><div className="flex flex-wrap gap-2">{cats.map((c) => <button type="button" key={c._id} onClick={() => toggleIn('categoryIds', String(c._id))} className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.categoryIds.includes(String(c._id)) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink-500'}`}>{c.name}</button>)}</div></div>}
        </section>
        <section className="card space-y-3 p-5">
          <h4 className="font-bold">Order updates sent to customers on WhatsApp</h4>
          <div className="flex flex-wrap gap-2">{STATUSES.map(([k, l]) => <button type="button" key={k} onClick={() => toggleIn('notifyStatuses', k)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.notifyStatuses.includes(k) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink-500'}`}>{l}</button>)}</div>
          <p className="text-xs text-ink-500">Each update uses one Ordarly credit when delivered. After 24 hours without a customer message, WhatsApp only allows an approved template message; Ordarly sets one up for you and Meta reviews it.</p>
        </section>
        <AiSection s={s} set={set} />
        <section className="card space-y-3 p-5">
          <h4 className="font-bold">Your team</h4>
          <Check checked={s.staffNotify.push} onChange={(v) => setS({ ...s, staffNotify: { ...s.staffNotify, push: v } })}>Notify me on this device when a customer needs a person</Check>
          <Check checked={s.staffNotify.email} onChange={(v) => setS({ ...s, staffNotify: { ...s.staffNotify, email: v } })}>Also email me</Check>
          <Field label="Start fresh after a customer has been quiet for (hours)"><input type="number" min={1} max={168} className="input !w-32" value={s.abandonHours} onChange={text('abandonHours')} /></Field>
        </section>
        {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>
    </div>
  );
}
