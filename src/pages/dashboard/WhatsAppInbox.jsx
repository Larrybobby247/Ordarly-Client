import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { useVisibleInterval } from '../../lib/hooks';
import { Alert, Badge, CardSkeleton, RetryError } from '../../components/ui';
import { WaTabs } from './WhatsAppCommerce';

const STATUS = { bot_active: ['Assistant', 'green'], human_pending: ['Needs you', 'red'], human_active: ['You', 'blue'], resolved: ['Closed', 'gray'] };
const time = (d) => new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const FILTERS = [['', 'All'], ['needs_attention', 'Needs you'], ['human_active', 'You are handling'], ['bot_active', 'Assistant'], ['resolved', 'Closed']];
const tick = (m) => (m.direction !== 'outbound' ? '' : m.deliveryStatus === 'read' ? ' ✓✓' : m.deliveryStatus === 'delivered' ? ' ✓✓' : m.deliveryStatus === 'sent' ? ' ✓' : m.deliveryStatus === 'failed' ? ' ⚠' : ' …');

// Inbox: every WhatsApp conversation. Replying here (or on your phone's WhatsApp Business app) pauses the automatic assistant for that customer.
export default function WhatsAppInbox() {
  const [list, setList] = useState(null); const [err, setErr] = useState(''); const [filter, setFilter] = useState('');
  const [sel, setSel] = useState(null); const [chat, setChat] = useState(null); const [text, setText] = useState(''); const [busy, setBusy] = useState(false); const [note, setNote] = useState(null);
  const end = useRef(null);
  const loadList = useCallback(() => api.get(`/whatsapp/inbox/conversations${filter ? `?status=${filter}` : ''}`).then((r) => { setList(r); setErr(''); }).catch((e) => setErr(e.message)), [filter]);
  const loadChat = useCallback((id = sel) => { if (id) api.get(`/whatsapp/inbox/conversations/${id}`).then(setChat).catch((e) => setNote({ kind: 'error', text: e.message })); }, [sel]);
  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { setChat(null); setNote(null); loadChat(sel); }, [sel]); // eslint-disable-line react-hooks/exhaustive-deps
  useVisibleInterval(() => { loadList(); if (sel) loadChat(); }, 8000);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [chat?.messages?.length]);

  const act = async (path, body) => { setBusy(true); setNote(null); try { await api.post(`/whatsapp/inbox/conversations/${sel}/${path}`, body); loadChat(); loadList(); } catch (e) { setNote({ kind: 'error', text: e.message }); } finally { setBusy(false); } };
  const send = async (e) => { e.preventDefault(); if (!text.trim()) return; const t = text; setText(''); await act('reply', { text: t }); };

  if (err && !list) return <RetryError message={err} onRetry={loadList} />;
  const c = chat?.conversation;
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h3 className="text-lg font-bold">WhatsApp inbox</h3><p className="text-sm text-ink-500">Customer conversations. Customers who ask for a person show as <b>Needs you</b>.</p></div>
      <WaTabs here="/dashboard/whatsapp/inbox" />
      <div className="flex flex-wrap gap-1.5">{FILTERS.map(([k, l]) => <button key={k} onClick={() => { setFilter(k); setSel(null); }} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === k ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/10 text-ink-500'}`}>{l}{k === 'needs_attention' && list?.needsAttention ? ` (${list.needsAttention})` : ''}</button>)}</div>
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <div className={`card max-h-[70vh] overflow-y-auto ${sel ? 'hidden md:block' : ''}`}>
          {!list ? <CardSkeleton lines={4} /> : list.conversations.length === 0 ? <p className="p-5 text-sm text-ink-500">No conversations yet.</p> : (
            <ul className="divide-y divide-black/5">{list.conversations.map((x) => (
              <li key={x._id}><button onClick={() => setSel(x._id)} className={`block w-full px-4 py-3 text-left hover:bg-black/5 ${sel === x._id ? 'bg-brand-50' : ''}`}>
                <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold">{x.customerName || (x.phone ? `+${x.phone}` : 'WhatsApp customer')}</span>{x.unreadCount > 0 && <span className="rounded-full bg-brand-500 px-2 text-xs font-bold text-white">{x.unreadCount}</span>}</div>
                <div className="truncate text-xs text-ink-500">{x.lastMessagePreview || '—'}</div>
                <div className="mt-1 flex items-center gap-2"><Badge color={STATUS[x.status][1]}>{STATUS[x.status][0]}</Badge><span className="text-xs text-ink-500">{x.lastActivityAt ? time(x.lastActivityAt) : ''}</span></div></button></li>))}</ul>)}
        </div>
        <div className={`card flex max-h-[70vh] min-h-[50vh] flex-col ${sel ? '' : 'hidden md:flex'}`}>
          {!sel ? <p className="m-auto p-6 text-sm text-ink-500">Choose a conversation.</p> : !chat ? <CardSkeleton lines={5} /> : (<>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 p-3">
              <div><button className="mr-2 text-sm md:hidden" onClick={() => setSel(null)}>←</button><b>{c.customerName || (c.phone ? `+${c.phone}` : 'WhatsApp customer')}</b>{c.phone && <span className="ml-2 text-xs text-ink-500">+{c.phone}</span>}
                <div className="mt-0.5 flex items-center gap-2"><Badge color={STATUS[c.status][1]}>{STATUS[c.status][0]}</Badge>{c.assignedStaffName && <span className="text-xs text-ink-500">with {c.assignedStaffName}</span>}</div></div>
              <div className="flex gap-2">
                {c.status !== 'human_active' && c.status !== 'resolved' && <button className="btn-dark !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => act('takeover')}>Take over</button>}
                {c.status !== 'bot_active' && <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => act('resume')}>Hand back to assistant</button>}
                {c.status !== 'resolved' && <button className="btn-ghost !px-3 !py-1.5 text-xs" disabled={busy} onClick={() => act('close')}>Close</button>}
              </div></div>
            {c.handoverReason && c.status === 'human_pending' && <div className="px-3 pt-3"><Alert kind="info">{c.handoverReason}</Alert></div>}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {chat.messages.map((m) => (
                <div key={m._id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : ''}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.direction === 'outbound' ? 'bg-brand-50' : 'bg-black/5'}`}>{m.content}
                    <div className="mt-0.5 text-[10px] text-ink-500">{m.origin === 'bot' ? 'Assistant · ' : m.origin === 'staff' ? `${m.sentByName || 'Team'} · ` : m.origin === 'business_app' ? 'WhatsApp Business app · ' : ''}{time(m.timestamp)}{tick(m)}</div>
                    {m.failureReason && m.deliveryStatus === 'failed' && <div className="text-[11px] text-red-600">{m.failureReason}</div>}</div></div>))}
              <div ref={end} />
            </div>
            {chat.orders?.length > 0 && <div className="border-t border-black/5 px-3 py-2 text-xs text-ink-500">Orders: {chat.orders.map((o) => `${o.reference} (${o.status})`).join(', ')}</div>}
            {note && <div className="px-3"><Alert kind={note.kind}>{note.text}</Alert></div>}
            {!c.windowOpen && <p className="px-3 pt-2 text-xs text-amber-700">This customer last wrote more than 24 hours ago. WhatsApp only lets you send an approved template message until they write again, so a typed reply may not be delivered.</p>}
            <form onSubmit={send} className="flex gap-2 p-3"><input className="input flex-1" maxLength={1500} placeholder="Type a reply…" value={text} onChange={(e) => setText(e.target.value)} /><button className="btn-primary !px-5" disabled={busy || !text.trim()}>Send</button></form>
            <p className="px-3 pb-2 text-[11px] text-ink-500">Each delivered reply uses one Ordarly credit. Replying here pauses the assistant for this customer.</p>
          </>)}
        </div>
      </div>
    </div>
  );
}
