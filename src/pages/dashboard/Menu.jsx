import { useEffect, useState } from 'react';
import { api, naira } from '../../lib/api';
import { Alert, Spinner, Field } from '../../components/ui';
import ImageField from '../../components/ImageField';
import TagInput from '../../components/TagInput';

const TAG_SUGGESTIONS = ['Spicy', 'Vegetarian', 'Halal', 'Contains nuts', 'Gluten-free', 'Contains egg'];
const GROUPS = ['Extra protein', 'Drinks', 'Sides', 'Extras'];
const QUICK_ADDONS = [
  ['Extra protein', 'Extra turkey'], ['Extra protein', 'Extra beef'], ['Extra protein', 'Extra chicken'],
  ['Drinks', 'Bottled water'], ['Drinks', 'Soft drink'], ['Sides', 'Fried plantain'], ['Sides', 'Coleslaw'],
];
const blank = { name: '', description: '', price: '', image: '', category: '', available: true, portion: '', prepTime: '', tags: [], popular: false, addons: [] };

const fromMeal = (m) => ({
  ...blank, ...m, price: String(m.price), category: m.category || '', prepTime: m.prepTime ?? '', portion: m.portion || '',
  tags: m.tags || [], popular: !!m.popular, image: m.image || '',
  addons: (m.addons || []).map((a) => ({ ...a, price: String(a.price), group: a.group || 'Extras' })),
});

