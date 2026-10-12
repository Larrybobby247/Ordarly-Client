import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Spinner } from '../../components/ui';
import { PageHead, pretty } from '../../components/adminKit';

// Chart tokens. One axis per chart, one hue per measure (fixed order: blue, orange, aqua), text always in ink.
const C = { blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', grid: '#e7e6e2', ink: '#0b0b0b', ink2: '#52514e', surface: '#fcfcfb' };
const SEQ = ['#cfe0f7', '#9dc0ef', '#6ba1e6', '#2a78d6', '#1c57a0']; // blue, light to dark: funnel stages

const shortDate = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
const niceMax = (v) => {
  if (v <= 0) return 4;
  const p = 10 ** Math.floor(Math.log10(v)); const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

/* A single-series daily line chart with hover crosshair + tooltip, keyboard-friendly table view. */
function LineChart({ title, color, data, format = (v) => v.toLocaleString(), total }) {
  const [view, setView] = useState('chart'); const [hover, setHover] = useState(null); const ref = useRef(null);
  const W = 640, H = 220, m = { t: 12, r: 12, b: 28, l: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const x = (i) => m.l + (data.length < 2 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => m.t + ih - (v / max) * ih;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(data.length / 6));
  const empty = data.every((d) => d.value === 0);

  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - m.l) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };
  const h = hover != null ? data[hover] : null;

  return (
    <figure className="card p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div><figcaption className="font-bold" style={{ color: C.ink }}>{title}</figcaption><div className="text-xs" style={{ color: C.ink2 }}>{total}</div></div>
        <button className="text-xs font-semibold underline" style={{ color: C.ink2 }} onClick={() => setView(view === 'chart' ? 'table' : 'chart')}>{view === 'chart' ? 'View as table' : 'View as chart'}</button>
      </div>
      {view === 'table' ? (
        <div className="max-h-56 overflow-y-auto text-sm"><table className="w-full"><thead><tr className="text-left text-xs" style={{ color: C.ink2 }}><th className="py-1">Date</th><th className="py-1 text-right">{title}</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.date} className="border-t border-black/5"><td className="py-1">{shortDate(d.date)}</td><td className="py-1 text-right font-medium">{format(d.value)}</td></tr>)}</tbody></table></div>
      ) : (
        <div className="relative">
          <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title} per day. ${total}`} onMouseMove={move} onMouseLeave={() => setHover(null)} onTouchMove={(e) => move(e.touches[0])}>
            {ticks.map((t) => (
              <g key={t}><line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={C.grid} strokeWidth="1" />
                <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.ink2}>{format(t)}</text></g>
            ))}
            {data.map((d, i) => (i % step === 0 || i === data.length - 1) && <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={C.ink2}>{shortDate(d.date)}</text>)}
            {!empty && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
            {h && <g><line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} stroke={C.ink2} strokeWidth="1" strokeDasharray="3 3" /><circle cx={x(hover)} cy={y(h.value)} r="5" fill={color} stroke={C.surface} strokeWidth="2" /></g>}
            {empty && <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="13" fill={C.ink2}>No activity in this period</text>}
          </svg>
          {h && (
            <div className="pointer-events-none absolute top-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs shadow-lg" style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? '-105%' : '5%'})` }}>
              <div style={{ color: C.ink2 }}>{shortDate(h.date)}</div>
              <div className="flex items-center gap-1.5 font-semibold" style={{ color: C.ink }}><span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />{format(h.value)}</div>
            </div>)}
        </div>
      )}
    </figure>
  );
}

/* Horizontal bars for one categorical measure (single series, so one hue). Values shown as text, not just length. */
function BarList({ title, rows, color = C.blue, unit = '', link, empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const sum = rows.reduce((s, r) => s + r.value, 0);
  return (
    <figure className="card p-5">
      <figcaption className="mb-3 font-bold" style={{ color: C.ink }}>{title}</figcaption>
      {rows.length === 0 ? <p className="text-sm" style={{ color: C.ink2 }}>{empty}</p> : (
        <ul className="space-y-2.5">{rows.map((r) => (
          <li key={r.label} title={`${r.label}: ${r.value.toLocaleString()}${unit}${sum ? ` (${Math.round((r.value / sum) * 100)}%)` : ''}`}>
            <div className="mb-1 flex justify-between gap-3 text-xs" style={{ color: C.ink }}><span className="truncate">{link ? link(r) : pretty(r.label)}</span><b>{r.display ?? r.value.toLocaleString()}</b></div>
            <div className="h-2.5 rounded-full" style={{ background: C.grid }}><div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} /></div>
          </li>))}</ul>)}
    </figure>
  );
}

