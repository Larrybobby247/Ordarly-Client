import { Link } from 'react-router-dom';

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-white">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 12h16M12 4v16" /><circle cx="12" cy="12" r="9" /></svg>
      </span>
      <span className={light ? 'text-white' : 'text-ink-900'}>Orderly</span>
    </Link>
  );
}

export const Spinner = () => <div className="mx-auto my-10 h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />;

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
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
