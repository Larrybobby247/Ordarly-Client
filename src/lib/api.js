const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export class ApiError extends Error {
  constructor(msg, status, data) { super(msg); this.status = status; this.data = data; }
}

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong', res.status, data);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
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
