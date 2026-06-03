'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState, useRef, useEffect } from 'react';

const baseLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/engage', label: 'Engage' },
  { href: '/posts', label: 'Posts' },
  { href: '/create', label: 'Create Post' },
  { href: '/create/ai', label: 'AI Generate' },
  { href: '/leads', label: 'Leads' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const links = baseLinks;

  const initials = user
    ? `${user.firstName?.[0] ?? ''}`.toUpperCase()
    : 'U';

  const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];
  if (PUBLIC_PATHS.includes(pathname)) return null;

  return (
    <header className="h-[80px] bg-lord-card border-b border-lord-border/80 flex items-center justify-between px-8 shrink-0 z-20">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-lord-green text-lord-card flex-shrink-0 flex items-center justify-center font-bold"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V4.07C7.05 4.57 4 7.95 4 12s3.05 7.43 7 7.93zm2 0C16.95 19.43 20 16.05 20 12s-3.05-7.43-7-7.93v15.86z"/>
          </svg>
        </Link>
      </div>

      {/* Center: Nav Links */}
      <nav className="hidden md:flex items-center gap-2">
        {links.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-5 py-2.5 rounded-full text-[15px] font-medium transition-all ${
                isActive
                  ? 'bg-lord-green text-lord-card'
                  : 'text-lord-text-muted hover:text-lord-text-main'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-5">
        {/* Users button (only for admins) */}
        {isAdmin && (
          <Link
            href="/admin"
            className={`px-5 py-2.5 rounded-full text-[15px] font-medium transition-all ${
              pathname.startsWith('/admin')
                ? 'bg-lord-green text-lord-card'
                : 'text-lord-text-muted hover:text-lord-text-main'
            }`}
          >
            Users
          </Link>
        )}

        {/* Search */}
        <div className="relative hidden lg:block">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search ..."
            className="w-[200px] bg-[#f4f5f7] border-none rounded-full py-2.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-1 focus:ring-lord-border text-lord-text-main placeholder-gray-400 transition-all font-medium"
          />
        </div>

        {/* Profile Avatar with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 rounded-full bg-[#2b7082] overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center text-white font-bold text-[16px] focus:outline-none hover:opacity-95 transition-opacity"
          >
             {initials}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-lord-border rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
              <div className="px-4 py-2.5 border-b border-lord-border">
                <p className="text-[14px] font-bold text-lord-text-main">{user ? `${user.firstName} ${user.lastName}` : 'Guest User'}</p>
                <p className="text-[12px] text-lord-text-muted truncate mt-0.5">{user?.email ?? ''}</p>
              </div>
              
              <Link
                href="/settings"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-lord-text-main hover:bg-[#f4f5f7] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Settings
              </Link>
              
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[14px] text-lord-teal font-bold hover:bg-[#f4f5f7] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Users Panel
                </Link>
              )}

              <div className="border-t border-lord-border my-1" />

              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
