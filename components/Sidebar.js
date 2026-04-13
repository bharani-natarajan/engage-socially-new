'use client';

import { useState } from 'react';
import Link from 'next/link';
import NavLinks from './NavLinks';

export default function Sidebar({ isConnected }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className={`flex-shrink-0 flex flex-col bg-white border-r border-gray-100 py-6 z-20 transition-all duration-300 ease-in-out overflow-hidden ${
        expanded ? 'w-[220px] items-start' : 'w-[80px] items-center'
      }`}
    >
      {/* Logo + app name */}
      <div className={`flex items-center gap-3 mb-8 ${expanded ? 'px-5' : 'px-0 justify-center w-full'}`}>
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-[#0066FF] flex-shrink-0 flex items-center justify-center shadow-lg shadow-blue-500/30 cursor-pointer"
        >
          <svg fill="white" width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.43 4 16.05 4 12C4 7.95 7.05 4.57 11 4.07V19.93ZM13 4.07C16.95 4.57 20 7.95 20 12C20 16.05 16.95 19.43 13 19.93V4.07Z" />
          </svg>
        </Link>
        {expanded && (
          <span className="font-bold text-sm text-gray-900 whitespace-nowrap tracking-tight leading-tight">
            Engage<br />Socially
          </span>
        )}
      </div>

      {/* Nav links */}
      <div className="flex-1 w-full">
        <NavLinks expanded={expanded} />
      </div>

      {/* Bottom actions */}
      <div className={`flex flex-col gap-3 w-full ${expanded ? 'px-3' : 'items-center'}`}>
        <button
          className={`flex items-center gap-3 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors ${
            expanded ? 'px-3 py-2.5 w-full' : 'w-10 h-10 justify-center'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0 .33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {expanded && <span className="text-sm font-medium">Settings</span>}
        </button>

        <button
          className={`flex items-center gap-3 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors ${
            expanded ? 'px-3 py-2.5 w-full' : 'w-10 h-10 justify-center'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {expanded && <span className="text-sm font-medium">Feedback</span>}
        </button>

        {/* Connected indicator */}
        {isConnected && (
          <div
            className={`flex items-center gap-3 rounded-xl ${
              expanded ? 'px-3 py-2.5 w-full bg-emerald-50 border border-emerald-100' : 'w-10 h-10 justify-center'
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute -bottom-0.5 -right-0.5 border-2 border-white" />
            </div>
            {expanded && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700 leading-none mb-0.5">Connected</p>
                <p className="text-xs text-emerald-500/70">Instagram</p>
              </div>
            )}
          </div>
        )}

        {/* Expand / collapse toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center gap-3 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors mt-1 ${
            expanded ? 'px-3 py-2.5 w-full' : 'w-10 h-10 justify-center'
          }`}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {expanded && <span className="text-sm font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
