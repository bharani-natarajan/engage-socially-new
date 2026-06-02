import './globals.css';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import TopNav from '@/components/TopNav';

export const metadata = {
  title: 'Engage Socially',
  description: 'Instagram social media management',
};

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const search = headersList.get('x-search') ?? '';
  const store = await cookies();
  const isConnected = !!store.get('ig_user_id')?.value;
  const hasFbToken = !!store.get('fb_page_id')?.value;
  const manualToken = process.env.MANUAL_IG_ACCESS_TOKEN;

  const hasError = search.includes('error=');

  if (pathname !== '/settings' && (!isConnected || !hasFbToken) && manualToken && !hasError) {
    redirect(`/api/auth/manual?token=${manualToken}`);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-lord-bg font-sans antialiased text-lord-text-main" suppressHydrationWarning>
        <div className="flex flex-col h-screen overflow-hidden">
          <TopNav />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
            <div className="max-w-[1400px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
