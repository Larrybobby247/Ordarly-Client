import { useState } from 'react';
import { Suspense } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo, PageSkeleton } from './ui';
import { PHONE, WHATSAPP_URL, usePlatform } from '../lib/platform';

const links = [['/how-it-works', 'How it works'], ['/pricing', 'Pricing'], ['/about', 'About'], ['/faq', 'FAQ'], ['/contact', 'Contact']];

export default function MarketingLayout() {
  const [open, setOpen] = useState(false); const { supportEmail } = usePlatform();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-mint-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
            {links.map(([to, l]) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'text-brand-600' : 'hover:text-ink-900')}>{l}</NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary">Start free</Link>
          </div>
          <button className="md:hidden" aria-label="Menu" onClick={() => setOpen(!open)}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          </button>
        </div>
        {open && (
          <div className="space-y-1 border-t border-black/5 px-5 pb-4 md:hidden">
            {links.map(([to, l]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium">{l}</Link>)}
            <div className="flex gap-2 pt-2"><Link to="/login" className="btn-ghost flex-1">Sign in</Link><Link to="/register" className="btn-primary flex-1">Start free</Link></div>
          </div>
        )}
      </header>
      {/* PERF (new): header/footer stay while the page's file loads */}
      <Suspense fallback={<div className="mx-auto max-w-5xl p-6"><PageSkeleton /></div>}><Outlet /></Suspense>
      <footer className="mt-24 bg-night text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm text-white/60">Online ordering pages for Nigerian restaurants. Take orders on WhatsApp for free, or go Pro for checkout, delivery and verified payments.</p>
            <ul className="mt-4 space-y-1 text-sm text-white/70">
              <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp: {PHONE}</a></li><li><a href={`tel:${PHONE}`}>Phone: {PHONE}</a></li><li><a href={`mailto:${supportEmail}`}>Email: {supportEmail}</a></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-semibold">Product</div>
            <ul className="space-y-2 text-white/60">
              <li><Link to="/how-it-works">How it works</Link></li><li><Link to="/pricing">Pricing</Link></li><li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div className="text-sm">
            <div className="mb-3 font-semibold">Company</div>
            <ul className="space-y-2 text-white/60">
              <li><Link to="/about">About</Link></li><li><Link to="/contact">Contact</Link></li><li><Link to="/terms">Terms &amp; Conditions</Link></li><li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-white/40">© {new Date().getFullYear()} Ordarly. All rights reserved.</div>
      </footer>
    </div>
  );
}
