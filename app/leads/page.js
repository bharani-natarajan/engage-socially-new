'use client';

import { useEffect, useState } from 'react';
import { getLeads, removeLead } from '@/lib/leads';

const INTENT_STYLES = {
  'Inquiry':         { bg: 'bg-blue-50',  text: 'text-blue-600',  border: 'border-blue-200'  },
  'Purchase Intent': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
};

const PLATFORM_STYLES = {
  instagram: { label: 'Instagram', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  facebook:  { label: 'Facebook',  bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-200'   },
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

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [intentFilter, setIntentFilter] = useState('All');
  const [platformFilter, setPlatformFilter] = useState('All');

  useEffect(() => {
    setLeads(getLeads());
    setMounted(true);
  }, []);

  function handleRemove(id) {
    removeLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  if (!mounted) return null;

  const filtered = leads.filter((l) => {
    if (intentFilter !== 'All' && l.intent !== intentFilter) return false;
    if (platformFilter !== 'All' && l.platform !== platformFilter.toLowerCase()) return false;
    return true;
  });

  const inquiryCount = leads.filter((l) => l.intent === 'Inquiry').length;
  const purchaseCount = leads.filter((l) => l.intent === 'Purchase Intent').length;
  const igCount = leads.filter((l) => l.platform === 'instagram').length;
  const fbCount = leads.filter((l) => l.platform === 'facebook').length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-lord-text-main">Leads</h1>
          <p className="text-sm text-lord-text-muted mt-0.5">
            Users who showed interest via comments — auto-detected from Inquiry and Purchase Intent
          </p>
        </div>
        {leads.length > 0 && (
          <span className="px-3 py-1 rounded-full bg-lord-green/10 text-lord-green text-sm font-semibold">
            {leads.length} total
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Inquiries',       value: inquiryCount, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Purchase Intent', value: purchaseCount, color: 'text-green-600', bg: 'bg-green-50'  },
          { label: 'From Instagram',  value: igCount,       color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'From Facebook',   value: fbCount,       color: 'text-blue-700',  bg: 'bg-blue-50'   },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-lord-border p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-lord-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Intent filter */}
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

        {/* Platform filter */}
        <div className="flex gap-1">
          {['All', 'Instagram', 'Facebook'].map((f) => (
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
            const intentStyle = INTENT_STYLES[lead.intent] ?? INTENT_STYLES['Inquiry'];
            const platformStyle = PLATFORM_STYLES[lead.platform] ?? PLATFORM_STYLES['instagram'];
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
                  </div>
                  <p className="text-xs text-lord-text-muted leading-relaxed line-clamp-2">
                    &ldquo;{lead.commentText}&rdquo;
                  </p>
                  {lead.postCaption && (
                    <p className="text-[11px] text-lord-text-muted mt-1 truncate">
                      On: {lead.postCaption}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-lord-text-muted">{timeAgo(lead.addedAt)}</span>
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
