'use client';

import Link from 'next/link';
import NavLinks from './NavLinks';

export default function Sidebar({ isConnected }) {
  return (
    <aside className="w-[240px] flex-shrink-0 flex flex-col bg-white border-r border-gray-100 py-6 z-20 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 mb-8">
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-green-500 flex-shrink-0 flex items-center justify-center shadow-lg shadow-green-500/30"
        >
          <svg fill="white" width="20" height="20" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V4.07C7.05 4.57 4 7.95 4 12s3.05 7.43 7 7.93zm2 0C16.95 19.43 20 16.05 20 12s-3.05-7.43-7-7.93v15.86z"/>
          </svg>
        </Link>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">Engage</p>
          <p className="font-bold text-green-500 text-sm leading-tight">Socially</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 w-full px-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-3">Menu</p>
        <NavLinks />
      </div>

      {/* Footer */}
      <div className="px-4 mt-4 space-y-1">
        {isConnected && (
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-green-50 border border-green-100">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 absolute -bottom-0.5 -right-0.5 border-2 border-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-green-700 leading-none mb-0.5">Connected</p>
              <p className="text-xs text-green-500/70">Instagram</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
