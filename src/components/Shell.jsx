import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

// App frame shared by the restaurant and admin dashboards.
// The frame is exactly one screen tall: sidebar and top bar never move, only the page content scrolls.
// On phones the sidebar is a drawer: it has a close button, closes when you tap outside it, press Esc, or pick a page.
export default function Shell({ nav, badges = {}, brand, sidebarExtra, topLeft, topRight, banners, children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f8f4]">
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside aria-label="Main navigation" className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col border-r border-black/5 bg-white transition-transform duration-200 md:static md:max-w-none md:translate-x-0 ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="flex shrink-0 items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">{brand}</div>
          <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-mint-100 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {nav.map(([to, label, d, end, key]) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm font-semibold transition ${isActive ? 'border-tomato-500/40 bg-tomato-50 text-tomato-600' : 'border-transparent text-ink-700 hover:bg-mint-100'}`}>
              <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {key && badges[key] > 0 && <span className="rounded-full bg-tomato-500 px-2 py-0.5 text-[10px] font-bold text-white">{badges[key]}</span>}
            </NavLink>
          ))}
        </nav>
        {sidebarExtra && <div className="shrink-0 p-4 pt-0">{sidebarExtra}</div>}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-mint-100 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className="min-w-0">{topLeft}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">{topRight}</div>
        </header>
        {banners}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">{children || <Outlet />}</main>
      </div>
    </div>
  );
}
