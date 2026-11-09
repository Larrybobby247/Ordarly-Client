import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const t12 = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const dayLabel = (ymd) => new Intl.DateTimeFormat('en-NG', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${ymd}T12:00:00Z`));
export const slotLabel = (ymd, time) => `${dayLabel(ymd)}, ${t12(time)}`;

/**
 * ASAP vs "schedule for later". Only dates and slots that the SERVER says are bookable are shown (opening hours of the chosen branch,
 * notice period, booking window, capacity). The server checks the chosen slot again when the order is placed.
 * value: { when: 'asap' | 'later', start, label }
 */
export function SchedulePicker({ slug, branchId, isOpen, value, onChange }) {
  const [days, setDays] = useState(null); const [date, setDate] = useState(''); const [slots, setSlots] = useState(null); const [err, setErr] = useState(''); const [tick, setTick] = useState(0);
  const qs = branchId ? `branch=${encodeURIComponent(branchId)}` : '';
  useEffect(() => {
    if (value.when !== 'later') return;
    setErr(''); api.get(`/public/r/${slug}/slots${qs ? `?${qs}` : ''}`).then((r) => { setDays(r.days); if (r.days.length && !date) setDate(r.days[0].date); }).catch((e) => setErr(e.message));
  }, [value.when, slug, qs, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (value.when !== 'later' || !date) return;
    setSlots(null); api.get(`/public/r/${slug}/slots?${qs ? `${qs}&` : ''}date=${date}`).then((r) => setSlots(r.slots)).catch((e) => setErr(e.message));
  }, [date, value.when, slug, qs, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  // Parent bumps this when the server says a slot just filled up.
  useEffect(() => { if (value.refresh) setTick((n) => n + 1); }, [value.refresh]);

  return (
    <div className="space-y-3">
      <div className="label">When do you want it?</div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Order timing">
        <button type="button" role="radio" aria-checked={value.when === 'asap'} disabled={!isOpen} onClick={() => onChange({ when: 'asap', start: '', label: '' })}
          className={`rounded-2xl border p-3 text-left text-sm ${value.when === 'asap' ? 'border-tomato-500 bg-tomato-50' : 'border-ink-300'} ${!isOpen ? 'opacity-50' : ''}`}><b>Order ASAP</b><span className="block text-xs text-ink-500">{isOpen ? 'Prepared right away' : 'Closed right now'}</span></button>
        <button type="button" role="radio" aria-checked={value.when === 'later'} onClick={() => onChange({ when: 'later', start: '', label: '' })}
          className={`rounded-2xl border p-3 text-left text-sm ${value.when === 'later' ? 'border-tomato-500 bg-tomato-50' : 'border-ink-300'}`}><b>Schedule for later</b><span className="block text-xs text-ink-500">Pick a date and time</span></button>
      </div>
      {value.when === 'later' && (
        <div className="space-y-3 rounded-2xl bg-mint-50 p-3">
          {err && <p className="text-xs text-red-600">{err}</p>}
          {!days && !err ? <p className="text-xs text-ink-500">Loading available times…</p> : days && days.length === 0 ? <p className="text-sm text-ink-500">No times are available to book right now. Please try ASAP or check back later.</p> : days && (<>
            <div><div className="mb-1 text-xs font-semibold text-ink-500">Date</div><div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{days.map((x) => (
              <button type="button" key={x.date} onClick={() => { setDate(x.date); onChange({ when: 'later', start: '', label: '' }); }} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${date === x.date ? 'border-brand-500 bg-brand-500 text-white' : 'border-ink-300 bg-white'}`}>{dayLabel(x.date)}</button>))}</div></div>
            <div><div className="mb-1 text-xs font-semibold text-ink-500">Time</div>
              {!slots ? <p className="text-xs text-ink-500">Loading…</p> : slots.filter((s) => s.available).length === 0 ? <p className="text-xs text-ink-500">No free times on this day. Try another date.</p> : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{slots.filter((s) => s.available || s.reason === 'full').map((s) => (
                  <button type="button" key={s.start} disabled={!s.available} onClick={() => onChange({ when: 'later', start: s.start, label: slotLabel(date, s.time) })}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold ${value.start === s.start ? 'border-brand-500 bg-brand-500 text-white' : s.available ? 'border-ink-300 bg-white' : 'border-transparent bg-black/5 text-ink-300 line-through'}`}>{t12(s.time)}{!s.available && <span className="block text-[9px] no-underline">Full</span>}</button>))}</div>)}</div>
            {value.label && <p className="text-sm font-semibold text-brand-700">✓ Scheduled for {value.label}</p>}
          </>)}
        </div>)}
    </div>
  );
}
