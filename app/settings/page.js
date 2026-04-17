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
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your Engage Socially preferences</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {/* AI Auto Reply */}
        <div className="flex items-start justify-between gap-6 p-5">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span className="text-sm font-semibold text-gray-900">AI Auto Reply to Comments</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed">
              When enabled, Gemini AI will automatically generate and post a reply to new unanswered comments when you open a post's comment section.
            </p>
          </div>
          <button
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              autoReply ? 'bg-violet-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={autoReply}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                autoReply ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {autoReply && (
        <div className="mt-4 p-4 rounded-xl bg-violet-50 border border-violet-100 text-sm text-violet-700 leading-relaxed">
          <span className="font-semibold">Auto Reply is ON.</span> When you open comments on a post, any unanswered comments will automatically receive an AI-generated reply.
        </div>
      )}
    </div>
  );
}
