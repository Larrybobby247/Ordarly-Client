import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Alert, Badge } from '../../components/ui';

// Loads the proof image through the authenticated API (no public URL) as a blob.
export default function ProofReview({ order, onDone }) {
  const [info, setInfo] = useState(null); const [img, setImg] = useState(null); const [notes, setNotes] = useState('');
  const [confirm, setConfirm] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let url; setImg(null); setInfo(null);
    api.get(`/orders/${order._id}/proof-info`).then(async (r) => {
      setInfo(r.proof);
      if (r.proof) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/orders/${order._id}/proof`, { credentials: 'include' });
        if (res.ok) { url = URL.createObjectURL(await res.blob()); setImg(url); }
      }
    }).catch(() => {});
    return () => url && URL.revokeObjectURL(url);
  }, [order._id, order.paymentStatus]);

  if (!info) return <div className="mt-4 rounded-2xl bg-mint-50 p-4 text-sm text-ink-500">No payment proof uploaded yet. The order is unpaid.</div>;
  const decide = async (decision) => {
    setBusy(true); setErr('');
    try { onDone(await api.post(`/orders/${order._id}/proof/review`, { decision, notes: notes || undefined, confirmReceived: decision === 'accept' ? confirm : undefined })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="mt-4 space-y-3 rounded-2xl border border-black/10 p-4">
      <div className="flex items-center justify-between"><b className="text-sm">Payment proof</b><Badge color={info.status === 'accepted' ? 'green' : info.status === 'rejected' ? 'red' : 'amber'}>{info.status}</Badge></div>
      {img ? <img src={img} alt="Payment proof" className="max-h-72 w-full rounded-xl object-contain bg-mint-50" /> : <div className="text-xs text-ink-500">Loading image…</div>}
      {order.paymentStatus === 'awaiting_verification' && info.status === 'pending' && (<>
        <Alert kind="info">A screenshot can be faked or edited. Open your bank app or statement and confirm the money arrived before accepting.</Alert>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />I checked my bank records and received this amount.</label>
        <input className="input" placeholder="Note to customer (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        {err && <Alert>{err}</Alert>}
        <div className="flex gap-2"><button className="btn-primary" disabled={busy || !confirm} onClick={() => decide('accept')}>Accept & mark paid</button><button className="btn-ghost !text-red-600" disabled={busy} onClick={() => decide('reject')}>Reject</button></div>
      </>)}
      {info.reviewNotes && <div className="text-xs text-ink-500">Note: {info.reviewNotes}</div>}
    </div>
  );
}
