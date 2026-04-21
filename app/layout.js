import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import TopNav from '@/components/TopNav';

export const metadata = {
  title: 'Engage Socially',
  description: 'Instagram social media management',
};

export default async function RootLayout({ children }) {
  const store = await cookies();
  const isConnected = !!store.get('ig_user_id')?.value;
  const hasFbToken = !!store.get('fb_page_id')?.value;
  const manualToken = process.env.MANUAL_IG_ACCESS_TOKEN;

  if ((!isConnected || !hasFbToken) && manualToken) {
    redirect(`/api/auth/manual?token=${manualToken}`);
  }

  return (
    <html lang="en">
      <body className="bg-lord-bg font-sans antialiased text-lord-text-main">
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
