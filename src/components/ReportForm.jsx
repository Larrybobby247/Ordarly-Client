import { useState } from 'react';
import { api } from '../lib/api';
import { Alert, Field } from './ui';

// Sends a message/complaint to the platform team (admin "Complaints" inbox).
export default function ReportForm({ source = 'contact', restaurantSlug, orderRef, onDone, defaultKind = 'question' }) {
  const [f, setF] = useState({ kind: defaultKind, name: '', email: '', subject: '', message: '', website: '' });
  const [state, setState] = useState({ busy: false, err: '', ref: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setState({ busy: true, err: '', ref: '' });
    try {
      const r = await api.post('/public/complaints', { ...f, source, restaurantSlug, orderRef: orderRef || undefined, subject: f.subject || undefined });
      setState({ busy: false, err: '', ref: r.reference || 'received' }); onDone?.();
    } catch (x) { setState({ busy: false, err: x.message, ref: '' }); }
  };
  if (state.ref) return <Alert kind="ok">Thank you. We received your message{state.ref !== 'received' && <> (reference <b>{state.ref}</b>)</>} and will reply by email.</Alert>;
  return (
    <form onSubmit={submit} className="space-y-4">
      <Alert>{state.err}</Alert>
      <div className="flex gap-2">
        {[['question', 'Question'], ['complaint', 'Complaint'], ['feedback', 'Feedback']].map(([k, l]) => (
          <button type="button" key={k} onClick={() => setF({ ...f, kind: k })} className={`chip !px-4 !py-1.5 ${f.kind === k && '!border-brand-500 !bg-brand-50 !text-brand-700'}`}>{l}</button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name"><input className="input" required minLength={2} value={f.name} onChange={set('name')} /></Field>
        <Field label="Email"><input type="email" className="input" required value={f.email} onChange={set('email')} /></Field>
      </div>
      <Field label="Subject (optional)"><input className="input" maxLength={120} value={f.subject} onChange={set('subject')} /></Field>
      <Field label="Message"><textarea rows={5} className="input" required minLength={10} maxLength={2000} value={f.message} onChange={set('message')} /></Field>
      {/* Honeypot: hidden from people, bots fill it in */}
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="website" value={f.website} onChange={set('website')} />
      <button className="btn-primary w-full" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}

export function ReportModal({ onClose, ...props }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-6" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-4xl bg-white p-6 md:rounded-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-xl font-bold">Report a problem</h2><button onClick={onClose} className="text-2xl leading-none" aria-label="Close">×</button></div>
        <ReportForm {...props} defaultKind="complaint" />
      </div>
    </div>
  );
}
