'use client';

import { useEffect, useState } from 'react';

export const SETTING_AI_AUTO_REPLY = 'setting_ai_auto_reply';

export default function SettingsPage() {
  const [autoReply, setAutoReply] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setAutoReply(localStorage.getItem(SETTING_AI_AUTO_REPLY) === 'true');
    setMounted(true);
  }, []);

  function toggle() {
    const next = !autoReply;
    setAutoReply(next);
    localStorage.setItem(SETTING_AI_AUTO_REPLY, String(next));
  }

  if (!mounted) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">AI Features</h3>
          <p className="text-xs text-gray-400 mt-0.5">Configure AI-powered automation</p>
        </div>

        <div className="flex items-start justify-between gap-6 p-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">AI Auto Reply to Comments</p>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                When enabled, Gemini AI will automatically generate and post a reply to unanswered comments when you open a post's comment section.
              </p>
            </div>
          </div>

          <button
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${autoReply ? 'bg-green-500' : 'bg-gray-200'}`}
            role="switch"
            aria-checked={autoReply}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${autoReply ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {autoReply && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-100 flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p className="text-sm text-green-700 leading-relaxed">
            <span className="font-semibold">Auto Reply is ON.</span> Unanswered comments will automatically receive an AI-generated reply when you open any post's comments.
          </p>
        </div>
      )}
    </div>
  );
}