function Funnel({ stages }) {
  const top = Math.max(1, stages[0]?.value || 1);
  return (
    <figure className="card p-5">
      <figcaption className="mb-1 font-bold" style={{ color: C.ink }}>Restaurant journey</figcaption>
      <p className="mb-3 text-xs" style={{ color: C.ink2 }}>How many restaurants reach each step. Percentages are of all registered restaurants.</p>
      <ol className="space-y-2">{stages.map((s, i) => (
        <li key={s.label} title={`${s.label}: ${s.value}`}>
          <div className="mb-1 flex justify-between gap-3 text-xs" style={{ color: C.ink }}><span>{s.label}</span><b>{s.value.toLocaleString()} <span className="font-normal" style={{ color: C.ink2 }}>({Math.round((s.value / top) * 100)}%)</span></b></div>
          <div className="h-3 rounded-lg" style={{ background: C.grid }}><div className="h-full rounded-lg" style={{ width: `${Math.max(1.5, (s.value / top) * 100)}%`, background: SEQ[Math.min(i, SEQ.length - 1)] }} /></div>
        </li>))}</ol>
    </figure>
  );
}

export default function Analytics() {
  const [days, setDays] = useState(30); const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { setD(null); setErr(''); api.get(`/admin/analytics?days=${days}`).then(setD).catch((e) => setErr(e.message)); }, [days]);
  const fulfil = useMemo(() => (d?.fulfillment || []).map((x) => ({ ...x, label: x.label })), [d]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Analytics" sub="Platform growth, orders and subscription revenue.">
        <div className="inline-flex rounded-2xl bg-white p-1 shadow-card" role="group" aria-label="Date range">
          {[7, 30, 90].map((n) => <button key={n} aria-pressed={days === n} onClick={() => setDays(n)} className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold ${days === n ? 'bg-brand-500 text-white' : 'text-ink-700'}`}>{n} days</button>)}
        </div>
      </PageHead>
      {err && <Alert>{err}</Alert>}
      {!d && !err && <Spinner />}
      {d && (<>
        <div className="grid gap-5 lg:grid-cols-2">
          <LineChart title="New restaurant sign-ups" color={C.blue} data={d.signups} total={`${d.totals.signups.toLocaleString()} in the last ${d.days} days`} />
          <LineChart title="Orders placed" color={C.orange} data={d.orders} total={`${d.totals.orders.toLocaleString()} in the last ${d.days} days`} />
          <div className="lg:col-span-2"><LineChart title="Subscription revenue" color={C.aqua} data={d.revenue} format={(v) => (v >= 1000 ? `₦${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k` : naira(v))} total={`${naira(d.totals.revenue)} in the last ${d.days} days · Pro subscriptions only`} /></div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <BarList title="Restaurants by plan" rows={d.plans} />
          <BarList title="Subscription status" rows={d.subscriptionStatus} />
          <BarList title="Order channel" rows={d.orderChannels} empty="No orders in this period." />
          <BarList title="How customers receive orders" rows={fulfil} empty="No orders in this period." />
          <div className="lg:col-span-2"><BarList title="Busiest restaurants" rows={d.topRestaurants.map((t) => ({ label: t.name, value: t.orders, display: `${t.orders} orders · ${naira(t.value)}`, id: t.id }))}
            link={(r) => <Link className="hover:underline" to={`/admin/restaurants/${r.id}`}>{r.label}</Link>} empty="No orders in this period." /></div>
        </div>
        <div className="mt-5"><Funnel stages={d.funnel} /></div>
      </>)}
    </div>
  );
}
