import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Alert, Badge, CardSkeleton, RetryError } from './ui';

// The three independent WhatsApp controls: connection, automation, and accepting orders.
// The server enforces every rule (and re-checks at the moment of each send); this screen only shows the state and sends the owner's choice.

const STATUS_COLOR = { connected: 'green', connecting: 'blue', verification_pending: 'amber', action_required: 'amber', restricted: 'red', connection_expired: 'red', disconnected: 'gray', not_connected: 'gray' };
const when = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const changedLine = (c) => (c ? `Last changed ${when(c.at)}${c.byName ? ` by ${c.byName}` : ''}` : 'Never changed');
const CONTROL_NAME = { connection: 'Connection', automation: 'Automation', orders: 'Accept WhatsApp orders' };

function Switch({ on, onChange, disabled, busy, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled || busy} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-brand-500' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? 'left-[1.4rem]' : 'left-0.5'}`} />
      {busy && <span className="absolute inset-0 grid place-items-center"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /></span>}
    </button>
  );
}

function ControlCard({ title, on, active, connected, children, action, last }) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold">{title}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge color={active ? 'green' : 'gray'}>{on ? 'ON' : 'OFF'}</Badge>
            {on && !connected && <Badge color="amber">Paused: not connected</Badge>}
          </div>
        </div>
        {action}
      </div>
      <div className="text-sm text-ink-500">{children}</div>
      <p className="mt-auto text-xs text-ink-500">{last}</p>
    </div>
  );
}

