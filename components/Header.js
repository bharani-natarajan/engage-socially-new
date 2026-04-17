'use client';

import { usePathname } from 'next/navigation';

const PAGE_LABELS = {
  '/': 'Dashboard',
  '/posts': 'Posts',
  '/create': 'Create Post',
  '/create/ai': 'AI Generate',
  '/messages': 'Messages',
  '/settings': 'Settings',
};

export default function Header() {
  const pathname = usePathname();
  const pageLabel = PAGE_LABELS[pathname] ?? 'Dashboard';

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-10">
      {/* Left: Breadcrumb */}
      <div className="flex flex-col">
        <p className="text-xs text-gray-400 font-medium">
          Portal &rsaquo; <span className="text-green-500">{pageLabel}</span>
        </p>
        <h1 className="text-base font-bold text-gray-900 leading-tight">{pageLabel}</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            className="bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 text-gray-600 placeholder-gray-300 w-48 transition-all"
          />
        </div>

        {/* Notification */}
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors border border-gray-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border-2 border-white" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-green-500/20">
            A
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-gray-800 leading-tight">Admin</p>
            <p className="text-xs text-gray-400">Instagram Manager</p>
          </div>
        </div>
      </div>
    </header>
  );
}
