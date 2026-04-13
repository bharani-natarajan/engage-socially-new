export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-10">
      {/* Top Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">Welcome to Your Event <br/> Management!</h1>
          <p className="text-sm text-gray-500">Here's a summary of your events and tasks.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-800 font-semibold text-lg">Active Events</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-5xl font-bold text-gray-900">12</div>
                  <div className="text-xs text-gray-400 mt-1 max-w-[120px] leading-tight flex flex-col">
                    <span>Currently managing 12</span>
                    <span>ongoing events.</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="bg-emerald-50 text-emerald-500 text-xs font-semibold px-2 py-1 rounded-md mb-2 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    4.76%
                  </div>
                  <div className="text-[10px] text-gray-400">since last month</div>
                </div>
              </div>
              <div className="h-6 w-full flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Active Event</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-100"></span>Upcoming Event</div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-800 font-semibold text-lg">Attendee Insights</h3>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
              <div className="flex items-end justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="text-5xl font-bold text-gray-900">1,450</div>
                   <div className="text-xs text-gray-400 max-w-[90px] leading-tight flex flex-col mt-2">
                     <span>Across all active</span>
                     <span>events.</span>
                   </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="bg-emerald-50 text-emerald-500 text-xs font-semibold px-2 py-1 rounded-md mb-2 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    12.56%
                  </div>
                  <div className="text-[10px] text-gray-400">since last month</div>
                </div>
              </div>
              <div className="h-6 w-full flex items-center gap-3 mt-2 pr-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Checked-in</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-100"></span>Registered</div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-gray-200"></span>No-Show</div>
              </div>
            </div>
          </div>

          {/* Activities and Today Tasks */}
          <div className="grid grid-cols-2 gap-6 flex-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-800 font-semibold text-lg">Recent Activities</h3>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
               </div>
               <div className="space-y-4">
                  <div className="bg-blue-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-blue-500/30 cursor-pointer hover:-translate-y-0.5 transition-transform">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        </div>
                        <div>
                           <div className="text-sm font-semibold">Event Created: Zanotech Expo 2024</div>
                           <div className="text-xs text-blue-100">Just Now</div>
                        </div>
                     </div>
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  <div className="p-4 flex items-center justify-between cursor-pointer group rounded-2xl hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        </div>
                        <div>
                           <div className="text-sm font-semibold text-gray-800">Ticket Sales Updated: Marketing Summit</div>
                           <div className="text-xs text-gray-400">54 minutes ago</div>
                        </div>
                     </div>
                     <svg className="text-gray-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
                  <div className="p-4 flex items-center justify-between cursor-pointer group rounded-2xl hover:bg-gray-50 transition-colors">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        </div>
                        <div>
                           <div className="text-sm font-semibold text-gray-800">Attendee List Exported: Health Conference</div>
                           <div className="text-xs text-gray-400">1 hour ago</div>
                        </div>
                     </div>
                     <svg className="text-gray-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-800 font-semibold text-lg">Today Task</h3>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
               </div>
               <div className="space-y-2">
                 {[
                   { t: 'Check Venue Availability for Tech Expo', sub: 'Today • 09:00 AM •', badge: 'High Priority', badgeColor: 'bg-red-50 text-red-500', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', active: true },
                   { t: 'Send Reminder Emails to Attendees', sub: 'Today • 02:00 PM •', badge: 'Low Priority', badgeColor: 'bg-emerald-50 text-emerald-500', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
                   { t: 'Confirm Speaker Line-up for Marketin...', sub: 'Today • 05:00 PM •', badge: 'High Priority', badgeColor: 'bg-red-50 text-red-500', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' }
                 ].map((task, i) => (
                    <div key={i} className="flex items-center justify-between p-4 group cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-2xl transition-colors">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${task.active ? 'bg-red-50 text-red-400' : 'bg-emerald-50 text-emerald-400'}`}>
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={task.icon}/></svg>
                            </div>
                            <div>
                               <div className="text-sm font-semibold text-gray-800">{task.t}</div>
                               <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                                  {task.sub}
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${task.badgeColor}`}>{task.badge}</span>
                               </div>
                            </div>
                         </div>
                         <svg className="text-gray-300 transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Bottom Chart */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-2 h-[320px] flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 relative z-10 w-full px-2">
                 <h3 className="text-gray-800 font-semibold text-lg">Event Revenue Insights</h3>
                 <div className="flex items-center gap-4 text-sm font-medium">
                    <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">All Events <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></button>
                    <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">Monthly <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></button>
                    <button className="text-gray-400 hover:text-gray-600 ml-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                 </div>
              </div>
              <div className="flex-1 relative w-full h-full pb-8">
                 <svg className="absolute inset-0 w-full h-[85%]" preserveAspectRatio="none" viewBox="0 0 1000 200">
                    <defs>
                       <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                       </linearGradient>
                    </defs>
                    {/* Background Grid Lines */}
                    <line x1="0" y1="20" x2="1000" y2="20" stroke="#f1f5f9" strokeWidth="1"/>
                    <line x1="0" y1="60" x2="1000" y2="60" stroke="#f1f5f9" strokeWidth="1"/>
                    <line x1="0" y1="100" x2="1000" y2="100" stroke="#f1f5f9" strokeWidth="1"/>
                    <line x1="0" y1="140" x2="1000" y2="140" stroke="#f1f5f9" strokeWidth="1"/>
                    <line x1="0" y1="180" x2="1000" y2="180" stroke="#f1f5f9" strokeWidth="1"/>
                    
                    <path d="M0 120 Q50 60, 100 80 T250 140 T350 100 T500 130 T600 60 T750 140 T850 80 T1000 110 L1000 200 L0 200 Z" fill="url(#gradient)" />
                    <path d="M0 120 Q50 60, 100 80 T250 140 T350 100 T500 130 T600 60 T750 140 T850 80 T1000 110" fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Tooltip dot */}
                    <circle cx="600" cy="60" r="6" fill="#1e293b" stroke="white" strokeWidth="2" />
                    <line x1="600" y1="60" x2="600" y2="200" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                 </svg>
                 {/* Custom CSS tooltip to look like mockup */}
                 <div className="absolute px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold left-[55%] top-[10%] -translate-x-1/2 flex flex-col items-center">
                    <span className="text-[10px] text-gray-300 font-normal mb-0.5">June 2024</span>
                    $3,645
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                 </div>
                 
                 {/* Y Axis Labels */}
                 <div className="absolute top-0 left-2 h-full flex flex-col justify-between pt-4 pb-12 text-[10px] text-gray-400 pointer-events-none">
                    <span>$6000</span>
                    <span>$4000</span>
                    <span>$3000</span>
                    <span>$2000</span>
                    <span>$1000</span>
                    <span>$0</span>
                 </div>
                 
                 {/* X Axis Labels */}
                 <div className="absolute bottom-2 left-10 right-4 flex justify-between text-[10px] text-gray-400 font-medium">
                     <span>January</span>
                     <span>February</span>
                     <span>March</span>
                     <span>April</span>
                     <span>May</span>
                     <span className="text-gray-900 font-bold bg-white rounded-full px-2 py-0.5 -mt-0.5 border border-gray-100 shadow-sm z-10 relative">June</span>
                     <span>July</span>
                     <span>August</span>
                     <span>September</span>
                 </div>
              </div>
          </div>
        </div>

        {/* Right Sidebar (Calendar & Event List) */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
           {/* Calendar Component */}
           <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-800 font-semibold text-lg">Event Calendar</h3>
                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
               </div>
               <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-700">December 2024</span>
                  <div className="flex gap-1 text-blue-500">
                    <button className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
               </div>
               <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">
                 <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
               </div>
               <div className="grid grid-cols-7 text-center text-sm text-gray-700 gap-y-3 font-medium">
                 {/* Empty days */}
                 <span></span><span></span><span></span><span></span><span></span><span></span>
                 {/* Days */}
                 {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31].map(d => {
                   if (d === 12) return <div key={d} className="flex justify-center"><div className="w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md shadow-blue-500/30">{d}</div></div>;
                   if ([1, 14, 20].includes(d)) return <div key={d} className="flex justify-center relative">{d}<div className="absolute bottom-0 w-1 h-1 bg-emerald-400 rounded-full"></div></div>;
                   if (d === 31) return <div key={d} className="flex justify-center relative">{d}<div className="absolute bottom-0 w-1 h-1 bg-red-400 rounded-full"></div></div>;
                   if (d === 26) return <div key={d} className="flex justify-center relative">{d}<div className="absolute bottom-0 w-1 h-1 bg-blue-400 rounded-full"></div></div>;
                   return <div key={d} className="flex justify-center hover:text-blue-500 cursor-pointer">{d}</div>;
                 })}
                 {/* Next month days */}
                 <span className="text-gray-300">1</span>
                 <span className="text-gray-300">2</span>
                 <span className="text-gray-300">3</span>
                 <span className="text-gray-300">4</span>
               </div>
           </div>

           {/* Event List */}
           <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100 flex-1 overflow-y-auto min-h-[300px]">
              {[
                { n: 'ZenMusic Festival', d: '14 - 15 December, 2024 • 07:30 PM' },
                { n: 'Inovotech Expo 2024', d: 'December 20, 2024 • 07:30 PM' },
                { n: 'Christmas Event', d: 'December 26, 2024 • 08:00 PM' },
                { n: 'New Year Festival', d: 'December 31, 2024 • 08:00 PM' }
              ].map((ev, i) => (
                <div key={i} className="flex items-center justify-between p-4 group cursor-pointer hover:bg-gray-50 rounded-2xl transition-colors mb-1">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20M12 2v20M5 5l14 14M19 5L5 19"/></svg>
                      </div>
                      <div>
                         <div className="text-sm font-semibold text-gray-800">{ev.n}</div>
                         <div className="text-[11px] text-gray-400 mt-0.5">{ev.d}</div>
                      </div>
                   </div>
                   <svg className="text-gray-300 transform group-hover:translate-x-1 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
