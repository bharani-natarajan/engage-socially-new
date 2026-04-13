export default function Header() {
  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 relative z-10 w-full rounded-tl-[2rem]">
      {/* Search Bar - hidden on very small screens, visible on md+ */}
      <div className="relative w-full max-w-md hidden md:block">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
           <circle cx="11" cy="11" r="8"></circle>
           <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          placeholder="eventure.com"
          className="w-full bg-gray-50 border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none text-gray-600 placeholder-gray-400"
        />
      </div>

      <div className="flex-1 md:hidden"></div>

      {/* Right Actions */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          </button>
          <button className="relative w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors border border-gray-100 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full border-2 border-white"></span>
          </button>
        </div>

        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-900 leading-tight">Maria Horwitz</span>
            <span className="text-xs text-gray-400">Event Manager</span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-10 h-10 rounded-full cursor-pointer shadow-sm shadow-black/5" />
        </div>
      </div>
    </header>
  );
}
