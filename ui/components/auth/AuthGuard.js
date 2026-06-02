'use client';

import { useAuth } from '@/lib/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

export default function AuthGuard({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const isPublicPath = PUBLIC_PATHS.includes(pathname);
      if (!isAuthenticated && !isPublicPath) {
        router.push('/login');
      } else if (isAuthenticated && isPublicPath) {
        router.push('/');
      }
    }
  }, [isAuthenticated, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lord-bg">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-lord-green" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
          </svg>
          <span className="text-lord-text-muted font-medium text-sm">Loading Engage Socially…</span>
        </div>
      </div>
    );
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  if (!isAuthenticated && !isPublicPath) {
    return null; // Redirecting...
  }

  return <>{children}</>;
}
