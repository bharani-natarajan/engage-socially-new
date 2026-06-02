'use client';

import { usePathname } from 'next/navigation';
import TopNav from '@/components/TopNav';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (isPublicPath) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 bg-[#fafbfe]">
        <div className="max-w-[1400px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