export default function Menu() {
  const [d, setD] = useState(null); const [form, setForm] = useState(null); const [err, setErr] = useState('');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [newCat, setNewCat] = useState('');
  const [modalCat, setModalCat] = useState(null); // null = closed, string = text of the inline "new category" box
  const load = () => api.get('/menu').then(setD);
  useEffect(() => { load(); }, []);
  if (!d) return <Spinner />;

  const { max, active } = d.limit;
  const catName = (id) => d.categories.find((c) => c._id === id)?.name || 'Uncategorised';
  const shown = d.meals.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) && (!cat || m.category === cat));
  const setF = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setAddon = (i, patch) => setF({ addons: form.addons.map((a, k) => (k === i ? { ...a, ...patch } : a)) });
  const mealsWithAddons = d.meals.filter((m) => m.addons?.length && m._id !== form?._id);

  const createCategory = async () => {
    const name = (modalCat || '').trim(); if (!name) return;
    setErr('');
    try {
      const c = await api.post('/menu/categories', { name });
      await load(); setF({ category: c._id }); setModalCat(null); // new category is selected straight away
    } catch (e) { setErr(e.message); }
  };

  const save = async (e) => {
    e.preventDefault(); setErr('');
    if (form.price === '' || Number(form.price) < 0) return setErr('Enter the meal price.');
    if (form.addons.some((a) => a.name.trim() && (a.price === '' || Number(a.price) < 0))) return setErr('Give every add-on a price (use 0 if it is free).');
    const body = {
      name: form.name.trim(), description: form.description, price: Number(form.price), image: form.image || '',
      category: form.category || null, available: form.available, portion: form.portion,
      prepTime: form.prepTime === '' ? null : Number(form.prepTime), tags: form.tags, popular: form.popular,
      addons: form.addons.filter((a) => a.name.trim()).map((a) => ({
        ...(a._id ? { _id: a._id } : {}), name: a.name.trim(), price: Number(a.price) || 0,
        group: (a.group || 'Extras').trim() || 'Extras', available: a.available !== false,
      })),
    };
    try { form._id ? await api.patch(`/menu/meals/${form._id}`, body) : await api.post('/menu/meals', body); setForm(null); load(); }
    catch (e2) { setErr(e2.message); }
  };
  const toggle = async (m) => { setErr(''); try { await api.patch(`/menu/meals/${m._id}`, { available: !m.available }); load(); } catch (e2) { setErr(e2.message); } };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="chip !px-4 !py-2">{max === null ? `${active} active meals · Unlimited` : `${active} / ${max} active meals`}</div>
        <button className="btn-accent" onClick={() => { setErr(''); setModalCat(null); setForm(blank); }}>+ Add meal</button>
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
              <div className="relative h-36 bg-mint-100">
                {m.image && <img src={m.image} alt={m.name} className="h-full w-full object-cover" loading="lazy" />}
                {m.popular && <span className="absolute left-3 top-3 rounded-full bg-tomato-500 px-2.5 py-1 text-[11px] font-bold text-white">★ Popular</span>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2"><b>{m.name}</b><b className="text-brand-600">{naira(m.price)}</b></div>
                <div className="text-xs text-ink-500">{catName(m.category)}{m.portion && ` · ${m.portion}`}{m.prepTime ? ` · ${m.prepTime} min` : ''}</div>
                <p className="mt-1 line-clamp-2 text-xs text-ink-500">{m.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {(m.tags || []).slice(0, 3).map((t) => <span key={t} className="chip !px-2 !py-0.5 !text-[10px]">{t}</span>)}
                  {m.addons?.length > 0 && <span className="chip !border-brand-500/40 !bg-brand-50 !px-2 !py-0.5 !text-[10px] !text-brand-700">{m.addons.length} add-on{m.addons.length > 1 && 's'}</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => { setErr(''); setModalCat(null); setForm(fromMeal(m)); }}>Edit</button>
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
          <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[94vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl">
            <div className="flex items-center justify-between"><div className="font-display text-xl font-bold">{form._id ? 'Edit meal' : 'Add meal'}</div><button type="button" onClick={() => setForm(null)} className="text-2xl leading-none" aria-label="Close">×</button></div>
            <Alert>{err}</Alert>

            {/* Basics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Meal name"><input className="input" required maxLength={120} value={form.name} onChange={(e) => setF({ name: e.target.value })} placeholder="e.g. Jollof rice & chicken" /></Field>
              <Field label="Price (₦)"><input className="input" type="number" min="0" step="1" required value={form.price} onChange={(e) => setF({ price: e.target.value })} /></Field>
            </div>

            <div>
              <span className="label">Category</span>
              <div className="flex flex-wrap items-center gap-2">
                <select className="input !w-auto min-w-[12rem] flex-1" value={form.category} onChange={(e) => setF({ category: e.target.value })}>
                  <option value="">No category</option>{d.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
                {modalCat === null && <button type="button" className="btn-ghost !py-2" onClick={() => setModalCat('')}>+ New category</button>}
              </div>
              {modalCat !== null && (
                <div className="mt-2 flex gap-2">
                  <input autoFocus className="input" maxLength={60} placeholder="New category name, e.g. Rice dishes" value={modalCat} onChange={(e) => setModalCat(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory(); } }} />
                  <button type="button" className="btn-primary" onClick={createCategory}>Create</button>
                  <button type="button" className="btn-ghost" onClick={() => setModalCat(null)}>Cancel</button>
                </div>
              )}
            </div>

            <Field label="Description"><textarea rows={2} className="input" maxLength={600} value={form.description} onChange={(e) => setF({ description: e.target.value })} placeholder="What's in it? How is it served?" /></Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Portion size (optional)" hint="e.g. 1 plate, serves 2"><input className="input" maxLength={60} value={form.portion} onChange={(e) => setF({ portion: e.target.value })} /></Field>
              <Field label="Preparation time (minutes, optional)"><input className="input" type="number" min="0" max="600" value={form.prepTime} onChange={(e) => setF({ prepTime: e.target.value })} /></Field>
            </div>

            <div>
              <span className="label">Labels (optional)</span>
              <TagInput value={form.tags} onChange={(tags) => setF({ tags })} placeholder="Add a label and press Enter" suggestions={TAG_SUGGESTIONS} max={8}
                normalize={(s) => s.trim().slice(0, 24)} chipClass="bg-amber-50 text-amber-800" />
            </div>

            <ImageField label="Meal photo" value={form.image} onChange={(v) => setF({ image: v })} />

            {/* Add-ons */}
            <div className="rounded-3xl border border-black/10 bg-mint-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="font-bold">Add-ons customers can choose</div><p className="text-xs text-ink-500">Suggest extras with this meal, like extra turkey, beef or a drink. Each has its own price (no photo needed).</p></div>
                {mealsWithAddons.length > 0 && (
                  <select className="input !w-auto !py-1.5 !text-xs" value="" onChange={(e) => {
                    const src = d.meals.find((m) => m._id === e.target.value); if (!src) return;
                    setF({ addons: [...form.addons, ...src.addons.map((a) => ({ name: a.name, group: a.group || 'Extras', price: String(a.price), available: true }))] });
                  }}>
                    <option value="">Copy add-ons from…</option>{mealsWithAddons.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                  </select>
                )}
              </div>

              <datalist id="addon-groups">{GROUPS.map((g) => <option key={g} value={g} />)}</datalist>
              <div className="mt-3 space-y-2">
                {form.addons.map((a, i) => (
                  <div key={a._id || i} className="grid grid-cols-12 items-center gap-2 rounded-2xl bg-white p-2">
                    <input className="input col-span-12 !py-1.5 !text-xs sm:col-span-3" list="addon-groups" placeholder="Group" maxLength={40} value={a.group} onChange={(e) => setAddon(i, { group: e.target.value })} aria-label="Add-on group" />
                    <input className="input col-span-12 !py-1.5 sm:col-span-4" placeholder="Name, e.g. Extra turkey" maxLength={80} value={a.name} onChange={(e) => setAddon(i, { name: e.target.value })} aria-label="Add-on name" />
                    <div className="col-span-6 flex items-center gap-1 sm:col-span-2"><span className="text-sm">₦</span><input className="input !py-1.5" type="number" min="0" step="50" placeholder="Price" value={a.price} onChange={(e) => setAddon(i, { price: e.target.value })} aria-label="Add-on price" /></div>
                    <label className="col-span-4 flex items-center gap-1 text-xs sm:col-span-2"><input type="checkbox" checked={a.available !== false} onChange={(e) => setAddon(i, { available: e.target.checked })} />Available</label>
                    <button type="button" className="col-span-2 text-lg text-red-600 sm:col-span-1" aria-label="Remove add-on" onClick={() => setF({ addons: form.addons.filter((_, k) => k !== i) })}>×</button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button type="button" className="btn-ghost !py-1.5 !text-xs" onClick={() => setF({ addons: [...form.addons, { name: '', price: '', group: 'Extras', available: true }] })}>+ Add an add-on</button>
                <span className="text-[11px] text-ink-500">Quick add:</span>
                {QUICK_ADDONS.filter(([, n]) => !form.addons.some((a) => a.name === n)).map(([g, n]) => (
                  <button type="button" key={n} className="rounded-full border border-dashed border-ink-300 px-2.5 py-0.5 text-[11px] hover:border-brand-500" onClick={() => setF({ addons: [...form.addons, { name: n, price: '', group: g, available: true }] })}>+ {n}</button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.available} onChange={(e) => setF({ available: e.target.checked })} /> Available for ordering</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.popular} onChange={(e) => setF({ popular: e.target.checked })} /> Mark as popular ★</label>
            </div>
            <div className="flex gap-2"><button className="btn-primary flex-1">Save meal</button><button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
