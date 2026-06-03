import './globals.css';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthProvider } from '@/lib/auth';
import AuthGuard from '@/components/auth/AuthGuard';
import ClientLayout from '@/components/layout/ClientLayout';

export const metadata = {
  title: 'Engage Socially',
  description: 'Instagram social media management',
};

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password'];

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const search = headersList.get('x-search') ?? '';
  const store = await cookies();
  const isConnected = !!store.get('ig_user_id')?.value;
  const hasFbToken = !!store.get('fb_page_id')?.value;
  const manualToken = process.env.MANUAL_IG_ACCESS_TOKEN;

  const hasError = search.includes('error=');

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isPublicPath && pathname !== '/settings' && (!isConnected || !hasFbToken) && manualToken && !hasError) {
    redirect(`/api/auth/manual?token=${manualToken}&redirect=${encodeURIComponent(pathname + search)}`);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-lord-bg font-sans antialiased text-lord-text-main font-medium" suppressHydrationWarning>
        <AuthProvider>
          <AuthGuard>
            <ClientLayout>{children}</ClientLayout>
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
