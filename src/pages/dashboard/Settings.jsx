import { useCallback, useEffect, useState } from 'react';
import { api, STATES } from '../../lib/api';
import { useDash } from '../../components/DashboardLayout';
import { Alert, Field, Badge } from '../../components/ui';
import ImageField from '../../components/ImageField';
import PlaceSearch from '../../components/PlaceSearch';
import NotifyBanner from '../../components/NotifyBanner';
import { Link } from 'react-router-dom';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CustomDomain({ isPro }) {
  const [info, setInfo] = useState(null); const [domain, setDomain] = useState(''); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/restaurant/custom-domain').then((d) => { setInfo(d.domain ? d : null); setDomain(d.domain || ''); }); }, []);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  return (
    <div className="card p-6">
      <div className="mb-1 flex items-center gap-2"><h3 className="font-bold">Custom domain</h3><Badge color="amber">Pro</Badge></div>
      <p className="mb-4 text-sm text-ink-500">Serve your ordering page from your own domain, like <b>order.yourrestaurant.com</b>.</p>
      {!isPro ? (
        <div className="rounded-2xl bg-tomato-50 p-4 text-sm">Custom domains are available on Pro. <Link to="/dashboard/subscription" className="font-semibold text-tomato-600 underline">Upgrade</Link></div>
      ) : (
        <div className="space-y-4">
          {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input className="input" placeholder="order.yourrestaurant.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <button className="btn-primary" disabled={busy || !domain} onClick={() => run(async () => { setInfo(await api.put('/restaurant/custom-domain', { domain })); })}>{info ? 'Update' : 'Connect'}</button>
          </div>
          {info && (
            <div className="space-y-3 rounded-2xl bg-mint-50 p-4 text-sm">
              <div className="flex items-center gap-2"><b>{info.domain}</b>{info.status === 'verified' ? <Badge color="green">Verified</Badge> : <Badge color="amber">Waiting for DNS</Badge>}</div>
              <p className="text-ink-500">Add these records at your domain provider, then click Verify:</p>
              <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-ink-500"><tr><th className="py-1 pr-3">Type</th><th className="pr-3">Host</th><th>Value</th></tr></thead>
                <tbody>{info.dns.map((r) => <tr key={r.type} className="border-t border-black/5"><td className="py-1.5 pr-3 font-bold">{r.type}</td><td className="break-all pr-3">{r.host}</td><td className="break-all">{r.value}</td></tr>)}</tbody></table></div>
              <p className="text-xs text-ink-500">{info.note}</p>
              <div className="flex gap-2">
                <button className="btn-dark" disabled={busy} onClick={() => run(async () => { const r = await api.post('/restaurant/custom-domain/verify'); setInfo(r); setMsg(r.verified ? { kind: 'ok', text: 'Domain verified.' } : { kind: 'info', text: r.error }); })}>Verify DNS</button>
                <button className="btn-ghost" onClick={() => run(async () => { await api.del('/restaurant/custom-domain'); setInfo(null); setDomain(''); })}>Remove</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { data, reload } = useDash(); const r = data.restaurant;
  const [f, setF] = useState({ name: r.name, description: r.description || '', phone: r.phone || '', email: r.email || '', whatsapp: r.whatsapp || '', address: r.address || '', state: r.state || 'Lagos', logo: r.logo || '', cover: r.cover || '', acceptingOrders: r.acceptingOrders, placeId: '', sessionToken: '', openingHours: r.openingHours?.length ? r.openingHours : DAYS.map((_, day) => ({ day, open: '09:00', close: '21:00', closed: false })) });
  const [slug, setSlug] = useState(r.slug); const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const searchPlaces = useCallback((input, sessionToken) => api.post('/restaurant/places/autocomplete', { input, sessionToken }).then((x) => x.suggestions || x), []);
  const save = async (e) => {
    e.preventDefault(); setMsg(null);
    try { const body = { ...f }; if (!body.placeId) { delete body.placeId; delete body.sessionToken; } await api.patch('/restaurant', body); await reload(); setMsg({ kind: 'ok', text: 'Saved.' }); } catch (x) { setMsg({ kind: 'error', text: x.message }); }
  };
  const saveSlug = async () => { try { await api.patch('/restaurant/slug', { slug }); await reload(); setMsg({ kind: 'ok', text: 'Page link updated. Old link no longer works.' }); } catch (x) { setMsg({ kind: 'error', text: x.message }); } };
  const setHour = (i, k, v) => setF({ ...f, openingHours: f.openingHours.map((h, j) => (j === i ? { ...h, [k]: v } : h)) });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <form onSubmit={save} className="card space-y-4 p-6">
        <h3 className="font-bold">Restaurant profile</h3>
        <Field label="Restaurant name"><input className="input" required value={f.name} onChange={set('name')} /></Field>
        <Field label="Description"><textarea rows={3} className="input" value={f.description} onChange={set('description')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact phone"><input className="input" value={f.phone} onChange={set('phone')} /></Field>
          <Field label="Contact email"><input className="input" type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="WhatsApp number" hint="Include the country code, e.g. 2348012345678"><input className="input" value={f.whatsapp} onChange={set('whatsapp')} /></Field>
          <Field label="State"><select className="input" value={f.state} onChange={set('state')}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Address" hint="Start typing and pick from the list to update your delivery starting point. Typing without picking only changes the text shown on your page.">
          <PlaceSearch id="settings-address" search={searchPlaces} initial={r.address || ''} placeholder="Search your restaurant address"
            onText={(t) => setF((x) => ({ ...x, address: t, placeId: '', sessionToken: '' }))}
            onPick={(s, sessionToken) => { if (s) setF((x) => ({ ...x, address: s.text || `${s.main}, ${s.secondary}`, placeId: s.placeId, sessionToken })); }} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField label="Logo" value={f.logo} onChange={(v) => setF({ ...f, logo: v })} />
          <ImageField label="Cover image" value={f.cover} onChange={(v) => setF({ ...f, cover: v })} />
        </div>
        <div>
          <div className="label">Opening hours</div>
          <div className="space-y-1.5">{f.openingHours.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-sm"><span className="w-10 font-semibold">{DAYS[h.day]}</span>
              <input type="time" className="input !w-28 !py-1.5" disabled={h.closed} value={h.open} onChange={(e) => setHour(i, 'open', e.target.value)} />–
              <input type="time" className="input !w-28 !py-1.5" disabled={h.closed} value={h.close} onChange={(e) => setHour(i, 'close', e.target.value)} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!h.closed} onChange={(e) => setHour(i, 'closed', e.target.checked)} />Closed</label></div>))}</div>
          <p className="mt-1 text-xs text-ink-500">Times use West Africa Time (Lagos).</p>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.acceptingOrders} onChange={(e) => setF({ ...f, acceptingOrders: e.target.checked })} /> Currently accepting orders</label>
        <button className="btn-primary">Save changes</button>
      </form>

      <NotifyBanner />

      <div className="card space-y-3 p-6">
        <h3 className="font-bold">Page link</h3>
        <div className="flex flex-col gap-2 sm:flex-row"><div className="flex flex-1 items-center overflow-hidden rounded-2xl border border-ink-300 bg-white text-sm"><span className="bg-mint-100 px-3 py-2.5 text-ink-500">{import.meta.env.VITE_PLATFORM_DOMAIN || location.host}/</span><input className="flex-1 px-2 outline-none" value={slug} onChange={(e) => setSlug(e.target.value)} /></div><button className="btn-ghost" onClick={saveSlug}>Update link</button></div>
        <p className="text-xs text-ink-500">Changing your link breaks old links and printed QR codes. Choose carefully.</p>
      </div>

      <CustomDomain isPro={data.isPro} />
    </div>
  );
}
