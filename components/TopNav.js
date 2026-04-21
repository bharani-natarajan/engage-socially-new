'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlatform } from './PlatformContext';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/posts', label: 'Posts' },
  { href: '/create', label: 'Create Post' },
  { href: '/create/ai', label: 'AI Generate' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Settings' },
];

// Instagram icon
function IgIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

// Facebook icon
function FbIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const { platform, setPlatform } = usePlatform();

  return (
    <header className="h-[80px] bg-lord-card flex items-center justify-between px-8 shrink-0 z-20 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="w-10 h-10 rounded-2xl bg-lord-green text-white flex-shrink-0 flex items-center justify-center font-bold"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
             <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V4.07C7.05 4.57 4 7.95 4 12s3.05 7.43 7 7.93zm2 0C16.95 19.43 20 16.05 20 12s-3.05-7.43-7-7.93v15.86z"/>
          </svg>
        </Link>
      </div>

      {/* Center-left: Platform switcher */}
      <div className="flex items-center gap-1 bg-lord-bg border border-lord-border rounded-full p-1">
        <button
          onClick={() => setPlatform('instagram')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
            platform === 'instagram'
              ? 'bg-lord-green text-white shadow-sm'
              : 'text-lord-text-muted hover:text-lord-text-main'
          }`}
        >
          <IgIcon size={14} /> Instagram
        </button>
        <button
          onClick={() => setPlatform('facebook')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
            platform === 'facebook'
              ? 'bg-[#1877F2] text-white shadow-sm'
              : 'text-lord-text-muted hover:text-lord-text-main'
          }`}
        >
          <FbIcon size={14} /> Facebook
        </button>
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
        {/* Search */}
        <div className="relative hidden lg:block">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search ..."
            className="w-[200px] bg-lord-bg/60 border-none rounded-full py-2.5 pl-11 pr-4 text-[15px] focus:outline-none focus:ring-1 focus:ring-lord-border text-lord-text-main placeholder-gray-400 transition-all font-medium"
          />
        </div>

        {/* Notifications / Messages */}
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center text-lord-text-main hover:bg-lord-bg rounded-full transition-colors relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-lord-red rounded-full border-2 border-white" />
          </button>
          
          <button className="w-10 h-10 flex items-center justify-center text-lord-text-main hover:bg-lord-bg rounded-full transition-colors relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
               <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        </div>

        {/* Profile */}
        <div className="w-10 h-10 rounded-full bg-lord-teal overflow-hidden flex-shrink-0 cursor-pointer flex items-center justify-center text-white font-semibold">
           {/* Fallback avatar */}
           J
        </div>
      </div>
    </header>
  );
}
