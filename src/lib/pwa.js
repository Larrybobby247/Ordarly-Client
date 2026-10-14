import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export const isStandalone = () => { try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch { return false; } };
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

// The browser fires this once when the site can be installed. Keep it so our own button can trigger the prompt later.
let deferred = null; const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; listeners.forEach((f) => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; listeners.forEach((f) => f()); });
}

/** { canPrompt, ios, installed, install() } for a custom "Install" button. */
export function useInstall() {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => listeners.delete(f); }, []);
  const install = useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt(); const r = await deferred.userChoice.catch(() => null); deferred = null; tick((n) => n + 1);
    return r?.outcome === 'accepted';
  }, []);
  return { canPrompt: !!deferred, ios: isIOS(), installed: isStandalone(), install };
}

/* ---------- Device notifications (Web Push) for restaurant owners ---------- */
const b64ToU8 = (s) => { const pad = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** 'unsupported' | 'blocked' | 'on' | 'off' */
export async function pushStatus() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription(); return sub && Notification.permission === 'granted' ? 'on' : 'off'; } catch { return 'off'; }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support notifications. On iPhone, add the app to your Home Screen first.');
  const { enabled, publicKey } = await api.get('/push/key');
  if (!enabled) throw new Error('Notifications are not switched on for this platform yet.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications were blocked. Allow them in your browser or phone settings for this site, then try again.');
  const reg = (await registerSW()) || (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(publicKey) });
  await api.post('/push/subscribe', { subscription: sub.toJSON() });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration(); const sub = await reg?.pushManager.getSubscription();
  if (sub) { await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
}

/**
 * Make the current page installable as ITS OWN app (a restaurant's page gets that restaurant's name and logo).
 * Browsers read a manifest from a link tag, so we build one on the fly. iOS uses the apple tags instead.
 */
export function brandAsApp({ name, logo, startUrl }) {
  const prev = { title: document.title };
  const head = document.head; const made = [];
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); head.appendChild(el); made.push(el); return el; };
  const old = [...head.querySelectorAll('link[rel="manifest"], link[rel="apple-touch-icon"], link[rel="icon"]')];
  old.forEach((el) => el.remove());

  // Cloudinary logos can be resized to a square PNG on the fly; other image hosts are used as given.
  const square = (size) => (logo && /res\.cloudinary\.com\/.+\/image\/upload\//.test(logo)
    ? logo.replace('/image/upload/', `/image/upload/c_pad,b_white,w_${size},h_${size},f_png/`) : logo);
  const useLogo = !!logo && /^https:\/\//.test(logo);
  const icons = useLogo
    ? [{ src: square(192), sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: square(512), sizes: '512x512', type: 'image/png', purpose: 'any' }]
    : ['192', '512'].map((n) => ({ src: `${location.origin}/icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png', purpose: 'any' }));
  const manifest = { name, short_name: name.length > 12 ? name.slice(0, 12).trim() : name, start_url: startUrl || location.href, scope: location.origin + '/', display: 'standalone', background_color: '#ffffff', theme_color: '#3d9a54', icons };
  const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
  add('link', { rel: 'manifest', href: url });
  add('link', { rel: 'apple-touch-icon', href: useLogo ? square(180) : `${location.origin}/apple-touch-icon.png` });
  add('link', { rel: 'icon', href: useLogo ? square(64) : '/favicon.svg' });
  const meta = [...head.querySelectorAll('meta[name="apple-mobile-web-app-title"]')]; meta.forEach((m) => m.setAttribute('content', name));
  return () => { made.forEach((el) => el.remove()); old.forEach((el) => head.appendChild(el)); URL.revokeObjectURL(url); meta.forEach((m) => m.setAttribute('content', 'Ordarly')); document.title = prev.title; };
}
