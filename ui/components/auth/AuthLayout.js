'use client';

/**
 * Shared auth page layout wrapper with branding
 */
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf4] via-white to-[#e0f2fe] p-4">
      {/* Decorative blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-lord-green/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-lord-teal/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-lord-green/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lord-green text-white mb-4 shadow-lg shadow-lord-green/25">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93V4.07C7.05 4.57 4 7.95 4 12s3.05 7.43 7 7.93zm2 0C16.95 19.43 20 16.05 20 12s-3.05-7.43-7-7.93v15.86z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-lord-text-main">{title}</h1>
          {subtitle && <p className="text-lord-text-muted mt-2 text-[15px]">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-lord-border/50 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
