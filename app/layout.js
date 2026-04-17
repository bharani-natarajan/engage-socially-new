import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata = {
  title: 'Engage Socially',
  description: 'Instagram social media management',
};

export default async function RootLayout({ children }) {
  const store = await cookies();
  const isConnected = !!store.get('ig_user_id')?.value;
  const manualToken = process.env.MANUAL_IG_ACCESS_TOKEN;

  if (!isConnected && manualToken) {
    redirect(`/api/auth/manual?token=${manualToken}`);
  }

  return (
    <html lang="en">
      <body className="bg-[#F4F7FE] font-sans antialiased text-gray-700">
        <div className="flex h-screen overflow-hidden">
          <Sidebar isConnected={isConnected} />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
