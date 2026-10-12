import { useEffect, useState } from 'react';
import { api } from './api';

// Public contact details. Phone/WhatsApp are public business numbers, so they are fine in the frontend.
export const PHONE = import.meta.env.VITE_SUPPORT_PHONE || '+2349025504256';
export const PHONE_DIGITS = PHONE.replace(/\D/g, '');
export const WHATSAPP_URL = `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent('Hello Ordarly, I have a question.')}`;
const FALLBACK_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'support@ordarly.com';

const DEFAULTS = { pricing: { proPriceNgn: 7500, trialDays: 14, freeMeals: 10 }, supportEmail: FALLBACK_EMAIL, announcement: { enabled: false } };
let cache = null;

// Live platform info (pricing and support email are editable by the admin). Falls back to sensible defaults offline.
export function usePlatform() {
  const [p, setP] = useState(cache || DEFAULTS);
  useEffect(() => {
    if (cache) return;
    api.get('/public/platform').then((r) => { cache = { ...DEFAULTS, ...r, supportEmail: r.supportEmail || FALLBACK_EMAIL }; setP(cache); }).catch(() => {});
  }, []);
  return p;
}
