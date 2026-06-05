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
  const [liPostTarget, setLiPostTarget] = useState('personal');
  const [liPages, setLiPages] = useState([]);
  const [personalName, setPersonalName] = useState('');
  const [loadingPages, setLoadingPages] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    setAutoReply(localStorage.getItem(SETTING_AI_AUTO_REPLY) === 'true');
    setBrandContext(localStorage.getItem(SETTING_AI_CONTEXT) ?? '');
    setTone(localStorage.getItem(SETTING_AI_TONE) ?? 'friendly');
    setAvoid(localStorage.getItem(SETTING_AI_AVOID) ?? '');
    
    const getCookies = () => {
      const match = document.cookie.match(/(?:^|;\s*)unipile_name=([^;]*)/);
      setLiName(match ? decodeURIComponent(match[1]) : null);
      const igMatch = document.cookie.match(/(?:^|;\s*)ig_username=([^;]*)/);
      setIgName(igMatch ? decodeURIComponent(igMatch[1]) : null);
      const fbMatch = document.cookie.match(/(?:^|;\s*)fb_page_name=([^;]*)/);
      setFbName(fbMatch ? decodeURIComponent(fbMatch[1]) : null);
    };
    
    getCookies();

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Call unipile sync endpoint to sync connected accounts and set cookies
    fetch('/api/auth/unipile/sync', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          getCookies();
          // After sync, fetch pages if connected
          fetchLinkedInPages();
        }
      })
      .catch(console.error);

    // Sync li_org_id and li_post_target from localStorage to cookie
    const orgId = localStorage.getItem('li_org_id') ?? '';
    setSelectedPageId(orgId || null);
    document.cookie = `li_org_id=${encodeURIComponent(orgId)};path=/;max-age=${365*24*60*60};samesite=lax`;
    const target = localStorage.getItem('li_post_target') ?? 'personal';
    setLiPostTarget(target);
    document.cookie = `li_post_target=${encodeURIComponent(target)};path=/;max-age=${365*24*60*60};samesite=lax`;
    
    const fetchLinkedInPages = () => {
      const match = document.cookie.match(/(?:^|;\s*)unipile_account_id=([^;]*)/);
      if (match) {
        setLoadingPages(true);
        fetch('/api/auth/unipile/pages')
          .then(res => res.json())
          .then(data => {
            if (!data.error) {
              setLiPages(data.pages ?? []);
              setPersonalName(data.personalName ?? '');
            }
          })
          .catch(console.error)
          .finally(() => setLoadingPages(false));
      }
    };

    fetchLinkedInPages();

    // Fetch user's custom Gemini API key
    if (token) {
      fetch('/api/auth/gemini-settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (!data.error && data.geminiApiKey) {
            setGeminiApiKey(data.geminiApiKey);
          }
        })
        .catch(console.error);
    }

    setMounted(true);
  }, []);

  const handlePostTargetChange = (target, orgId = null) => {
    setLiPostTarget(target);
    localStorage.setItem('li_post_target', target);
    document.cookie = `li_post_target=${encodeURIComponent(target)};path=/;max-age=${365*24*60*60};samesite=lax`;
    
    if (orgId) {
      setSelectedPageId(orgId);
      localStorage.setItem('li_org_id', orgId);
      document.cookie = `li_org_id=${encodeURIComponent(orgId)};path=/;max-age=${365*24*60*60};samesite=lax`;
    } else {
      setSelectedPageId(null);
      localStorage.removeItem('li_org_id');
      document.cookie = `li_org_id=;path=/;max-age=0;samesite=lax`;
    }

    // Sync target choice to database
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      fetch('/api/auth/unipile/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          linkedinPostTarget: target,
          linkedinOrgId: orgId
        })
      }).catch(console.error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account? This will clear all connection settings.')) return;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/unipile/disconnect', { 
        method: 'POST',
        headers
      });
      if (res.ok) {
        setLiName(null);
        setLiPages([]);
        setPersonalName('');
        setLiPostTarget('personal');
        setSelectedPageId(null);
      } else {
        alert('Failed to disconnect');
      }
    } catch (err) {
      console.error(err);
      alert('Error disconnecting: ' + err.message);
    }
  };

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

  async function saveApiKey() {
    setSavingApiKey(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      alert('Authentication token not found. Please log in again.');
      setSavingApiKey(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/gemini-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ geminiApiKey })
      });
      const data = await res.json();
      if (res.ok) {
        setApiKeySaved(true);
        setTimeout(() => setApiKeySaved(false), 2000);
      } else {
        alert('Failed to save API Key: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert('Error saving API Key: ' + err.message);
    } finally {
      setSavingApiKey(false);
    }
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
        <div className="p-6 divide-y divide-lord-border/50 space-y-6">
          {/* LinkedIn Row */}
          <div className="pb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-lord-text-main">LinkedIn</p>
                  <p className="text-xs text-lord-text-muted">
                    {liName ? `Connected as ${liName}` : 'Account not connected'}
                  </p>
                </div>
              </div>
              {liName ? (
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-full text-[12px] font-bold transition-colors bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href="/api/auth/unipile"
                  className="px-4 py-2 rounded-full text-[12px] font-bold transition-colors bg-[#0A66C2] text-white hover:bg-[#004182]"
                >
                  Connect
                </a>
              )}
            </div>
            {liName && (
              <div className="mt-4 pl-12 space-y-3">
                <p className="text-xs font-bold text-lord-text-main">
                  Select active posting destination:
                </p>
                
                {loadingPages ? (
                  <div className="flex items-center gap-2 text-xs text-lord-text-muted">
                    <svg className="animate-spin h-4 w-4 text-lord-green" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading pages...
                  </div>
                ) : (
                  <div className="space-y-2 max-w-md">
                    {/* Personal Profile Row */}
                    <label className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                      liPostTarget === 'personal'
                        ? 'border-lord-green bg-lord-green/5 ring-1 ring-lord-green'
                        : 'border-lord-border hover:border-gray-300 bg-white'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="li_post_destination"
                          checked={liPostTarget === 'personal'}
                          onChange={() => handlePostTargetChange('personal')}
                          className="w-4 h-4 text-lord-green focus:ring-lord-green border-lord-border"
                        />
                        <div>
                          <p className="text-[13px] font-semibold text-lord-text-main">
                            {personalName || liName || 'Personal Profile'}
                          </p>
                          <p className="text-[11px] text-lord-text-muted">Personal Profile</p>
                        </div>
                      </div>
                    </label>

                    {/* Business Pages Rows */}
                    {liPages.map((page) => (
                      <label key={page.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                        liPostTarget === 'business' && selectedPageId === page.id
                          ? 'border-lord-green bg-lord-green/5 ring-1 ring-lord-green'
                          : 'border-lord-border hover:border-gray-300 bg-white'
                      }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="li_post_destination"
                            checked={liPostTarget === 'business' && selectedPageId === page.id}
                            onChange={() => handlePostTargetChange('business', page.id)}
                            className="w-4 h-4 text-lord-green focus:ring-lord-green border-lord-border"
                          />
                          <div>
                            <p className="text-[13px] font-semibold text-lord-text-main">{page.name}</p>
                            <p className="text-[11px] text-lord-text-muted">Company Page (ID: {page.id})</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instagram Row */}
          <div className="py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-lord-text-main">Instagram</p>
                  <p className="text-xs text-lord-text-muted">
                    {igName ? `Connected as @${igName}` : 'Account not connected'}
                  </p>
                </div>
              </div>
              <a
                href="/api/auth/instagram"
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                  igName ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-pink-500 text-white hover:bg-pink-600'
                }`}
              >
                {igName ? 'Reconnect' : 'Connect'}
              </a>
            </div>
          </div>

          {/* Facebook Row */}
          <div className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-lord-text-main">Facebook</p>
                  <p className="text-xs text-lord-text-muted">
                    {fbName ? `Connected as ${fbName}` : 'Account not connected'}
                  </p>
                </div>
              </div>
              <a
                href="/api/auth/instagram"
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                  fbName ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-[#1877F2] text-white hover:bg-[#1150a2]'
                }`}
              >
                {fbName ? 'Reconnect' : 'Connect'}
              </a>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-lord-bg/30 border-t border-lord-border/50 text-[11px] text-lord-text-muted flex flex-col gap-1">
          {/* <p>• LinkedIn connection powered by Unipile — no developer app approval required.</p> */}
          <p>• Connecting Instagram also connects Facebook automatically in one single step.</p>
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

      {/* Gemini API Key */}
      <div className="bg-lord-card rounded-2xl border border-lord-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-lord-border">
          <h3 className="text-sm font-bold text-lord-text-main">Gemini AI Configuration</h3>
          <p className="text-xs text-lord-text-muted mt-0.5">
            Configure your Gemini API Key to use your own quota for content generation
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="block text-[13px] font-semibold text-lord-text-main">
                Your Gemini API Key
              </label>
              <button
                type="button"
                onClick={() => setShowInstructions(true)}
                className="text-lord-text-muted hover:text-lord-green transition-colors focus:outline-none"
                title="How to get an API key"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>
            <p className="text-[12px] text-lord-text-muted mb-3">
              If left blank, the system's default API key will be used. You can obtain your API key from Google AI Studio.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 rounded-xl border border-lord-border bg-white px-4 py-2.5 text-[13px] text-lord-text-main placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lord-green/40"
              />
              {geminiApiKey && (
                <button
                  type="button"
                  onClick={() => setGeminiApiKey('')}
                  className="px-3 rounded-xl border border-lord-border text-[12px] hover:bg-gray-50 text-lord-text-muted transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-lord-border/50 pt-4">
            <span className="text-[11px] text-lord-text-muted">
              Keys are stored securely and used only for your comment/content generation.
            </span>
            <div className="flex items-center gap-3">
              {apiKeySaved && (
                <span className="text-[12px] text-lord-green font-semibold flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved
                </span>
              )}
              <button
                onClick={saveApiKey}
                disabled={savingApiKey}
                className="px-5 py-2.5 rounded-full bg-lord-green text-white text-[13px] font-bold hover:bg-lord-green-dark transition-colors shadow-sm disabled:opacity-50"
              >
                {savingApiKey ? 'Saving...' : 'Save API Key'}
              </button>
            </div>
          </div>
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

      {/* Modal Popup for Gemini API Key Instructions */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
          <div className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden transform transition-all duration-300 scale-100">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg hover:bg-gray-100 focus:outline-none"
              aria-label="Close instructions"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lord-green flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-none">Gemini API Key</h3>
                <p className="text-[12px] text-gray-500 mt-1">Get your free key from Google AI Studio</p>
              </div>
            </div>

            {/* Steps */}
            <ol className="space-y-4 text-[13px] text-gray-700 leading-relaxed">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 text-lord-green font-bold text-xs flex items-center justify-center border border-green-100">1</span>
                <div>
                  Go to the{' '}
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lord-green hover:underline font-semibold inline-flex items-center gap-0.5"
                  >
                    Google AI Studio
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 text-lord-green font-bold text-xs flex items-center justify-center border border-green-100">2</span>
                <div>Sign in with your Google account.</div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 text-lord-green font-bold text-xs flex items-center justify-center border border-green-100">3</span>
                <div>
                  Click the <span className="font-semibold text-gray-900">"Get API key"</span> button in the top left.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 text-lord-green font-bold text-xs flex items-center justify-center border border-green-100">4</span>
                <div>
                  Click <span className="font-semibold text-gray-900">"Create API key"</span>, select/create a project, and generate the key.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-50 text-lord-green font-bold text-xs flex items-center justify-center border border-green-100">5</span>
                <div>
                  Copy your key (starts with <code className="bg-gray-50 border border-gray-200/60 px-1.5 py-0.5 rounded font-mono text-[11.5px] text-gray-800">AIzaSy...</code>) and paste it below.
                </div>
              </li>
            </ol>

            {/* Footer button */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                className="px-5 py-2 rounded-xl bg-lord-green hover:bg-lord-green-dark text-white font-bold text-[13px] transition-colors shadow-sm focus:outline-none"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
