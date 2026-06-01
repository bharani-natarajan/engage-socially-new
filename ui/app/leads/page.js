'use client';

import { useEffect, useRef, useState } from 'react';
import { getLeads, removeLead, upsertLead } from '@/lib/leads';

const INTENT_STYLES = {
  'Inquiry':         { bg: 'bg-blue-50',  text: 'text-blue-600',  border: 'border-blue-200'  },
  'Purchase Intent': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
};

const PLATFORM_STYLES = {
  instagram: { label: 'Instagram', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  facebook:  { label: 'Facebook',  bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-200'   },
  linkedin:  { label: 'LinkedIn',  bg: 'bg-sky-50',    text: 'text-sky-700',   border: 'border-sky-200'    },
};

function Avatar({ name }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {initial}
    </div>
  );
}

function Badge({ label, style }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${style.bg} ${style.text} ${style.border}`}>
      {label}
    </span>
  );
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Zoho Bigin logo mark
function BiginLogo({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#E4261C"/>
      <path d="M10 28V12h8c3.3 0 6 2.7 6 6s-2.7 6-6 6h-4v4H10zm4-8h4c1.1 0 2-.9 2-2s-.9-2-2-2h-4v4z" fill="white"/>
      <circle cx="30" cy="26" r="4" fill="white"/>
    </svg>
  );
}

async function sendToBigin(lead) {
  const res = await fetch('/api/bigin/contacts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error ?? 'Failed to send to Bigin');
    err.needsReauth = res.status === 401 || res.status === 403 || data.error === 'bigin_needs_reauth' || data.error === 'bigin_not_connected';
    throw err;
  }
  return data;
}

function EditableField({ value, placeholder, type, onSave, icon }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);

  function commit() {
    setEditing(false);
    if (val.trim() !== value) onSave(val.trim());
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false); } }}
        className="text-[11px] border border-lord-border rounded px-1.5 py-0.5 w-36 outline-none focus:border-lord-green"
      />
    );
  }

  return (
    <button
      onClick={() => { setVal(value); setEditing(true); }}
      className={`inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-0.5 transition-colors hover:bg-gray-100 ${value ? 'text-lord-text-muted' : 'text-gray-300 hover:text-gray-400'}`}
      title={value ? `Edit ${placeholder}` : placeholder}
    >
      {icon}
      {value || placeholder}
    </button>
  );
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [intentFilter, setIntentFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [biginConnected, setBiginConnected] = useState(false);
  const [biginNeedsReauth, setBiginNeedsReauth] = useState(false);
  const [biginSending, setBiginSending] = useState({}); // leadId → 'sending' | 'done' | 'error'
  const [bulkSending, setBulkSending] = useState(false);
  const [biginError, setBiginError] = useState('');
  const [dmModal, setDmModal] = useState(null); // { lead, message }
  const [dmThread, setDmThread] = useState({ chatId: null, messages: [], loading: false, error: '' });
  const [dmSending, setDmSending] = useState(false);
  const [dmError, setDmError] = useState('');
  const dmBottomRef = useRef(null);

  useEffect(() => {
    setLeads(getLeads());
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('bigin_error')) setBiginError(`Bigin: ${sp.get('bigin_error')}`);
    fetch('/api/bigin/status').then(r => r.json()).then(d => setBiginConnected(!!d.connected)).catch(() => {});
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dmModal) {
      setDmThread({ chatId: null, messages: [], loading: false, error: '' });
      return;
    }
    async function loadThread() {
      setDmThread({ chatId: null, messages: [], loading: true, error: '' });
      try {
        const res = await fetch('/api/linkedin/conversations');
        if (!res.ok) { setDmThread({ chatId: null, messages: [], loading: false, error: '' }); return; }
        const data = await res.json();
        const chat = (data.data ?? []).find((c) =>
          c.participants?.data?.some((p) =>
            p.id === dmModal.lead.userId ||
            p.username?.toLowerCase() === dmModal.lead.username?.toLowerCase()
          )
        );
        if (!chat) { setDmThread({ chatId: null, messages: [], loading: false, error: '' }); return; }

        const msgRes = await fetch(`/api/linkedin/conversations/${chat.id}`);
        const msgData = await msgRes.json();
        const messages = (msgData.data ?? []).slice().reverse();
        setDmThread({ chatId: chat.id, messages, loading: false, error: '' });
      } catch {
        setDmThread({ chatId: null, messages: [], loading: false, error: '' });
      }
    }
    loadThread();
  }, [dmModal?.lead?.id]);

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmThread.messages]);

  async function scanPosts() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/leads/scan');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Scan failed');
      let added = 0;
      for (const lead of data.leads ?? []) {
        upsertLead(lead);
        added++;
      }
      setLeads(getLeads());
      setScanResult({ added, scanned: data.scanned ?? 0 });
    } catch (err) {
      setScanResult({ error: err.message });
    } finally {
      setScanning(false);
    }
  }

  function handleRemove(id) {
    removeLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  async function handleSendToBigin(lead) {
    setBiginSending((s) => ({ ...s, [lead.id]: 'sending' }));
    setBiginError('');
    try {
      await sendToBigin(lead);
      const updated = { ...lead, biginSentAt: new Date().toISOString() };
      upsertLead(updated);
      setLeads(getLeads());
      setBiginSending((s) => ({ ...s, [lead.id]: 'done' }));
    } catch (err) {
      if (err.needsReauth) { setBiginNeedsReauth(true); setBiginConnected(false); }
      else setBiginError(err.message);
      setBiginSending((s) => ({ ...s, [lead.id]: 'error' }));
    }
  }

  function handleFieldUpdate(lead, field, value) {
    upsertLead({ ...lead, [field]: value });
    setLeads(getLeads());
  }

  async function handleSendDM() {
    if (!dmModal?.message?.trim()) return;
    setDmSending(true);
    setDmError('');
    try {
      let url, body;
      if (dmThread.chatId) {
        url = `/api/linkedin/conversations/${dmThread.chatId}`;
        body = { message: dmModal.message };
      } else {
        url = '/api/linkedin/messages';
        body = { recipientId: dmModal.lead.userId, message: dmModal.message };
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? 'Failed to send DM');
      }
      const data = await res.json();
      const newChatId = dmThread.chatId ?? data.id ?? data.chat_id ?? null;
      const newMsg = { id: Date.now().toString(), text: dmModal.message, from: { username: 'me' }, timestamp: new Date().toISOString(), _isMe: true };
      setDmThread((t) => ({ ...t, chatId: newChatId, messages: [...t.messages, newMsg] }));
      setDmModal((m) => ({ ...m, message: '' }));
    } catch (err) {
      setDmError(err.message);
    } finally {
      setDmSending(false);
    }
  }

  async function handleBulkSend(all = false) {
    const targets = all ? leads : leads.filter((l) => !l.biginSentAt);
    if (!targets.length) return;
    setBulkSending(true);
    setBiginError('');
    let failed = 0;
    for (const lead of targets) {
      setBiginSending((s) => ({ ...s, [lead.id]: 'sending' }));
      try {
        await sendToBigin(lead);
        const updated = { ...lead, biginSentAt: new Date().toISOString() };
        upsertLead(updated);
        setBiginSending((s) => ({ ...s, [lead.id]: 'done' }));
      } catch (err) {
        failed++;
        if (err.needsReauth) { setBiginNeedsReauth(true); setBiginConnected(false); break; }
        setBiginSending((s) => ({ ...s, [lead.id]: 'error' }));
      }
    }
    setLeads(getLeads());
    setBulkSending(false);
    if (failed && !biginNeedsReauth) setBiginError(`${failed} lead${failed > 1 ? 's' : ''} failed to sync.`);
  }

  if (!mounted) return null;

  const filtered = leads.filter((l) => {
    if (intentFilter !== 'All' && l.intent !== intentFilter) return false;
    if (platformFilter !== 'All' && l.platform !== platformFilter.toLowerCase()) return false;
    return true;
  });

  const inquiryCount  = leads.filter((l) => l.intent === 'Inquiry').length;
  const purchaseCount = leads.filter((l) => l.intent === 'Purchase Intent').length;
  const igCount       = leads.filter((l) => l.platform === 'instagram').length;
  const fbCount       = leads.filter((l) => l.platform === 'facebook').length;
  const unsentCount   = leads.filter((l) => !l.biginSentAt).length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-lord-text-main">Leads</h1>
          <p className="text-sm text-lord-text-muted mt-0.5">
            Users who showed interest via comments — auto-detected from Inquiry and Purchase Intent
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {leads.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-lord-green/10 text-lord-green text-sm font-semibold">
              {leads.length} total
            </span>
          )}
          <button
            onClick={scanPosts}
            disabled={scanning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lord-green text-white text-[13px] font-semibold hover:bg-lord-green-dark transition-colors disabled:opacity-60 shadow-sm"
          >
            {scanning ? (
              <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Scanning…</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Scan Posts</>
            )}
          </button>
        </div>
      </div>

      {/* Zoho Bigin connect / status bar */}
      <div className="bg-lord-card rounded-2xl border border-lord-border px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BiginLogo size={28} />
          <div>
            <p className="text-sm font-semibold text-lord-text-main">Zoho Bigin</p>
            <p className="text-xs text-lord-text-muted">
              {biginConnected ? 'Connected — send leads directly to your CRM' : 'Connect to push leads into your Bigin CRM'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {biginConnected && leads.length > 0 && (
            <div className="flex items-center gap-2">
              {unsentCount > 0 && (
                <button
                  onClick={() => handleBulkSend(false)}
                  disabled={bulkSending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4261C]/30 text-[#E4261C] text-[12px] font-semibold hover:bg-[#E4261C]/5 transition-colors disabled:opacity-50"
                >
                  {bulkSending ? (
                    <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  )}
                  {bulkSending ? 'Syncing…' : `Sync new (${unsentCount})`}
                </button>
              )}
              <button
                onClick={() => handleBulkSend(true)}
                disabled={bulkSending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 text-[12px] font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {bulkSending ? (
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                )}
                {bulkSending ? 'Syncing…' : 'Resend all'}
              </button>
            </div>
          )}
          {!biginConnected && (
            <a
              href="/api/auth/bigin"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors bg-[#E4261C] text-white hover:bg-[#c41f16]"
            >
              {biginNeedsReauth ? 'Reconnect Bigin' : 'Connect Bigin'}
            </a>
          )}
        </div>
      </div>

      {/* Feedback banners */}
      {scanResult && (
        <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${scanResult.error ? 'bg-red-50 border-red-200 text-red-600' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {scanResult.error
            ? `Scan failed: ${scanResult.error}`
            : `Scanned ${scanResult.scanned} comments — ${scanResult.added} lead${scanResult.added !== 1 ? 's' : ''} found`}
        </div>
      )}
      {biginError && (
        <div className="px-4 py-3 rounded-xl border bg-red-50 border-red-200 text-red-600 text-sm font-medium">
          {biginError}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Inquiries',       value: inquiryCount,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Purchase Intent', value: purchaseCount, color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'From Instagram',  value: igCount,       color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'From Facebook',   value: fbCount,       color: 'text-blue-700',   bg: 'bg-blue-50'   },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-lord-border p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-lord-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {['All', 'Inquiry', 'Purchase Intent'].map((f) => (
            <button
              key={f}
              onClick={() => setIntentFilter(f)}
              className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                intentFilter === f
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="w-px bg-lord-border mx-1" />
        <div className="flex gap-1">
          {['All', 'Instagram', 'Facebook', 'LinkedIn'].map((f) => (
            <button
              key={f}
              onClick={() => setPlatformFilter(f)}
              className={`px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                platformFilter === f
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Leads list */}
      {leads.length === 0 ? (
        <div className="bg-lord-card rounded-2xl border border-lord-border p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-sm font-semibold text-lord-text-main">No leads yet</p>
          <p className="text-xs text-lord-text-muted mt-1">
            Open any post and its comments will be scanned for Inquiry and Purchase Intent.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-lord-card rounded-2xl border border-lord-border p-8 text-center">
          <p className="text-sm text-lord-text-muted">No leads match the selected filters.</p>
        </div>
      ) : (
        <div className="bg-lord-card rounded-2xl border border-lord-border overflow-hidden">
          {filtered.map((lead, i) => {
            const intentStyle   = INTENT_STYLES[lead.intent] ?? INTENT_STYLES['Inquiry'];
            const platformStyle = PLATFORM_STYLES[lead.platform] ?? PLATFORM_STYLES['instagram'];
            const sendState     = biginSending[lead.id];
            const alreadySent   = !!lead.biginSentAt;

            return (
              <div
                key={lead.id}
                className={`flex items-start gap-4 px-5 py-4 ${i !== filtered.length - 1 ? 'border-b border-lord-border' : ''}`}
              >
                <Avatar name={lead.name || lead.username} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <span className="text-sm font-semibold text-lord-text-main">
                      {lead.name && lead.name !== lead.username ? lead.name : `@${lead.username}`}
                    </span>
                    {lead.name && lead.name !== lead.username && (
                      <span className="text-xs text-lord-text-muted">@{lead.username}</span>
                    )}
                    <Badge label={lead.intent} style={intentStyle} />
                    <Badge label={platformStyle.label} style={platformStyle} />
                    {alreadySent && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#E4261C]/30 bg-[#E4261C]/5 text-[10px] font-semibold text-[#E4261C]">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        In Bigin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-lord-text-muted leading-relaxed line-clamp-2">
                    &ldquo;{lead.commentText}&rdquo;
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <EditableField
                      value={lead.email ?? ''}
                      placeholder="Add email"
                      type="email"
                      onSave={(v) => handleFieldUpdate(lead, 'email', v)}
                      icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    />
                    <span className="text-gray-200 text-[11px]">·</span>
                    <EditableField
                      value={lead.phone ?? ''}
                      placeholder="Add phone"
                      type="tel"
                      onSave={(v) => handleFieldUpdate(lead, 'phone', v)}
                      icon={<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/></svg>}
                    />
                  </div>
                  {lead.postId && (
                    <a
                      href={`/posts/${encodeURIComponent(lead.postId.includes('%') ? decodeURIComponent(lead.postId) : lead.postId)}?platform=${lead.platform}`}
                      className="inline-flex items-center gap-2 mt-2 group"
                    >
                      {lead.postThumbnail && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={lead.postThumbnail} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-lord-border" />
                      )}
                      <span className="text-[11px] text-lord-text-muted group-hover:text-lord-green transition-colors truncate max-w-[200px]">
                        {lead.postCaption ? lead.postCaption : 'View post'} →
                      </span>
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-lord-text-muted">{timeAgo(lead.addedAt)}</span>

                  {/* LinkedIn DM */}
                  {lead.platform === 'linkedin' && (
                    <button
                      onClick={() => setDmModal({ lead, message: '' })}
                      title="Send LinkedIn DM"
                      className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </button>
                  )}

                  {/* Send to Bigin */}
                  {biginConnected && (
                    <button
                      onClick={() => sendState !== 'sending' && handleSendToBigin(lead)}
                      disabled={sendState === 'sending'}
                      title={alreadySent ? 'Resend to Bigin' : 'Send to Bigin'}
                      className={`w-7 h-7 group flex items-center justify-center rounded-full transition-colors ${
                        sendState === 'error'
                          ? 'text-red-500 bg-red-50 hover:bg-red-100'
                          : alreadySent || sendState === 'done'
                          ? 'text-[#E4261C] bg-[#E4261C]/10 hover:bg-[#E4261C]/20'
                          : 'text-gray-300 hover:text-[#E4261C] hover:bg-[#E4261C]/10'
                      }`}
                    >
                      {sendState === 'sending' ? (
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      ) : alreadySent || sendState === 'done' ? (
                        <>
                          <svg className="group-hover:hidden" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          <svg className="hidden group-hover:block" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
                        </>
                      ) : (
                        <BiginLogo size={14} />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleRemove(lead.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    title="Remove lead"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setDmModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col" style={{ height: '520px' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-lord-border flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-lord-text-main">LinkedIn DM</h2>
                <p className="text-xs text-lord-text-muted mt-0.5">
                  {dmModal.lead.name && dmModal.lead.name !== dmModal.lead.username ? dmModal.lead.name : ''} @{dmModal.lead.username}
                </p>
              </div>
              <button onClick={() => setDmModal(null)} className="text-gray-300 hover:text-gray-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
              {dmThread.loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!dmThread.loading && dmThread.messages.length === 0 && (
                <p className="text-xs text-lord-text-muted text-center py-6">No previous messages. Start the conversation below.</p>
              )}
              {dmThread.messages.map((msg) => {
                const isMe = msg._isMe || msg.from?.username === 'me';
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-sky-600 text-white rounded-br-sm'
                          : 'bg-white border border-lord-border text-lord-text-main rounded-bl-sm shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                      {msg.timestamp && (
                        <span className="text-[10px] text-lord-text-muted px-1">{timeAgo(msg.timestamp)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={dmBottomRef} />
            </div>

            {/* Compose */}
            <div className="flex-shrink-0 px-5 py-3 border-t border-lord-border bg-white rounded-b-2xl">
              {dmError && <p className="text-xs text-red-500 mb-2">{dmError}</p>}
              <div className="flex gap-2 items-end">
                <textarea
                  rows={2}
                  value={dmModal.message}
                  onChange={(e) => setDmModal((m) => ({ ...m, message: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDM(); } }}
                  placeholder="Write a message… (Enter to send)"
                  className="flex-1 border border-lord-border rounded-xl px-3 py-2 text-sm text-lord-text-main placeholder:text-gray-300 outline-none focus:border-sky-400 resize-none"
                />
                <button
                  onClick={handleSendDM}
                  disabled={dmSending || !dmModal.message.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {dmSending
                    ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