export default function WhatsAppControls() {
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(''); const [confirm, setConfirm] = useState(false);

  const load = useCallback(() => { setErr(''); return api.get('/whatsapp/controls').then(setD).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);

  if (err && !d) return <RetryError message={err} onRetry={load} />;
  if (!d) return <CardSkeleton lines={4} />;

  const { connection: c, automation: a, orders: o } = d;
  const noConn = !c.connected;

  // Each switch is sent on its own, so changing one can never change another. The server's answer replaces what is on screen.
  const toggle = async (key, path, enabled, text) => {
    setBusy(key); setMsg(null);
    try { setD(await api.post(path, { enabled })); setMsg({ kind: 'ok', text }); }
    catch (e) { setMsg({ kind: 'error', text: e.message }); await load(); }
    finally { setBusy(''); }
  };
  const disconnect = async () => {
    setBusy('connection'); setMsg(null);
    try {
      const r = await api.del(`/whatsapp/integrations/${c.id}`); setD(r); setConfirm(false);
      setMsg(r.metaRevoked
        ? { kind: 'ok', text: 'WhatsApp is disconnected. Your conversations, orders and credit history are kept.' }
        : { kind: 'info', text: `WhatsApp is disconnected on Ordarly and your history is kept, but Meta did not confirm the removal${r.metaNote ? ` (${r.metaNote})` : ''}. To be sure, also remove Ordarly under Business Integrations in your Meta Business settings.` });
    } catch (e) { setMsg({ kind: 'error', text: e.message }); } finally { setBusy(''); }
  };

  return (
    <div className="space-y-4">
      {msg && <div role="status"><Alert kind={msg.kind}>{msg.text}</Alert></div>}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 1. Connection */}
        <ControlCard title="WhatsApp connection" on={c.connected} active={c.connected} connected last={changedLine(c.lastChange)}
          action={c.connected && !confirm && <button type="button" className="btn-ghost !px-4 !py-1.5 text-xs" disabled={busy === 'connection'} onClick={() => setConfirm(true)}>Disconnect</button>}>
          <div className="mb-1"><Badge color={STATUS_COLOR[c.status]}>{c.label}</Badge></div>
          {c.displayPhoneNumber && <div className="font-medium text-ink-900">{c.displayPhoneNumber}{c.verifiedDisplayName ? ` · ${c.verifiedDisplayName}` : ''}</div>}
          <p className="mt-1">{c.help}</p>
          {!c.connected && !c.canConnect && <p className="mt-2 text-xs">Connecting a number becomes available once Ordarly's Meta setup is complete.</p>}
          {confirm && (
            <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">
              <p className="text-sm font-semibold">Disconnect WhatsApp?</p>
              <p className="mt-1 text-xs">Ordarly stops receiving this number's messages, and Automation and Accept WhatsApp orders are switched off. Your past conversations, orders and credit history are <b>not</b> deleted.</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="btn-dark !px-4 !py-1.5 text-xs" disabled={busy === 'connection'} onClick={disconnect}>{busy === 'connection' ? 'Disconnecting…' : 'Yes, disconnect'}</button>
                <button type="button" className="btn-ghost !px-4 !py-1.5 text-xs" disabled={busy === 'connection'} onClick={() => setConfirm(false)}>Keep connected</button>
              </div>
            </div>)}
        </ControlCard>

        {/* 2. Automation */}
        <ControlCard title="Automation" on={a.enabled} active={a.active} connected={c.connected} last={changedLine(a.lastChange)}
          action={<Switch on={a.enabled} label="Automation" disabled={noConn && !a.enabled} busy={busy === 'automation'}
            onChange={(v) => toggle('automation', '/whatsapp/automation/toggle', v, v ? 'Automation is ON. Ordarly will answer new customer messages automatically.' : 'Automation is OFF. Ordarly will not send any automated message. Customer messages are still received and saved, and you can reply yourself.')} />}>
          {a.enabled
            ? 'Ordarly sends automated greetings, menus, ordering conversations and follow-ups for you.'
            : 'Ordarly sends no automated replies, menus, ordering conversations or follow-ups. Customer messages are still received and saved, and you can still reply yourself.'}
          <span className="mt-1 block text-xs">Switching this back on never sends old queued messages or restarts old conversations with a greeting. Only customer messages received after it is on are answered.</span>
          {noConn && !a.enabled && <span className="mt-1 block text-xs font-medium">Connect WhatsApp to switch this on.</span>}
        </ControlCard>

        {/* 3. Accept orders */}
        <ControlCard title="Accept WhatsApp orders" on={o.enabled} active={o.active} connected={c.connected} last={changedLine(o.lastChange)}
          action={<Switch on={o.enabled} label="Accept WhatsApp orders" disabled={noConn && !o.enabled} busy={busy === 'orders'}
            onChange={(v) => toggle('orders', '/whatsapp/orders/toggle', v, v ? 'WhatsApp orders are ON. Customers can now place new orders on WhatsApp.' : 'WhatsApp orders are OFF. Customers cannot place new WhatsApp orders. Existing orders and your support inbox are not affected.')} />}>
          {o.enabled
            ? 'Customers can place new orders on WhatsApp. They place them through the automated ordering conversation, so keep Automation on too.'
            : 'Customers cannot place new WhatsApp orders. Orders already placed are unaffected, and customers can still message your team.'}
          {!o.enabled && <span className="mt-1 block text-xs">If Automation is on, customers are pointed to your online ordering page: <span className="break-all font-medium text-ink-900">{o.onlineOrderingUrl}</span></span>}
          {noConn && !o.enabled && <span className="mt-1 block text-xs font-medium">Connect WhatsApp to switch this on.</span>}
        </ControlCard>
      </div>

      <p className="text-xs text-ink-500">Each control works on its own: switching off Automation does not disconnect your number, and switching off orders does not switch off your inbox. Changes apply straight away.</p>

      {d.history.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer font-bold">Change history</summary>
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {d.history.map((h, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span><b>{CONTROL_NAME[h.control]}</b>: {h.from} → {h.to}{h.note ? <span className="block text-xs text-ink-500">{h.note}</span> : null}</span>
                <span className="text-xs text-ink-500">{when(h.at)}{h.byName ? ` · ${h.byName}` : ''}</span>
              </li>))}
          </ul>
        </details>)}
    </div>
  );
}
