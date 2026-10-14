import { useEffect, useState } from 'react';
import { disablePush, enablePush, pushStatus, pushSupported, isIOS, isStandalone } from '../lib/pwa';
import { api } from '../lib/api';

/** Turn device notifications on/off. `compact` renders the slim dashboard banner (only while it is off), otherwise a full settings card. */
export default function NotifyBanner({ compact = false }) {
  const [st, setSt] = useState('loading'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false); const [enabledOnServer, setEnabledOnServer] = useState(true);
  const [skip, setSkip] = useState(() => { try { return Date.now() - Number(localStorage.getItem('ordarly-notify-dismissed')) < 3 * 864e5; } catch { return false; } });
  const refresh = () => pushStatus().then(setSt);
  useEffect(() => { refresh(); api.get('/push/key').then((k) => setEnabledOnServer(k.enabled)).catch(() => {}); }, []);
  const run = async (fn) => { setBusy(true); setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } finally { setBusy(false); refresh(); } };
  const needsInstallFirst = isIOS() && !isStandalone(); // iPhone only allows notifications for apps added to the Home Screen

  if (compact) {
    if (st !== 'off' || skip || !enabledOnServer) return null;
    return (
      <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 bg-brand-50 px-4 py-2 text-center text-sm text-brand-700 md:px-8">
        <span>🔔 Get an alert on your phone the moment a new order or message arrives.</span>
        {needsInstallFirst ? <span className="text-xs">(On iPhone, first add Ordarly to your Home Screen.)</span>
          : <button className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white" disabled={busy} onClick={() => run(enablePush)}>{busy ? 'Turning on…' : 'Turn on'}</button>}
        <button className="text-xs underline" onClick={() => { setSkip(true); try { localStorage.setItem('ordarly-notify-dismissed', String(Date.now())); } catch { /* ignore */ } }}>Not now</button>
        {msg && <span className="w-full text-xs text-red-600">{msg}</span>}
      </div>
    );
  }
  return (
    <div className="card p-6">
      <h3 className="font-bold">Device notifications</h3>
      <p className="mb-3 text-sm text-ink-500">Get alerts in your phone or computer's notification tab for new paid orders, bank-transfer proofs and customer messages, even when Ordarly is closed.</p>
      {!enabledOnServer ? <p className="text-sm text-amber-700">Notifications are not switched on for this platform yet. (Admin: set the VAPID keys on the server.)</p>
        : st === 'unsupported' ? <p className="text-sm text-amber-700">{needsInstallFirst ? 'On iPhone, add Ordarly to your Home Screen first (Share → Add to Home Screen), then open it from there and turn notifications on.' : 'This browser does not support notifications.'}</p>
        : st === 'blocked' ? <p className="text-sm text-amber-700">Notifications are blocked for this site. Allow them in your browser or phone settings, then reload this page.</p>
        : st === 'on' ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">On for this device</span>
            <button className="btn-ghost !py-1.5" disabled={busy} onClick={() => run(() => api.post('/push/test'))}>Send a test</button>
            <button className="btn-ghost !py-1.5" disabled={busy} onClick={() => run(disablePush)}>Turn off</button></div>
        : <button className="btn-primary" disabled={busy || st === 'loading' || !pushSupported()} onClick={() => run(enablePush)}>{busy ? 'Turning on…' : 'Turn on notifications'}</button>}
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}
    </div>
  );
}
