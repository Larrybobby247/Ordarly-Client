import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function Logo({ light = false }) {
  const navigate = useNavigate();
  // Signed in -> your dashboard (admins go to /admin). Signed out -> the homepage.
  const go = async (e) => {
    e.preventDefault();
    try { const d = await api.get('/auth/me'); navigate(d.user.role === 'admin' ? '/admin' : '/dashboard'); }
    catch { navigate('/'); }
  };
  return (
    <a href="/" onClick={go} className="flex items-center gap-2 text-lg font-extrabold">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12h16M12 4v16" /><circle cx="12" cy="12" r="9" /></svg>
      </span>
      <span className={light ? 'text-white' : 'text-ink-900'}>Ordarly</span>
    </a>
  );
}

export const Spinner = () => <div className="mx-auto my-10 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />;

// PERF/UX (new): skeleton placeholders. They reserve the same space the real content will take, so the page doesn't jump
// (no layout shift) and feels faster than a lone spinner.
export const Skeleton = ({ className = 'h-4 w-full' }) => <div className={`animate-pulse rounded-xl bg-black/5 ${className}`} aria-hidden="true" />;
export const CardSkeleton = ({ lines = 2 }) => (
  <div className="card space-y-3 p-5" aria-hidden="true"><Skeleton className="h-8 w-8" /><Skeleton className="h-7 w-20" />{Array.from({ length: lines - 1 }).map((_, i) => <Skeleton key={i} className="h-3 w-24" />)}</div>
);
export const ListSkeleton = ({ rows = 5 }) => (
  <div className="card divide-y divide-black/5" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => <div key={i} className="flex items-center justify-between gap-3 p-4"><div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div><Skeleton className="h-6 w-20" /></div>)}
  </div>
);
export const PageSkeleton = () => (
  <div className="space-y-4" role="status" aria-label="Loading page"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div><ListSkeleton rows={4} /></div>
);
// A failed section with a retry button, so one failing request never leaves a blank or stuck page.
export const RetryError = ({ message, onRetry }) => (
  <div className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span className="text-red-700">{message || 'Something went wrong.'}</span>{onRetry && <button className="btn-ghost !py-1.5" onClick={onRetry}>Try again</button>}</div>
);

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  );
}

export function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? 'text' : 'password'} className={`input pr-11 ${className}`} />
      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}
        className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-500 hover:text-ink-900">
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  const c = { error: 'bg-red-50 text-red-700 border-red-100', ok: 'bg-brand-50 text-brand-700 border-brand-100', info: 'bg-amber-50 text-amber-800 border-amber-100' }[kind];
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}

const badgeColors = {
  green: 'bg-brand-50 text-brand-700', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-sky-50 text-sky-700', gray: 'bg-slate-100 text-slate-600',
};
export const Badge = ({ color = 'gray', children }) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeColors[color]}`}>{children}</span>
);
export const statusColor = (s) => ({ awaiting_whatsapp: 'amber', pending: 'amber', accepted: 'blue', preparing: 'blue', ready: 'green', out_for_delivery: 'blue', completed: 'green', cancelled: 'red' }[s] || 'gray');
export const payColor = (s) => ({ paid: 'green', paid_manual: 'green', unpaid_pod: 'amber', awaiting_payment: 'amber', awaiting_verification: 'amber', failed: 'red', rejected: 'red' }[s] || 'gray');

export function ProLock({ title, children }) {
  return (
    <div className="card p-6 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-tomato-50 text-tomato-500">★</div>
      <h3 className="font-bold">{title} is a Pro feature</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{children || 'Start your free 14-day trial or subscribe to unlock this.'}</p>
      <Link to="/dashboard/subscription" className="btn-accent mt-4">See Pro options</Link>
    </div>
  );
}
