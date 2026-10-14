import { useEffect, useState } from 'react';
import { useInstall } from '../lib/pwa';

const KEY = (id) => `ordarly-install-dismissed:${id}`;
const recentlyDismissed = (id) => { try { const t = Number(localStorage.getItem(KEY(id))); return t && Date.now() - t < 7 * 864e5; } catch { return false; } };

/**
 * A friendly "add this to your phone" bar. `name` and `logo` are shown so people see exactly what they are installing.
 * Android/desktop Chrome: one tap installs. iPhone/iPad: shows the Share → Add to Home Screen steps.
 */
export default function InstallBanner({ id, name, logo, text, className = '' }) {
  const { canPrompt, ios, installed, install } = useInstall();
  const [hidden, setHidden] = useState(true); const [steps, setSteps] = useState(false);
  useEffect(() => { setHidden(recentlyDismissed(id)); }, [id]);
  if (hidden || installed || (!canPrompt && !ios)) return null;
  const close = () => { setHidden(true); try { localStorage.setItem(KEY(id), String(Date.now())); } catch { /* private mode */ } };
  return (
    <>
      <div className={`flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm ${className}`} role="region" aria-label="Install app">
        {logo ? <img src={logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white">{name.slice(0, 1)}</span>}
        <div className="min-w-0 flex-1"><div className="truncate font-bold">{name}</div><div className="text-xs text-ink-500">{text || 'Add to your phone for quick access.'}</div></div>
        <button className="btn-primary !px-3 !py-2 text-xs" onClick={() => (canPrompt ? install().then((ok) => ok && setHidden(true)) : setSteps(true))}>{canPrompt ? 'Install' : 'How to add'}</button>
        <button onClick={close} className="px-1 text-xl leading-none text-ink-500" aria-label="Dismiss">×</button>
      </div>
      {steps && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6" onClick={() => setSteps(false)}>
          <div role="dialog" aria-label="Add to Home Screen" className="w-full max-w-sm rounded-t-4xl bg-white p-6 md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold">Add {name} to your Home Screen</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>Open this page in <b>Safari</b>.</li>
              <li>Tap the <b>Share</b> button (the square with an arrow) at the bottom of the screen.</li>
              <li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
            </ol>
            <button className="btn-primary mt-5 w-full" onClick={() => setSteps(false)}>Got it</button>
          </div>
        </div>)}
    </>
  );
}
