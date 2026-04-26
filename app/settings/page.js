'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [autoReply, setAutoReply] = useState(false);
  const [brandContext, setBrandContext] = useState('');
  const [tone, setTone] = useState('friendly');
  const [avoid, setAvoid] = useState('');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [liName, setLiName] = useState(null);
  const [liStatus, setLiStatus] = useState(''); // 'connected' | 'error' | ''

  useEffect(() => {
    setAutoReply(localStorage.getItem(SETTING_AI_AUTO_REPLY) === 'true');
    setBrandContext(localStorage.getItem(SETTING_AI_CONTEXT) ?? '');
    setTone(localStorage.getItem(SETTING_AI_TONE) ?? 'friendly');
    setAvoid(localStorage.getItem(SETTING_AI_AVOID) ?? '');
    // Read LinkedIn name from non-httpOnly cookie
    const match = document.cookie.match(/(?:^|;\s*)li_person_name=([^;]*)/);
    setLiName(match ? decodeURIComponent(match[1]) : null);
    // Handle redirect feedback from OAuth
    if (searchParams.get('li_connected')) setLiStatus('connected');
    if (searchParams.get('li_error')) setLiStatus('error');
    setMounted(true);
  }, [searchParams]);

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

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Connected Accounts */}
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-lord-border">
          <h3 className="text-sm font-bold text-lord-text-main">Connected Accounts</h3>
          <p className="text-xs text-lord-text-muted mt-0.5">Manage your social platform connections</p>
        </div>
        <div className="p-6 space-y-4">
          {/* LinkedIn */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-lord-text-main">LinkedIn</p>
                {liName ? (
                  <p className="text-xs text-lord-text-muted">Connected as {liName}</p>
                ) : (
                  <p className="text-xs text-lord-text-muted">Not connected</p>
                )}
              </div>
            </div>
            <a
              href="/api/auth/linkedin"
              className={`px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                liName
                  ? 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  : 'bg-[#0A66C2] text-white hover:bg-[#004182]'
              }`}
            >
              {liName ? 'Reconnect' : 'Connect'}
            </a>
          </div>

          {liStatus === 'connected' && (
            <p className="text-xs text-lord-green font-semibold flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              LinkedIn connected successfully
            </p>
          )}
          {liStatus === 'error' && (
            <p className="text-xs text-red-500">LinkedIn connection failed. Please try again.</p>
          )}

          <p className="text-[11px] text-lord-text-muted leading-relaxed">
            Requires <span className="font-medium">w_member_social</span> and <span className="font-medium">r_member_social</span> scopes on your LinkedIn app. Reading posts requires the "Share on LinkedIn" product approval.
          </p>
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
                When enabled, Gemini AI will automatically generate and post a reply to unanswered comments when you open a post's comment section.
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

          {/* Brand / Business description */}
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

          {/* Tone selector */}
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

          {/* Things to avoid */}
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

          {/* Save */}
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
            <span className="font-semibold">Auto Reply is ON.</span> Unanswered comments will automatically receive an AI-generated reply when you open any post's comments.
          </p>
        </div>
      )}
    </div>
  );
}
