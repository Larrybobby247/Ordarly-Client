import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { ListSkeleton, RetryError } from './ui';

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const pretty = (s) => String(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Paged, filtered list loader. `filters` is a plain object; empty values are dropped from the query string.
export function useList(path, filters = {}, page = 1) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const qs = new URLSearchParams({ page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null)) }).toString();
  // PERF/correctness (changed): each new search/filter/page cancels the previous request, and a late reply from an older request
  // can never overwrite newer results (this used to be possible when typing quickly in a search box).
  const ctl = useRef(null);
  const load = useCallback(() => {
    ctl.current?.abort(); const c = new AbortController(); ctl.current = c;
    setState((s) => ({ ...s, loading: true, error: '' }));
    return api.get(`${path}?${qs}`, { signal: c.signal })
      .then((data) => { if (!c.signal.aborted) setState({ loading: false, error: '', data }); })
      .catch((e) => { if (!c.signal.aborted && !e.cancelled) setState({ loading: false, error: e.message, data: null }); });
  }, [path, qs]);
  useEffect(() => () => ctl.current?.abort(), []); // leaving the page cancels any request still running
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export function Pager({ page, pages, total, onPage }) {
  if (!total) return null;
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-3 text-xs text-ink-500">
      <span>{total.toLocaleString()} result{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
        <span>Page {page} of {Math.max(1, pages)}</span>
        <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-6" onClick={onClose}>
      <div role="dialog" aria-label={title} className={`max-h-[90vh] w-full overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl ${wide ? 'max-w-2xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-bold">{title}</h2><button onClick={onClose} className="text-2xl leading-none" aria-label="Close">×</button></div>
        {children}
      </div>
    </div>
  );
}

export const PageHead = ({ title, sub, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="font-display text-2xl font-bold">{title}</h1>{sub && <p className="text-sm text-ink-500">{sub}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
);

// A row of filter controls. fields: [{key, label, type: 'search'|'select'|'date', options: [[value,label]]}]
export function Filters({ fields, values, onChange }) {
  return (
    <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
      {fields.map((f) => (
        <label key={f.key} className={f.type === 'search' ? 'min-w-[14rem] flex-1' : ''}>
          <span className="label">{f.label}</span>
          {f.type === 'select' ? (
            <select className="input !w-auto min-w-[9rem] !py-2" value={values[f.key] || ''} onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}>
              <option value="">All</option>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ) : (
            <input className="input !py-2" type={f.type === 'date' ? 'date' : 'search'} placeholder={f.placeholder} value={values[f.key] || ''} onChange={(e) => onChange({ ...values, [f.key]: e.target.value })} />
          )}
        </label>
      ))}
      <button className="btn-ghost !py-2" onClick={() => onChange(Object.fromEntries(fields.map((f) => [f.key, ''])))}>Clear</button>
    </div>
  );
}

// Table wrapper with loading / error / empty states. columns: [{head, cell: (row) => node, className}]
export function DataTable({ state, columns, onRow, empty = 'Nothing found.' }) {
  const { loading, error, data } = state;
  // UX (changed): skeleton rows while loading and a Try again button on failure (was a spinner / plain error text).
  if (error) return <RetryError message={error} onRetry={state.reload} />;
  if (!data) return loading ? <ListSkeleton /> : null;
  return (
    <div className={`card overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead><tr className="border-b border-black/5 text-xs text-ink-500">{columns.map((c) => <th key={c.head} className="px-4 py-3 font-semibold">{c.head}</th>)}</tr></thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row._id} onClick={onRow ? () => onRow(row) : undefined} className={`border-b border-black/5 last:border-0 ${onRow ? 'cursor-pointer hover:bg-mint-50' : ''}`}>
              {columns.map((c) => <td key={c.head} className={`px-4 py-3 align-top ${c.className || ''}`}>{c.cell(row)}</td>)}
            </tr>
          ))}
          {data.rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-ink-500">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export const KV = ({ items }) => (
  <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
    {items.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (
      <div key={k}><dt className="text-xs text-ink-500">{k}</dt><dd className="break-words font-medium">{v}</dd></div>
    ))}
  </dl>
);
