import { useState } from 'react';
import { upload } from '../lib/api';

// Upload to Cloudinary through the API, or paste a URL. Falls back gracefully when uploads aren't configured.
export default function ImageField({ value, onChange, label = 'Image' }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setErr('Image must be under 5 MB.');
    setBusy(true); setErr('');
    try { onChange((await upload('/uploads/image', f, 'image')).url); } catch (x) { setErr(x.message); } finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-mint-100">{value && <img src={value} alt="" className="h-full w-full object-cover" />}</div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} disabled={busy} className="block w-full text-xs" />
          <input className="input !py-1.5 !text-xs" type="url" placeholder="…or paste an image URL" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
      {busy && <div className="mt-1 text-xs text-ink-500">Uploading…</div>}
      {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
    </div>
  );
}
