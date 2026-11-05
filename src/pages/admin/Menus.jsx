import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Alert, Badge, Spinner } from '../../components/ui';
import { PageHead, useDebounced } from '../../components/adminKit';
import Menu from '../dashboard/Menu';

// Admins pick a restaurant, then use the SAME menu screen the owner uses (sizes, add-ons, photos) on that restaurant's behalf.
// Every change is recorded in the audit log on the server.
function Picker({ onPick }) {
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [rows, setRows] = useState(null); const [err, setErr] = useState('');
  useEffect(() => {
    let stop = false; setErr('');
    api.get(`/admin/restaurants?size=15${dq ? `&q=${encodeURIComponent(dq)}` : ''}`).then((d) => !stop && setRows(d.rows)).catch((e) => !stop && setErr(e.message));
    return () => { stop = true; };
  }, [dq]);
  return (
    <div className="space-y-3">
      <input className="input" autoFocus placeholder="Search a restaurant by name, page link or email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search restaurants" />
      {err && <Alert>{err}</Alert>}
      {!rows && !err ? <Spinner /> : rows?.length === 0 ? <div className="card p-8 text-center text-sm text-ink-500">No restaurant matches “{dq}”.</div> : (
        <div className="card divide-y divide-black/5">
          {rows?.map((r) => (
            <button key={r._id} onClick={() => onPick(r)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left hover:bg-mint-50">
              <div><div className="font-semibold">{r.name}</div><div className="text-xs text-ink-500">/{r.slug}{r.owner && ` · ${r.owner.email}`}</div></div>
              <div className="flex gap-1.5"><Badge color={r.plan === 'pro' ? 'green' : 'gray'}>{(r.plan || 'free').toUpperCase()}</Badge>{r.status !== 'active' && <Badge color="red">Suspended</Badge>}</div>
            </button>))}
        </div>)}
    </div>
  );
}

export default function Menus() {
  const { id } = useParams(); const go = useNavigate(); const [info, setInfo] = useState(null); const [err, setErr] = useState('');
  useEffect(() => {
    setInfo(null); setErr('');
    if (id) api.get(`/admin/restaurants/${id}/menu-info`).then((d) => setInfo(d.restaurant)).catch((e) => setErr(e.message));
  }, [id]);

  if (!id) return <div className="mx-auto max-w-3xl"><PageHead title="Restaurant menus" sub="Choose a restaurant to add or edit meals on its behalf." /><Picker onPick={(r) => go(`/admin/menus/${r._id}`)} /></div>;
  if (err) return <div className="mx-auto max-w-3xl space-y-3"><Alert>{err}</Alert><Link to="/admin/menus" className="btn-ghost">Choose another restaurant</Link></div>;
  if (!info) return <Spinner />;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div><div className="text-xs text-ink-500">You are editing the menu of</div>
          <div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-xl font-bold">{info.name}</h1><Badge color={info.plan === 'pro' ? 'green' : 'gray'}>{info.plan.toUpperCase()}</Badge><span className="text-xs text-ink-500">/{info.slug}</span></div></div>
        <div className="flex gap-2"><Link to={`/admin/restaurants/${id}`} className="btn-ghost !py-1.5">Restaurant details</Link><Link to="/admin/menus" className="btn-dark !py-1.5">Change restaurant</Link></div>
      </div>
      {info.plan === 'free' && <Alert kind="info">This restaurant is on the Free plan, so the usual limit on active meals applies. Meals you add beyond it must be saved as unavailable.</Alert>}
      <Menu base={`/admin/restaurants/${id}/menu`} uploadFor={id} />
    </div>
  );
}
