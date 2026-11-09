import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, naira } from '../../lib/api';
import { Alert, Badge, Spinner } from '../../components/ui';
import { useDash } from '../../components/DashboardLayout';

const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Custom range']];
const ST = { earned: ['green', 'Completed'], held: ['amber', 'Pending'], reversed: ['red', 'Reversed'] };
const fmt = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Stat({ label, value, sub, tone = '' }) {
  return <div className={`card p-4 ${tone}`}><div className="text-xs text-ink-500">{label}</div><div className="mt-1 font-display text-xl font-bold">{value}</div>{sub && <div className="mt-0.5 text-[11px] text-ink-500">{sub}</div>}</div>;
}

export default function Earnings() {
  const { data, branches } = useDash();
  const [sp, setSp] = useSearchParams();
  const [range, setRange] = useState('30d'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [branch, setBranch] = useState(sp.get('branch') || ''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1);
  const [sum, setSum] = useState(null); const [tx, setTx] = useState(null); const [err, setErr] = useState('');

  const qs = (extra = {}) => new URLSearchParams({ range, ...(range === 'custom' ? { from, to } : {}), ...(branch ? { branch } : {}), ...extra }).toString();
  useEffect(() => {
    if (range === 'custom' && (!from || !to)) return;
    let stop = false; setErr(''); setSum(null);
    api.get(`/earnings?${qs()}`).then((d) => !stop && setSum(d)).catch((e) => !stop && setErr(e.message));
    return () => { stop = true; };
  }, [range, from, to, branch]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (range === 'custom' && (!from || !to)) return;
    let stop = false; setTx(null);
    api.get(`/earnings/transactions?${qs({ page, ...(status ? { status } : {}) })}`).then((d) => !stop && setTx(d)).catch(() => !stop && setTx({ rows: [], total: 0, pages: 0 }));
    return () => { stop = true; };
  }, [range, from, to, branch, status, page]); // eslint-disable-line react-hooks/exhaustive-deps
  const changeBranch = (v) => { setBranch(v); setPage(1); setSp(v ? { branch: v } : {}); };
  const isFree = sum?.plan === 'free';
  const showBranches = data?.isBusiness && (branches.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div><h1 className="font-display text-2xl font-bold">Earnings</h1><p className="text-sm text-ink-500">Calculated from your completed orders' payment records, not from what is shown on screen.</p></div>

      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap gap-1.5">{RANGES.map(([k, l]) => <button key={k} onClick={() => { setRange(k); setPage(1); }} className={`rounded-full border px-3 py-1 text-xs font-semibold ${range === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-300 hover:border-brand-500'}`}>{l}</button>)}</div>
        <div className="flex flex-wrap items-end gap-3">
          {range === 'custom' && <>
            <label className="text-xs">From<input type="date" className="input mt-1" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="text-xs">To<input type="date" className="input mt-1" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} /></label></>}
          {showBranches && <label className="text-xs">Branch
            <select className="input mt-1" value={branch} onChange={(e) => changeBranch(e.target.value)}>
              <option value="">{data.access?.isOwner || data.access?.allBranches ? 'All branches (whole business)' : 'All my branches'}</option>
              {(data.access?.isOwner || data.access?.allBranches) && <option value="main">Main (orders with no branch)</option>}
              {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select></label>}
        </div>
        {range === 'custom' && (!from || !to) && <p className="text-xs text-ink-500">Pick a start and end date.</p>}
      </div>

      {err && <Alert>{err}</Alert>}
      {!sum && !err ? <Spinner /> : sum && (<>
        <div className={`card p-6 ${isFree ? 'bg-night text-white' : 'bg-brand-50'}`}>
          <div className={`text-sm ${isFree ? 'text-white/70' : 'text-ink-500'}`}>{isFree ? 'Total Earnings After Ordarly Commission' : 'Total net earnings'}</div>
          <div className="mt-1 font-display text-4xl font-bold">{naira(sum.totalEarningsAfterCommission)}</div>
          <p className={`mt-2 text-xs ${isFree ? 'text-white/60' : 'text-ink-500'}`}>
            {isFree ? `Meal sales − ${sum.commissionPct}% Ordarly commission (on meals only) + delivery fees. Delivery fees never attract commission.` : 'Meal sales + delivery fees, with no Ordarly commission on your plan.'} Shown before any separate payment-gateway charges.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Total meal sales" value={naira(sum.mealSales)} />
          <Stat label="Delivery fees collected" value={naira(sum.deliveryFees)} sub="Yours in full" />
          <Stat label="Ordarly commission" value={naira(sum.commission)} sub={isFree ? `${sum.commissionPct}% of meal sales` : 'No commission on your plan'} />
          <Stat label="Payment gateway charges" value={sum.gatewayFees ? naira(sum.gatewayFees) : 'Not reported'} sub={sum.gatewayFees ? `Net after gateway: ${naira(sum.netAfterGatewayFees)}` : 'Shown when Paystack reports them'} />
          <Stat label="Refunds" value={naira(sum.refunds)} />
          <Stat label="Net earnings" value={naira(sum.netEarnings)} />
          <Stat label="Completed orders" value={sum.completedOrders.toLocaleString('en-NG')} />
          <Stat label="Pending settlement" value={naira(sum.pendingSettlement.net)} sub={`${sum.pendingSettlement.orders} paid order(s) not yet completed`} />
        </div>
        {sum.commissionToReturn > 0 && <Alert kind="info">Ordarly received {naira(sum.commissionToReturn)} in commission on orders that were later cancelled or refunded. It is owed back to you and Ordarly will return it.</Alert>}

        {showBranches && sum.byBranch.length > 0 && (
          <div className="card overflow-x-auto p-4">
            <h3 className="mb-2 font-bold">By branch</h3>
            <table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs text-ink-500"><tr><th className="py-1">Branch</th><th>Orders</th><th>Meal sales</th><th>Delivery</th><th>Commission</th><th>Net</th></tr></thead>
              <tbody>{sum.byBranch.map((b) => <tr key={String(b.branch)} className="border-t border-black/5"><td className="py-2 font-semibold">{b.branchName}</td><td>{b.orders}</td><td>{naira(b.mealSales)}</td><td>{naira(b.deliveryFees)}</td><td>{naira(b.commission)}</td><td className="font-bold">{naira(b.netEarnings)}</td></tr>)}</tbody></table>
          </div>)}
      </>)}

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Transaction history</h3>
          <select className="input !w-auto !py-1 text-xs" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="earned">Completed</option><option value="held">Pending</option><option value="reversed">Reversed</option></select></div>
        {!tx ? <Spinner /> : tx.rows.length === 0 ? <p className="py-6 text-center text-sm text-ink-500">No transactions in this period.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-ink-500"><tr><th className="py-1">Order</th><th>Date</th>{showBranches && <th>Branch</th>}<th>Meals</th><th>Delivery</th><th>Commission</th><th>Net</th><th>Status</th></tr></thead>
            <tbody>{tx.rows.map((e) => (
              <tr key={e.id} className="border-t border-black/5"><td className="py-2 font-semibold">{e.orderRef}{e.legacy && <span className="ml-1 text-[10px] text-ink-500">(earlier)</span>}</td><td className="text-xs text-ink-500">{fmt(e.date)}</td>
                {showBranches && <td className="text-xs">{e.branch || '—'}</td>}
                <td>{naira(e.mealSubtotal)}</td><td>{naira(e.deliveryFee)}</td><td>{e.commission ? naira(e.commission) : '—'}</td><td className="font-bold">{naira(e.net)}</td>
                <td><Badge color={ST[e.status][0]}>{ST[e.status][1]}</Badge>{e.refunded > 0 && <div className="text-[10px] text-red-600">refunded {naira(e.refunded)}</div>}</td></tr>))}</tbody></table></div>)}
        {tx && tx.pages > 1 && <div className="mt-3 flex items-center justify-between text-sm"><button className="btn-ghost !py-1" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Previous</button><span className="text-xs text-ink-500">Page {tx.page} of {tx.pages}</span><button className="btn-ghost !py-1" disabled={page >= tx.pages} onClick={() => setPage(page + 1)}>Next →</button></div>}
      </div>
    </div>
  );
}
