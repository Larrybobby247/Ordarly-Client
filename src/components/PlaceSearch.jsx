import { useEffect, useRef, useState } from 'react';

const token = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

// Address search box. `search(input, sessionToken)` must resolve to [{placeId, main, secondary}].
// Suggestions come from our own server, so the browser never holds a map/search key.
export default function PlaceSearch({ search, onPick, onText, placeholder = 'Start typing your address…', initial = '', id, disabled }) {
  const [q, setQ] = useState(initial); const [list, setList] = useState([]); const [show, setShow] = useState(false);
  const [hi, setHi] = useState(0); const [state, setState] = useState('idle'); // idle | loading | empty | error
  const session = useRef(token()); const seq = useRef(0); const picked = useRef(!!initial);

  useEffect(() => { setQ(initial); picked.current = !!initial; }, [initial]);
  useEffect(() => {
    if (picked.current || q.trim().length < 3) { setList([]); setState('idle'); return undefined; }
    const my = ++seq.current; setState('loading');
    const t = setTimeout(async () => {
      try {
        const r = await search(q.trim(), session.current);
        if (my !== seq.current) return;
        setList(r); setHi(0); setState(r.length ? 'idle' : 'empty'); setShow(true);
      } catch { if (my === seq.current) { setList([]); setState('error'); } }
    }, 300);
    return () => clearTimeout(t);
  }, [q, search]);

  const pick = (s) => {
    picked.current = true; const full = s.text || `${s.main}, ${s.secondary}`; setQ(full); onText?.(full); setShow(false); setList([]);
    onPick(s, session.current); session.current = token(); // a new billing session starts after each pick
  };

  return (
    <div className="relative">
      <input id={id} className="input" autoComplete="off" maxLength={400} disabled={disabled} placeholder={placeholder} value={q} role="combobox" aria-expanded={show && list.length > 0} aria-controls={`${id}-list`}
        onChange={(e) => { picked.current = false; setQ(e.target.value); setShow(true); onText?.(e.target.value); if (e.target.value.trim().length < 3) onPick(null); }}
        onFocus={() => setShow(true)} onBlur={() => setTimeout(() => setShow(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && show && list[hi]) { e.preventDefault(); pick(list[hi]); }
          else if (e.key === 'Escape') setShow(false);
        }} />
      {state === 'loading' && <span className="absolute right-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" aria-hidden="true" />}
      {show && list.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white p-1 shadow-lg">
          {list.map((s, i) => (
            <li key={s.placeId} role="option" aria-selected={i === hi}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${i === hi ? 'bg-brand-50' : ''}`}>
                <span className="font-semibold">{s.main}</span>{s.secondary && <span className="block text-xs text-ink-500">{s.secondary}</span>}
              </button>
            </li>))}
          {/* LocationIQ asks free-plan users to credit them where their results are shown */}
          <li className="px-3 py-1 text-right text-[10px] text-ink-500" aria-hidden="true"><a href="https://locationiq.com/?ref=maps" target="_blank" rel="noreferrer" className="underline" onMouseDown={(e) => e.preventDefault()}>Search by LocationIQ.com</a></li>
        </ul>)}
      {state === 'empty' && <p className="mt-1 text-xs text-ink-500">No matching address found. Try adding the area or city.</p>}
      {state === 'error' && <p className="mt-1 text-xs text-red-600">Address search is unavailable right now. Please try again.</p>}
    </div>
  );
}
