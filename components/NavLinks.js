'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/posts',
    label: 'Posts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
  {
    href: '/create',
    label: 'Create Post',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
];

export default function NavLinks({ expanded }) {
  const pathname = usePathname();

  return (
    <div className={`flex flex-col gap-1 mt-2 ${expanded ? 'px-3' : 'items-center'}`}>
      {links.map((link) => {
        const isActive =
          link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            title={!expanded ? link.label : undefined}
            className={`flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${
              expanded ? 'px-3 py-2.5 w-full' : 'w-10 h-10 justify-center'
            } ${
              isActive
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span className="flex-shrink-0">{link.icon}</span>
            {expanded && (
              <span className="font-medium whitespace-nowrap overflow-hidden">{link.label}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
