'use client';

// -------------------------------------------------------------
// Component: Status Pill (Waiting, Done, Failed)
// Matches the "Waiting", "Done", "Failed" pills in Lordbank UI
// -------------------------------------------------------------
function StatusPill({ status }) {
  const isDone = status === 'done';
  const isFailed = status === 'failed';
  
  if (isDone) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-green text-lord-green text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-lord-green" /> Done
      </span>
    );
  }
  if (isFailed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-red text-lord-red text-[11px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-lord-red" /> Failed
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-orange text-lord-orange text-[11px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-lord-orange" /> Waiting
    </span>
  );
}

function EmployeeRow({ name, amount, time, status, initial }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-lord-border/60 last:border-0 hover:bg-lord-border/20 px-2 transition-colors rounded-xl cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-gray-400">
           {/* Fallback avatar */}
           {initial}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-lord-text-main leading-tight">{name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-[11px]">
             <span className="text-lord-text-main font-bold">{amount}</span>
             <span className="text-lord-text-muted">{time}</span>
          </div>
        </div>
      </div>
      <div>
        <StatusPill status={status} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const employees = [
    { name: 'Syafanah san', amount: '$2.540.00', time: 'Today', status: 'waiting', initial: 'S' },
    { name: 'Devon Lane', amount: '$2.540.00', time: 'Today', status: 'done', initial: 'D' },
    { name: 'Marvin McKinney', amount: '$2.540.00', time: 'Yesterday', status: 'done', initial: 'M' },
    { name: 'Devon Lane', amount: '$2.540.00', time: 'Yesterday', status: 'done', initial: 'D' },
    { name: 'Eleanor Pena', amount: '$2.540.00', time: 'Yesterday', status: 'failed', initial: 'E' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Row */}
      <div className="flex items-center justify-between mb-8 pb-2">
        <div>
          <p className="text-[13px] text-lord-text-muted font-medium mb-1">Portal &gt; <span className="text-lord-text-main">Dashboard</span></p>
          <h1 className="text-3xl font-bold tracking-tight text-lord-text-main">Good morning Jhon</h1>
        </div>
        
        <div className="flex items-center gap-3 hidden sm:flex">
          <button className="px-4 py-2.5 rounded-full bg-white text-lord-text-main text-[13px] font-bold border border-lord-border flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <span className="text-gray-400 text-lg leading-none mb-0.5">+</span> Add widget
          </button>
          <button className="px-4 py-2.5 rounded-full bg-white text-lord-text-main text-[13px] font-bold border border-lord-border flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            18 - 22 November
          </button>
          <button className="px-5 py-2.5 rounded-full bg-lord-green text-lord-card text-[13px] font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5">
             <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
             Add report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-6 items-start">
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="flex flex-col gap-6">
            {/* Account Info Card (Profile) */}
            <div className="w-full rounded-[32px] overflow-hidden relative h-[420px] bg-gradient-to-b from-[#d9ebed] to-[#c2e2e8] p-5 flex flex-col justify-end shadow-sm">
              <div className="absolute inset-0 flex justify-center items-end opacity-90 mix-blend-multiply pointer-events-none">
                 <div className="w-[80%] h-[90%] bg-gray-300 rounded-[80px]" /> 
              </div>
              
              {/* Profile Mock Image - placeholder silhouette for Chris */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center opacity-80" /> 
              
              {/* The "4+ years experience" pill */}
              <div className="absolute top-[50%] left-1/2 -translate-x-1/2 px-4 py-2 bg-[#171a1c] text-white rounded-full text-[11px] font-bold flex items-center gap-2 shadow-lg w-max z-10 whitespace-nowrap">
                 4+ years experience <span className="text-lord-green">✦✦</span>
              </div>
              
              {/* Glass context bar */}
              <div className="relative z-10 w-full rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 p-4 mt-auto flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-white font-bold text-[15px] leading-tight">Chris Jonathan</p>
                  <p className="text-white/90 text-[11px] mt-0.5">General manager</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm"><svg width="14" height="14" fill="none" stroke="#171a1c" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                  <div className="w-9 h-9 rounded-full bg-[#171a1c] flex items-center justify-center cursor-pointer shadow-sm"><svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                </div>
              </div>
            </div>

            {/* Average Work Time */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm relative">
                <p className="text-[12px] text-lord-text-muted font-semibold mb-1">Average work time</p>
                <div className="flex items-center justify-between">
                   <h3 className="text-2xl font-bold text-lord-text-main leading-none">46 hours</h3>
                   <span className="px-2 py-0.5 rounded-full bg-lord-green-light text-lord-green-dark text-[11px] font-bold">+0.5% ↑</span>
                </div>
                
                <div className="h-[120px] w-full mt-6 relative flex flex-col justify-between pt-2">
                   {/* Y-axis labels */}
                   <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] font-bold text-gray-400">
                      <span>10 H</span>
                      <span>8 H</span>
                      <span>6 H</span>
                      <span>4 H</span>
                   </div>
                   
                   {/* Grid lines */}
                   <div className="absolute left-8 right-0 top-1 bottom-6 flex flex-col justify-between">
                      <div className="border-b border-gray-100 border-dashed w-full"/>
                      <div className="border-b border-gray-100 border-dashed w-full"/>
                      <div className="border-b border-gray-100 border-dashed w-full"/>
                      <div className="border-b border-gray-100 border-dashed w-full"/>
                   </div>
                   
                   {/* Line Graph Mock */}
                   <div className="absolute left-6 right-0 top-0 bottom-6 flex items-center">
                       <svg width="100%" height="100%" viewBox="0 0 200 80" preserveAspectRatio="none" className="overflow-visible">
                          <polyline points="0,50 30,35 70,60 110,25 150,55 200,15" fill="none" stroke="#87afc2" strokeWidth="3" strokeLinejoin="round" />
                          <circle cx="110" cy="25" r="5" fill="#f0f6f8" stroke="#407088" strokeWidth="2.5" />
                       </svg>
                       <div className="absolute left-[55%] bottom-[-2] -translate-x-1/2 bg-[#171a1c] text-white text-[9px] font-bold px-2 py-1 rounded-full whitespace-nowrap">8 Hours</div>
                   </div>
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                   <p className="text-[10px] font-medium text-gray-400">Total work hours include extra hours</p>
                </div>
            </div>
        </div>

        {/* ================= MIDDLE COLUMN ================= */}
        <div className="flex flex-col gap-6">
          
          {/* Top Wide Widget: 46,5 */}
          <div className="rounded-[32px] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[240px]">
            <div className="flex items-start justify-between">
              
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-lord-teal overflow-hidden rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                   <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M2 12h20"/><path d="M12 2A15.3 15.3 0 0 1 16 12 15.3 15.3 0 0 1 12 22 15.3 15.3 0 0 1 8 12 15.3 15.3 0 0 1 12 2z"/></svg>
                </div>
                <div>
                  <div className="flex items-center gap-3">
                     <h2 className="text-[44px] font-bold tracking-tight text-lord-text-main leading-none">
                        46,5
                     </h2>
                     <span className="px-2.5 py-0.5 rounded-full bg-lord-green text-lord-card text-[11px] font-bold">+0.5%</span>
                  </div>
                  <p className="text-[12px] text-lord-text-muted mt-2 font-medium">avg hours / weeks</p>
                </div>
              </div>
              
              {/* Nested Right blocks */}
              <div className="flex flex-col gap-2 w-[160px] flex-shrink-0">
                 <div className="rounded-[20px] bg-lord-teal p-3.5 text-white flex flex-col justify-center">
                    <div className="flex items-center justify-between w-full mb-1">
                       <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><svg width="12" height="12" fill="none" stroke="currentcolor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                       <span className="text-[10px] font-bold bg-white text-lord-teal px-2 py-0.5 rounded-full flex items-center gap-1">+2.6% ↓</span>
                    </div>
                    <div className="flex items-end gap-2 mt-1">
                       <p className="text-2xl font-bold">80%</p>
                       <p className="text-[10px] opacity-80 leading-tight pb-1">Onsite<br/>team</p>
                    </div>
                 </div>
                 <div className="rounded-[20px] bg-white border-2 border-lord-border p-3 flex items-center justify-between">
                    <div className="w-6 h-6 rounded-full border border-lord-border flex items-center justify-center"><svg width="12" height="12" fill="none" stroke="#407088" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2A15.3 15.3 0 0 1 16 12 15.3 15.3 0 0 1 12 22 15.3 15.3 0 0 1 8 12 15.3 15.3 0 0 1 12 2z"/></svg></div>
                    <span className="text-[10px] font-bold text-lord-green flex items-center gap-1">+2.6% ↑</span>
                    <div className="flex items-end gap-2 pr-1">
                       <p className="text-xl font-bold text-lord-text-main">20%</p>
                    </div>
                 </div>
              </div>
            </div>
            
            {/* Dots Graph */}
            <div className="flex gap-1.5 items-end h-16 mt-6 ml-2">
               {[1,2,1,0,3,4,2,3,2,1,1,2,1,1,0,5,3,2,1,1,4,2,1,0].map((v, i) => (
                  <div key={i} className="flex flex-col gap-[3px] w-2.5">
                     {[...Array(5)].map((_, j) => (
                        <div key={j} className={`w-[9px] h-[9px] rounded-full ${j >= 5 - v ? 'bg-lord-teal' : 'bg-transparent'}`} />
                     ))}
                  </div>
               ))}
            </div>
            
            {/* Dot Legend */}
            <div className="flex items-center gap-3 mt-3 ml-2">
               <span className="text-[10px] font-semibold text-lord-text-main">2 Hours</span>
               <div className="flex gap-1">
                  <div className="w-3 h-3 rounded bg-gray-200" />
                  <div className="w-3 h-3 rounded bg-lord-teal/40" />
                  <div className="w-3 h-3 rounded bg-lord-teal/70" />
                  <div className="w-3 h-3 rounded bg-lord-teal" />
               </div>
               <span className="text-[10px] font-semibold text-lord-text-main">10 Hours</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Small Bottom Left Widget: Track your team */}
             <div className="bg-white rounded-[32px] shadow-sm p-6 relative">
                 <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full border border-lord-border text-lord-text-main hover:bg-gray-50"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
                 <p className="text-[11px] text-lord-text-muted font-medium mb-1">Total employee</p>
                 <h3 className="text-xl font-bold text-lord-text-main">Track your team</h3>

                 <div className="mt-8 mb-4 flex justify-center relative">
                    <svg width="180" height="90" viewBox="0 0 180 90">
                       <path d="M15,80 A65,65 0 0,1 165,80" fill="none" stroke="#f0f2f5" strokeWidth="26" strokeLinecap="butt"/>
                       <path d="M15,80 A65,65 0 0,1 85,18" fill="none" stroke="#83d395" strokeWidth="26" strokeLinecap="butt"/>
                       <path d="M88,17 A65,65 0 0,1 145,40" fill="none" stroke="#407088" strokeWidth="26" strokeLinecap="butt"/>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-end" style={{ bottom: '-6px', left: 0, right: 0 }}>
                       <p className="text-[34px] font-bold text-lord-text-main leading-tight tracking-tight mb-0">120</p>
                       <p className="text-[10px] font-semibold text-lord-text-muted pb-1">Total members</p>
                    </div>
                 </div>

                 <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-[12px] font-medium text-lord-text-main">
                       <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-lord-green"></div> Designer</div>
                       <span className="font-bold">48 members</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-medium text-lord-text-main">
                       <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-lord-teal"></div> Developer</div>
                       <span className="font-bold">27 members</span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] font-medium text-lord-text-muted">
                       <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-gray-200"></div> Project manager</div>
                       <span className="font-bold text-lord-text-main">18 members</span>
                    </div>
                 </div>
             </div>
             
             {/* Small Bottom Right Widget: Talent recruitment */}
             <div className="bg-white rounded-[32px] shadow-sm p-6 relative flex flex-col">
                 <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full border border-lord-border text-lord-text-main hover:bg-gray-50"><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
                 <p className="text-[11px] text-lord-text-muted font-medium mb-1">Hiring statistics</p>
                 <h3 className="text-xl font-bold text-lord-text-main">Talent recruitment</h3>
                 
                 <div className="flex gap-2.5 mt-5">
                    <div className="w-[66px] h-[72px] rounded-[18px] bg-[#f8e5db] overflow-hidden relative">
                       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120')] bg-cover bg-center" />
                    </div>
                    <div className="w-[66px] h-[72px] rounded-[18px] bg-[#ebf4e7] overflow-hidden relative">
                       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531123897727-8f129e120ace?w=120')] bg-cover bg-center" />
                    </div>
                    <div className="w-[66px] h-[72px] rounded-[18px] bg-lord-teal text-white flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-lord-teal-dark transition-colors">
                       <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                       <span className="text-[9px] font-medium mt-0.5">Join call</span>
                    </div>
                 </div>

                 <div className="mt-auto pt-6">
                    <div className="flex items-center justify-between text-[11px] font-bold text-lord-text-main mb-3">
                       <span>120 Talent</span>
                       <span>80 Talent</span>
                    </div>
                    <div className="flex gap-1.5 h-12 items-end">
                       {[...Array(18)].map((_, i) => (
                           <div key={i} className={`flex-1 rounded-full ${i < 13 ? 'bg-lord-green' : 'bg-gray-200'}`} style={{ height: `${30 + Math.random()*70}%`}} />
                       ))}
                    </div>
                    <div className="flex gap-5 items-center justify-center mt-4">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-lord-text-muted"><div className="w-2 h-2 rounded-full bg-lord-green" /> Matched</div>
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-lord-text-muted"><div className="w-2 h-2 rounded-full bg-gray-200" /> Not match</div>
                    </div>
                 </div>
             </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="w-full">
           <p className="text-[12px] text-lord-text-muted font-medium mb-1">Payout monthly</p>
           <h2 className="text-[24px] font-bold text-lord-text-main mb-5">Salaries and insentive</h2>
           
           <div className="flex flex-col gap-1 mb-6">
              {employees.map((emp, i) => (
                 <EmployeeRow key={i} name={emp.name} amount={emp.amount} time={emp.time} status={emp.status} initial={emp.initial} />
              ))}
           </div>

           {/* Inner Dark Widget Matching "Basic salary" module */}
           <div className="bg-lord-teal rounded-[32px] text-white p-6 shadow-lg shadow-lord-teal/20 relative">
              <div className="absolute top-4 right-4 w-20 h-20 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-full bg-lord-green rounded-full px-5 py-3.5 flex items-center justify-between text-[13px] font-bold text-white mb-3 cursor-pointer shadow-sm shadow-black/5">
                 <span>Basic salary</span>
                 <span>$2.040</span>
              </div>
              
              <div className="w-full bg-white rounded-full px-5 py-3.5 flex items-center justify-between text-[13px] font-bold text-lord-text-main mb-6 cursor-pointer shadow-sm shadow-black/5">
                 <span>Perform</span>
                 <span>$300</span>
              </div>

              <div className="flex items-center justify-between px-5 mb-8 text-[12px] font-bold">
                 <span className="text-white/70">Gift</span>
                 <span>$200</span>
              </div>

              <div className="flex justify-between items-end relative z-10">
                 <div>
                    <div className="flex gap-2">
                       <button className="w-10 h-10 rounded-full bg-white text-lord-teal flex items-center justify-center shadow-lg"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></button>
                       <div className="relative">
                          <button className="w-10 h-10 rounded-full bg-lord-green text-white flex items-center justify-center shadow-lg"><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></button>
                          <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#1b1f22] border-2 border-lord-teal flex items-center justify-center text-[9px] font-bold text-white">2</div>
                       </div>
                    </div>
                 </div>
                 
                 <div className="text-right">
                    <p className="text-[12px] text-white font-medium mb-0.5">Payment</p>
                    <p className="text-2xl font-bold mb-4">100%</p>
                    
                    <p className="text-[12px] text-white font-medium mb-1">Take home pay</p>
                    <p className="text-[26px] tracking-tight font-bold">$2.540.00</p>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
