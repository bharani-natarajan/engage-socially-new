'use client';

import { useEffect, useState } from 'react';
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
  if (!res.ok) throw new Error(data.error ?? 'Failed to send to Bigin');
  return data;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [intentFilter, setIntentFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [biginConnected, setBiginConnected] = useState(false);
  const [biginSending, setBiginSending] = useState({}); // leadId → 'sending' | 'done' | 'error'
  const [bulkSending, setBulkSending] = useState(false);
  const [biginError, setBiginError] = useState('');

  useEffect(() => {
    setLeads(getLeads());
    const match = document.cookie.match(/(?:^|;\s*)bigin_connected=([^;]*)/);
    setBiginConnected(!!match);

    const sp = new URLSearchParams(window.location.search);
    if (sp.get('bigin_connected')) setBiginConnected(true);
    if (sp.get('bigin_error')) setBiginError(`Bigin: ${sp.get('bigin_error')}`);
    setMounted(true);
  }, []);

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
      setBiginError(err.message);
      setBiginSending((s) => ({ ...s, [lead.id]: 'error' }));
    }
  }

  async function handleBulkSend() {
    const unsent = leads.filter((l) => !l.biginSentAt);
    if (!unsent.length) return;
    setBulkSending(true);
    setBiginError('');
    let failed = 0;
    for (const lead of unsent) {
      setBiginSending((s) => ({ ...s, [lead.id]: 'sending' }));
      try {
        await sendToBigin(lead);
        const updated = { ...lead, biginSentAt: new Date().toISOString() };
        upsertLead(updated);
        setBiginSending((s) => ({ ...s, [lead.id]: 'done' }));
      } catch {
        failed++;
        setBiginSending((s) => ({ ...s, [lead.id]: 'error' }));
      }
    }
    setLeads(getLeads());
    setBulkSending(false);
    if (failed) setBiginError(`${failed} lead${failed > 1 ? 's' : ''} failed to sync.`);
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
          {biginConnected && unsentCount > 0 && (
            <button
              onClick={handleBulkSend}
              disabled={bulkSending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E4261C]/30 text-[#E4261C] text-[12px] font-semibold hover:bg-[#E4261C]/5 transition-colors disabled:opacity-50"
            >
              {bulkSending ? (
                <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              )}
              {bulkSending ? 'Syncing…' : `Sync all (${unsentCount})`}
            </button>
          )}
          <a
            href="/api/auth/bigin"
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
              biginConnected
                ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                : 'bg-[#E4261C] text-white hover:bg-[#c41f16]'
            }`}
          >
            {biginConnected ? 'Reconnect' : 'Connect Bigin'}
          </a>
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

                  {/* Send to Bigin */}
                  {biginConnected && (
                    <button
                      onClick={() => !alreadySent && !sendState && handleSendToBigin(lead)}
                      disabled={alreadySent || sendState === 'sending'}
                      title={alreadySent ? 'Already in Bigin' : 'Send to Bigin'}
                      className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                        alreadySent || sendState === 'done'
                          ? 'text-[#E4261C] bg-[#E4261C]/10 cursor-default'
                          : sendState === 'error'
                          ? 'text-red-500 bg-red-50'
                          : 'text-gray-300 hover:text-[#E4261C] hover:bg-[#E4261C]/10'
                      }`}
                    >
                      {sendState === 'sending' ? (
                        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      ) : alreadySent || sendState === 'done' ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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
    </div>
  );
}
