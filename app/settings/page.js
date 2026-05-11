'use client';

import { useEffect, useState } from 'react';

export const SETTING_AI_AUTO_REPLY = 'setting_ai_auto_reply';
export const SETTING_AI_CONTEXT = 'setting_ai_context';
export const SETTING_AI_TONE = 'setting_ai_tone';
export const SETTING_AI_AVOID = 'setting_ai_avoid';
const TONES = [
  { value: 'friendly', label: 'Friendly', desc: 'Warm, approachable, conversational' },
  { value: 'professional', label: 'Professional', desc: 'Polished and brand-appropriate' },
  { value: 'casual', label: 'Casual', desc: 'Relaxed, informal, relatable' },
  { value: 'witty', label: 'Witty', desc: 'Light-hearted with a touch of humour' },
];

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function SettingsPage() {
  const [autoReply, setAutoReply] = useState(false);
  const [brandContext, setBrandContext] = useState('');
  const [tone, setTone] = useState('friendly');
  const [avoid, setAvoid] = useState('');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [liName, setLiName] = useState(null);
  const [igName, setIgName] = useState(null);
  const [fbName, setFbName] = useState(null);
  const [igInsightsConnected, setIgInsightsConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stopped, setStopped] = useState({});
  const [removing, setRemoving] = useState({});

  async function syncAccounts() {
    setSyncing(true);
    try {
      const res = await fetch('/api/auth/unipile/sync');
      const data = await res.json();
      if (data.connected) {
        if (data.connected.linkedin) setLiName(data.connected.linkedin);
        if (data.connected.instagram) setIgName(data.connected.instagram);
        if (data.connected.facebook) setFbName(data.connected.facebook);
      }
      setStopped(data.stopped ?? {});
    } catch { /* silent */ } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    setAutoReply(localStorage.getItem(SETTING_AI_AUTO_REPLY) === 'true');
    setBrandContext(localStorage.getItem(SETTING_AI_CONTEXT) ?? '');
    setTone(localStorage.getItem(SETTING_AI_TONE) ?? 'friendly');
    setAvoid(localStorage.getItem(SETTING_AI_AVOID) ?? '');

    setLiName(getCookie('unipile_name'));
    setIgName(getCookie('unipile_ig_name'));
    setFbName(getCookie('unipile_fb_name'));
    setIgInsightsConnected(!!getCookie('ig_user_id'));

    // Sync li_org_id from localStorage to cookie so server components can read it
    const orgId = localStorage.getItem('li_org_id') ?? '';
    document.cookie = `li_org_id=${encodeURIComponent(orgId)};path=/;max-age=${365*24*60*60};samesite=lax`;
    setMounted(true);
  }, []);

  // On mount, sync account status from Unipile in case redirect callback didn't fire
  useEffect(() => {
    if (!mounted) return;
    syncAccounts();
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle success/error params from OAuth callbacks
  useEffect(() => {
    if (!mounted) return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('li_connected')) setLiName(getCookie('unipile_name'));
    if (sp.get('ig_connected')) setIgName(getCookie('unipile_ig_name'));
    if (sp.get('fb_connected')) setFbName(getCookie('unipile_fb_name'));
    if (sp.get('connected')) setIgInsightsConnected(!!getCookie('ig_user_id'));
  }, [mounted]);

  async function removeStoppedAccount(accountId, platform) {
    setRemoving((r) => ({ ...r, [platform]: true }));
    try {
      await fetch(`/api/auth/unipile/account?accountId=${accountId}&platform=${platform}`, { method: 'DELETE' });
      setStopped((s) => { const n = { ...s }; delete n[platform]; return n; });
      if (platform === 'linkedin') setLiName(null);
      if (platform === 'instagram') setIgName(null);
      if (platform === 'facebook') setFbName(null);
    } catch { /* silent */ } finally {
      setRemoving((r) => { const n = { ...r }; delete n[platform]; return n; });
    }
  }

  function toggleAutoReply() {
    const next = !autoReply;
    setAutoReply(next);
    localStorage.setItem(SETTING_AI_AUTO_REPLY, String(next));
  }

  function saveContext() {
    localStorage.setItem(SETTING_AI_CONTEXT, brandContext);
    localStorage.setItem(SETTING_AI_TONE, tone);
    localStorage.setItem(SETTING_AI_AVOID, avoid);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!mounted) return null;

  const platformKey = { LinkedIn: 'linkedin', Instagram: 'instagram', Facebook: 'facebook' };

  const accounts = [
    {
      name: 'LinkedIn',
      color: '#0A66C2',
      connectedName: liName,
      href: '/api/auth/unipile',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      note: 'Powered by Unipile — no LinkedIn app approval required.',
    },
    {
      name: 'Instagram',
      color: '#E1306C',
      connectedName: igName,
      href: '/api/auth/unipile/instagram',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
      note: 'Posts, comments & DMs via Unipile.',
    },
    {
      name: 'Facebook',
      color: '#1877F2',
      connectedName: fbName,
      href: '/api/auth/unipile/facebook',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      note: 'Posts, comments & messages via Unipile.',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Connected Accounts */}
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-lord-border flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-lord-text-main">Connected Accounts</h3>
            <p className="text-xs text-lord-text-muted mt-0.5">Manage your social platform connections</p>
          </div>
          <button
            onClick={syncAccounts}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lord-border text-lord-text-muted text-[11px] font-semibold hover:border-lord-green hover:text-lord-green transition-colors disabled:opacity-50"
          >
            <svg className={syncing ? 'animate-spin' : ''} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            {syncing ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
        <div className="p-6 space-y-5">
          {accounts.map((acct) => {
            const key = platformKey[acct.name];
            const stoppedInfo = stopped[key];
            return (
              <div key={acct.name}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: acct.color }}>
                      {acct.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-lord-text-main">{acct.name}</p>
                      <p className="text-xs text-lord-text-muted">
                        {stoppedInfo
                          ? `${stoppedInfo.name} — disconnected`
                          : acct.connectedName
                          ? `Connected as ${acct.connectedName}`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={stoppedInfo ? `/api/auth/unipile/reconnect?accountId=${stoppedInfo.id}&platform=${key}` : acct.href}
                    className={`px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                      stoppedInfo
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : acct.connectedName
                        ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        : 'text-white hover:opacity-90'
                    }`}
                    style={!stoppedInfo && !acct.connectedName ? { backgroundColor: acct.color } : {}}
                  >
                    {stoppedInfo ? 'Reconnect' : acct.connectedName ? 'Reconnect' : 'Connect'}
                  </a>
                </div>
                {stoppedInfo && (
                  <div className="mt-2 ml-12 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div className="flex-1">
                      <span>Account disconnected from provider. Click <strong>Reconnect</strong> to re-authenticate.</span>
                      {key === 'instagram' && (
                        <span className="block mt-0.5 text-amber-600">Instagram requires a Business or Creator account linked to a Facebook Page.</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeStoppedAccount(stoppedInfo.id, key)}
                      disabled={removing[key]}
                      className="ml-auto flex-shrink-0 text-[10px] text-amber-600 underline hover:text-amber-900 disabled:opacity-50"
                    >
                      {removing[key] ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                )}
                {acct.note && (
                  <p className="text-[11px] text-lord-text-muted mt-1.5 ml-12">{acct.note}</p>
                )}
              </div>
            );
          })}

          {/* LinkedIn company page ID */}
          <div className="mt-1 space-y-1">
            <label className="block text-xs font-semibold text-lord-text-main">
              LinkedIn Company Page ID <span className="font-normal text-lord-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              defaultValue={typeof window !== 'undefined' ? (localStorage.getItem('li_org_id') ?? '') : ''}
              onChange={(e) => {
                const v = e.target.value.trim();
                localStorage.setItem('li_org_id', v);
                document.cookie = `li_org_id=${encodeURIComponent(v)};path=/;max-age=${365*24*60*60};samesite=lax`;
              }}
              placeholder="e.g. 12345678"
              className="w-full rounded-xl border border-lord-border bg-white px-4 py-2 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green/40"
            />
            <p className="text-[11px] text-lord-text-muted">
              Find it in your LinkedIn Company Page URL: linkedin.com/company/<span className="font-medium">12345678</span>/admin
            </p>
          </div>

          {/* Instagram Insights (optional, direct OAuth) */}
          <div className="pt-3 border-t border-lord-border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-lord-text-main">Instagram Insights</p>
                  <p className="text-xs text-lord-text-muted">
                    {igInsightsConnected ? 'Connected — reach, impressions & saves visible' : 'Not connected — enables reach, impressions & saves on posts'}
                  </p>
                </div>
              </div>
              <a
                href="/api/auth/instagram"
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                  igInsightsConnected ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {igInsightsConnected ? 'Reconnect' : 'Enable'}
              </a>
            </div>
            <p className="text-[11px] text-lord-text-muted mt-1.5 ml-12">
              Requires your own Meta app. Optional — all other Instagram features work without this.
            </p>
          </div>
        </div>
      </div>

      {/* AI Auto Reply toggle */}
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-lord-border">
          <h3 className="text-sm font-bold text-lord-text-main">AI Features</h3>
          <p className="text-xs text-lord-text-muted mt-0.5">Configure AI-powered automation</p>
        </div>

        <div className="flex items-start justify-between gap-6 p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-lord-green-light flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#83d395" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-lord-text-main">AI Auto Reply to Comments</p>
              <p className="text-sm text-lord-text-muted mt-1 leading-relaxed">
                When enabled, Gemini AI will automatically generate and post a reply to unanswered comments when you open a post&#39;s comment section.
              </p>
            </div>
          </div>

          <button
            onClick={toggleAutoReply}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${autoReply ? 'bg-lord-green' : 'bg-gray-200'}`}
            role="switch"
            aria-checked={autoReply}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${autoReply ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* AI Reply Context */}
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-lord-border">
          <h3 className="text-sm font-bold text-lord-text-main">AI Reply Context</h3>
          <p className="text-xs text-lord-text-muted mt-0.5">
            Provide information about your brand so AI replies are accurate and on-brand
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-[13px] font-semibold text-lord-text-main mb-1.5">
              Brand / Business description
            </label>
            <p className="text-[12px] text-lord-text-muted mb-2">
              Describe what you do, your products, services, audience, or anything the AI should know when replying.
            </p>
            <textarea
              rows={5}
              value={brandContext}
              onChange={(e) => setBrandContext(e.target.value)}
              placeholder={`e.g. We are a handmade jewellery brand based in Chennai, India. We specialise in gold-plated earrings and necklaces. Our customers are women aged 18–40 who love ethnic fashion. We ship across India and offer custom orders.`}
              className="w-full rounded-xl border border-lord-border bg-white px-4 py-3 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green/40 resize-none leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-lord-text-main mb-2">
              Reply tone
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex flex-col items-start text-left px-4 py-3 rounded-xl border transition-all ${
                    tone === t.value
                      ? 'border-lord-green bg-lord-green-light'
                      : 'border-lord-border bg-white hover:border-lord-green/40'
                  }`}
                >
                  <span className={`text-[13px] font-bold ${tone === t.value ? 'text-lord-green-dark' : 'text-lord-text-main'}`}>
                    {t.label}
                  </span>
                  <span className="text-[11px] text-lord-text-muted mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold text-lord-text-main mb-1.5">
              Things to avoid <span className="font-normal text-lord-text-muted">(optional)</span>
            </label>
            <p className="text-[12px] text-lord-text-muted mb-2">
              Topics, phrases, or promises the AI should never include in replies.
            </p>
            <textarea
              rows={3}
              value={avoid}
              onChange={(e) => setAvoid(e.target.value)}
              placeholder="e.g. Do not mention competitor names. Do not promise specific delivery dates. Do not use slang."
              className="w-full rounded-xl border border-lord-border bg-white px-4 py-3 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green/40 resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="text-[12px] text-lord-green font-semibold flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Saved
              </span>
            )}
            <button
              onClick={saveContext}
              className="px-5 py-2.5 rounded-full bg-lord-green text-white text-[13px] font-bold hover:bg-lord-green-dark transition-colors shadow-sm"
            >
              Save context
            </button>
          </div>
        </div>
      </div>

      {autoReply && (
        <div className="p-4 rounded-2xl bg-lord-green-light border border-lord-green/20 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-lord-green flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-sm text-lord-green-dark leading-relaxed">
            <span className="font-semibold">Auto Reply is ON.</span> Unanswered comments will automatically receive an AI-generated reply when you open any post&#39;s comments.
          </p>
        </div>
      )}
    </div>
  );
}
