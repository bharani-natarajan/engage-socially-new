import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export const metadata = {
  title: 'Event Management Dashboard',
  description: 'A beautiful dashboard layout',
};

export default async function RootLayout({ children }) {
  const store = await cookies();
  const isConnected = !!store.get('ig_user_id')?.value;
  const manualToken = process.env.MANUAL_IG_ACCESS_TOKEN;

  // Auto-connect fallback using the manual endpoint
  if (!isConnected && manualToken) {
    redirect(`/api/auth/manual?token=${manualToken}`);
  }


  return (
    <html lang="en">
      <body className="bg-gray-100 font-sans antialiased text-gray-600">
        <div className="flex h-screen overflow-hidden bg-white/50 relative">
          {/* Mock Mac Window Frame effect */}
          <div className="absolute inset-0 bg-white shadow-xl max-w-[1440px] mx-auto overflow-hidden flex shadow-black/5">
            <Sidebar isConnected={isConnected} />
            <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] rounded-tl-[2rem] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] border-l border-t border-gray-100 z-10 overflow-hidden relative">
              <Header />
              <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 scrollbar-thin scrollbar-thumb-gray-200">
                {children}
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
