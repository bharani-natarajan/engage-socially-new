'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/posts', label: 'Posts' },
  { href: '/create', label: 'Create Post' },
  { href: '/create/ai', label: 'AI Generate' },
  { href: '/leads', label: 'Leads' },
  { href: '/messages', label: 'Messages' },
  { href: '/settings', label: 'Settings' },
];

export default function TopNav() {
  const pathname = usePathname();

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
