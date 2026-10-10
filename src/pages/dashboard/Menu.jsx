import { useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert, Spinner, Field } from '../../components/ui';
import ImageField from '../../components/ImageField';

const blank = { name: '', description: '', price: '', image: '', category: '', available: true };

export default function Menu() {
  const [d, setD] = useState(null); const [form, setForm] = useState(null); const [err, setErr] = useState('');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [newCat, setNewCat] = useState('');
  const load = () => api.get('/menu').then(setD);
  useEffect(() => { load(); }, []);
  if (!d) return <Spinner />;
  const { max, active } = d.limit;
  const catName = (id) => d.categories.find((c) => c._id === id)?.name || 'Uncategorised';
  const shown = d.meals.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) && (!cat || m.category === cat));

  const save = async (e) => {
    e.preventDefault(); setErr('');
    const body = { ...form, price: Number(form.price), category: form.category || null, image: form.image || '' };
    try { form._id ? await api.patch(`/menu/meals/${form._id}`, body) : await api.post('/menu/meals', body); setForm(null); load(); }
    catch (e2) { setErr(e2.message); }
  };
  const toggle = async (m) => { setErr(''); try { await api.patch(`/menu/meals/${m._id}`, { available: !m.available }); load(); } catch (e2) { setErr(e2.message); } };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="chip !px-4 !py-2">{max === null ? `${active} active meals · Unlimited` : `${active} / ${max} active meals`}</div>
        <button className="btn-accent" onClick={() => { setErr(''); setForm(blank); }}>+ Add meal</button>
      </div>
      {max !== null && active > max && <Alert kind="info">You have more active meals than the Free limit. Existing meals are kept, but you can't activate more until you disable some or upgrade.</Alert>}
      {err && !form && <Alert>{err}</Alert>}

      <div className="card p-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCat('')} className={`chip ${!cat && '!border-brand-500 !bg-brand-50 !text-brand-700'}`}>All</button>
          {d.categories.map((c) => (
            <span key={c._id} className={`chip gap-2 ${cat === c._id && '!border-brand-500 !bg-brand-50 !text-brand-700'}`}>
              <button onClick={() => setCat(c._id)}>{c.name}</button>
              <button title="Rename" onClick={async () => { const n = prompt('Rename category', c.name); if (n) { await api.patch(`/menu/categories/${c._id}`, { name: n }); load(); } }}>✎</button>
              <button title="Delete" onClick={async () => { if (confirm(`Delete "${c.name}"? Meals will become uncategorised.`)) { await api.del(`/menu/categories/${c._id}`); load(); } }}>×</button>
            </span>
          ))}
          <form onSubmit={async (e) => { e.preventDefault(); if (!newCat.trim()) return; await api.post('/menu/categories', { name: newCat }); setNewCat(''); load(); }} className="flex gap-1">
            <input className="input !w-36 !py-1 !text-xs" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} /><button className="chip">Add</button>
          </form>
        </div>
        <input className="input mt-3" placeholder="Search meals" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {shown.length === 0 ? <div className="card p-10 text-center text-sm text-ink-500">No meals yet. Add your first meal to get started.</div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((m) => (
            <div key={m._id} className={`card overflow-hidden ${!m.available && 'opacity-60'}`}>
              <div className="h-36 bg-mint-100">{m.image && <img src={m.image} alt={m.name} className="h-full w-full object-cover" loading="lazy" />}</div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><b>{m.name}</b><b className="text-brand-600">{naira(m.price)}</b></div>
                <div className="text-xs text-ink-500">{catName(m.category)}</div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">{m.description}</p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => { setErr(''); setForm({ ...m, price: String(m.price), category: m.category || '' }); }}>Edit</button>
                  <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => toggle(m)}>{m.available ? 'Disable' : 'Enable'}</button>
                  <button className="btn-ghost !px-3 !py-1.5 !text-xs !text-red-600" onClick={async () => { if (confirm('Delete this meal? Past orders keep their details.')) { await api.del(`/menu/meals/${m._id}`); load(); } }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6" onClick={() => setForm(null)}>
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl">
            <div className="font-display text-xl font-bold">{form._id ? 'Edit meal' : 'Add meal'}</div>
            <Alert>{err}</Alert>
            <Field label="Name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Description"><textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (₦)"><input className="input" type="number" min="0" step="1" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
              <Field label="Category"><select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">None</option>{d.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
            </div>
            <ImageField label="Meal photo" value={form.image} onChange={(v) => setForm({ ...form, image: v })} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> Available for ordering</label>
            <div className="flex gap-2"><button className="btn-primary flex-1">Save</button><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
