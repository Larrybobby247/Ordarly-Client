import { useState } from 'react';

// Chip input: type and press Enter (or comma) to add a tag, click x to remove it.
export default function TagInput({
  value, onChange, placeholder = 'Type and press Enter', normalize = (s) => s.trim(), display = (s) => s,
  validate, suggestions = [], max = 100, chipClass = 'bg-brand-50 text-brand-700',
}) {
  const [text, setText] = useState(''); const [err, setErr] = useState('');

  const add = (raw) => {
    const parts = String(raw).split(/[,\n]/).map(normalize).filter(Boolean);
    if (!parts.length) { setText(''); return; }
    const next = [...value]; let problem = '';
    for (const p of parts) {
      if (next.includes(p)) continue;
      const e = validate?.(p);
      if (e) { problem = e; continue; }
      if (next.length >= max) { problem = `You can add up to ${max}.`; break; }
      next.push(p);
    }
    setErr(problem);
    if (next.length !== value.length) onChange(next);
    setText('');
  };

  const open = suggestions.filter((s) => !value.includes(s));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-ink-300 bg-white p-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        {value.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${chipClass}`}>
            {display(t)}
            <button type="button" aria-label={`Remove ${display(t)}`} className="text-sm leading-none opacity-70 hover:opacity-100" onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none" placeholder={value.length ? '' : placeholder} value={text}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => text.trim() && add(text)}
        />
      </div>
      {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
      {open.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-ink-500">Suggestions:</span>
          {open.slice(0, 12).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-dashed border-ink-300 px-2.5 py-0.5 text-[11px] text-ink-700 hover:border-brand-500 hover:text-brand-700">+ {display(s)}</button>
          ))}
        </div>
      )}
    </div>
  );
}
