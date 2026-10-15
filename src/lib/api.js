const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export class ApiError extends Error {
  constructor(msg, status, data) { super(msg); this.status = status; this.data = data; }
}

// PERF (new): three small protections that apply to every request in the app.
//  1. In-flight de-duplication: if the same GET is already on its way, callers share that one request
//     (fixes double requests from React StrictMode, remounts, and two components asking for the same thing).
//  2. Optional short-lived cache for PUBLIC, non-sensitive GETs (opt in with { ttl }). Any write clears it, so it can't go stale after a change.
//  3. A timeout, and a friendly message when the network is down, so screens never hang forever or show "Failed to fetch".
const inflight = new Map();
const cache = new Map(); // path -> { at, ttl, data }
const TIMEOUT_MS = 30000;

async function doFetch(method, path, body, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), TIMEOUT_MS);
  if (signal) { if (signal.aborted) ctrl.abort(); else signal.addEventListener('abort', () => ctrl.abort(), { once: true }); }
  try {
    const res = await fetch(BASE + path, {
      method, credentials: 'include', signal: ctrl.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error || 'Something went wrong', res.status, data);
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (signal?.aborted) throw Object.assign(new Error('Request cancelled'), { name: 'AbortError', cancelled: true }); // caller cancelled on purpose
    throw new ApiError(ctrl.signal.aborted ? 'This is taking too long. Please check your connection and try again.' : 'Network problem. Please check your connection and try again.', 0);
  } finally { clearTimeout(timer); }
}

async function request(method, path, body, opts = {}) {
  if (method === 'GET') {
    const hit = opts.ttl && cache.get(path);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.data; // fresh cached public data
    if (!opts.signal && inflight.has(path)) return inflight.get(path); // same GET already running: share it
    const p = doFetch(method, path, body, opts.signal).then((data) => { if (opts.ttl) cache.set(path, { at: Date.now(), ttl: opts.ttl, data }); return data; })
      .finally(() => { if (inflight.get(path) === p) inflight.delete(path); });
    if (!opts.signal) inflight.set(path, p);
    return p;
  }
  cache.clear(); // any change might make cached public data outdated
  return doFetch(method, path, body, opts.signal);
}

export const api = {
  // get(path, { signal, ttl }): signal cancels it (e.g. a newer search); ttl (ms) caches public data briefly. Never use ttl for private data.
  get: (p, opts) => request('GET', p, undefined, opts),
  post: (p, b, opts) => request('POST', p, b ?? {}, opts),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
};

export async function upload(path, file, field = 'file') {
  const fd = new FormData(); fd.append(field, file);
  const res = await fetch(BASE + path, { method: 'POST', credentials: 'include', body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Upload failed', res.status, data);
  return data;
}

export const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

export const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

export const ORDER_LABEL = {
  awaiting_whatsapp: 'Awaiting WhatsApp confirmation', pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing',
  ready: 'Ready', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled',
};
export const PAY_LABEL = {
  not_required: 'Not required', pending: 'Pending', awaiting_payment: 'Awaiting payment',
  awaiting_verification: 'Awaiting restaurant verification', paid: 'Paid', paid_manual: 'Paid – manually verified',
  unpaid_pod: 'Unpaid – pay on delivery', failed: 'Failed', rejected: 'Rejected', refunded: 'Refunded',
};
export const NEXT_STATUS = {
  awaiting_whatsapp: ['accepted', 'cancelled'], pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'ready', 'cancelled'], preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'completed', 'cancelled'], out_for_delivery: ['completed', 'cancelled'],
};

// Neighbourhood helpers (must match the server's normalizeArea so matching never depends on capitalisation)
export const normalizeArea = (s = '') =>
  String(s).toLowerCase().replace(/[^a-z0-9\s\-'./]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
export const titleCase = (s = '') => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
