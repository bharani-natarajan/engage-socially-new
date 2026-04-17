'use client';

import { useEffect, useState, useCallback } from 'react';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// -------------------------------------------------------------
// Component: Status Pill (Waiting, Done, Failed)
// Matches the "Waiting", "Done", "Failed" pills in Lordbank UI
// -------------------------------------------------------------
function StatusPill({ status }) {
  const isDone = status === 'done';
  const isFailed = status === 'error';
  const isGenerating = status === 'generating';
  
  if (isDone) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-green text-lord-green text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-lord-green" /> Done
      </span>
    );
  }
  if (isFailed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-red text-lord-red text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-lord-red" /> Failed
      </span>
    );
  }
  if (isGenerating) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-orange text-lord-orange text-xs font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-lord-orange animate-pulse" /> Replying
      </span>
    );
  }
  
  // Default "Waiting" (idle)
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-orange text-lord-orange text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-lord-orange" /> Waiting
    </span>
  );
}

function CommentRow({ item, onReplied }) {
  const [status, setStatus] = useState('idle');

  async function autoReply() {
    if (status !== 'idle') return;
    setStatus('generating');
    try {
      const aiRes = await fetch('/api/instagram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: item.text, username: item.username, postCaption: item.postCaption }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || 'AI run failed');

      const replyRes = await fetch('/api/instagram/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: item.commentId, message: aiData.suggestion }),
      });
      if (!replyRes.ok) throw new Error('Reply failed');

      setStatus('done');
      setTimeout(() => onReplied(item.commentId), 1000);
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-lord-border/60 last:border-0 cursor-pointer hover:bg-lord-border/20 px-2 transition-colors rounded-xl" onClick={autoReply}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-lord-bg overflow-hidden flex-shrink-0">
          {item.postThumb ? (
             /* eslint-disable-next-line @next/next/no-img-element */
            <img src={item.postThumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold bg-gradient-to-tr from-gray-200 to-gray-100">
               {item.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-[14px] font-semibold text-lord-text-main leading-tight">{item.username}</p>
          <p className="text-[12px] text-lord-text-muted mt-0.5 line-clamp-1 max-w-[150px]">${item.text}</p>
        </div>
      </div>
      <div>
        <StatusPill status={status} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/instagram/dashboard')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d); })
      .finally(() => setLoading(false));
  }, []);

  const removeComment = useCallback((commentId) => {
    setStats((prev) => ({
      ...prev,
      unansweredComments: prev.unansweredComments.filter((c) => c.commentId !== commentId),
    }));
  }, []);

  const unanswered = stats?.unansweredComments ?? [
    // Pre-fill dummy matching the Lordbank names for visual fidelity if no real data
    { commentId: '1', username: 'Syafanah san', text: 'Love this!', postCaption: '', timestamp: Date.now() },
    { commentId: '2', username: 'Devon Lane', text: 'Amazing work here', postCaption: '', timestamp: Date.now() },
    { commentId: '3', username: 'Marvin McKinney', text: 'How do I buy?', postCaption: '', timestamp: Date.now() },
    { commentId: '4', username: 'Eleanor Pena', text: 'Is this available?', postCaption: '', timestamp: Date.now() },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Row */}
      <div className="flex items-center justify-between mb-8 pb-2">
        <div>
          <p className="text-[13px] text-lord-text-muted font-medium mb-1">Portal &gt; <span className="text-lord-text-main">Dashboard</span></p>
          <h1 className="text-3xl font-bold tracking-tight text-lord-text-main">Good morning Administrator</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-full bg-white text-lord-text-main text-sm font-semibold border border-lord-border/80 flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <span>+</span> Add widget
          </button>
          <button className="px-5 py-2.5 rounded-full bg-white text-lord-text-main text-sm font-semibold border border-lord-border/80 flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            18 - 22 November
          </button>
          <button className="px-5 py-2.5 rounded-full bg-lord-green text-lord-card text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
             Add report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left Side Wide Content */}
        <div className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
            {/* Account Info Card (Profile) */}
            <div className="w-full lg:w-[320px] rounded-[32px] overflow-hidden relative min-h-[380px] bg-gradient-to-b from-teal-100 to-lord-bg p-6 flex flex-col justify-end">
              {/* Profile Mock Image - we use a generic placeholder representing the Chris Jonathan element */}
              <div className="absolute inset-0 bg-[#d8ebf0]" /> 
              {/* The "4+ years experience" pill */}
              <div className="absolute top-[45%] left-1/2 -translate-x-1/2 px-4 py-2 bg-[#1b1f22] text-white rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg w-max z-10">
                 {loading ? '...' : (stats?.totalPosts || '10+')} Instagram Posts <span className="text-lord-green">✦</span>
              </div>
              
              {/* Glass context bar */}
              <div className="relative z-10 w-full rounded-3xl bg-black/10 backdrop-blur-md border border-white/20 p-5 mt-auto flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
                <div>
                  <p className="text-white font-semibold text-lg leading-tight">Social Account</p>
                  <p className="text-white/80 text-[13px] mt-0.5">Connected Manager</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center cursor-pointer shadow-sm"><svg width="14" height="14" fill="none" stroke="#407088" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>
                  <div className="w-9 h-9 rounded-full bg-[#1b1f22] flex items-center justify-center cursor-pointer shadow-sm"><svg width="14" height="14" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
                </div>
              </div>
            </div>

            {/* Performance Widgets block */}
            <div className="flex flex-col gap-6">
              {/* Top Wide Widget */}
              <div className="rounded-[32px] bg-white p-6 shadow-sm flex flex-col justify-between h-[220px]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-lord-teal overflow-hidden rounded-full flex items-center justify-center">
                       <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div>
                      <div className="flex items-end gap-3">
                         <h2 className="text-4xl font-bold tracking-tight text-lord-text-main leading-none">
                            {loading ? '--' : ((stats?.totalLikes || 46) + 0.5).toFixed(1)}
                         </h2>
                         <span className="px-2 py-0.5 rounded-full bg-lord-green text-white text-[11px] font-bold mb-1">+0.5%</span>
                      </div>
                      <p className="text-[13px] text-lord-text-muted mt-1 font-medium">avg interactions / posts</p>
                    </div>
                  </div>
                  
                  {/* Nested Right blocks */}
                  <div className="flex flex-col gap-2 w-[160px]">
                     <div className="rounded-2xl bg-lord-teal p-3.5 text-white flex flex-col justify-center">
                        <div className="flex items-center justify-between w-full mb-1">
                           <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><svg width="12" height="12" fill="none" stroke="currentcolor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
                           <span className="text-[10px] font-bold bg-white text-lord-teal px-1.5 py-0.5 rounded-full flex items-center gap-0.5">+2.6% <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="12 19 12 5"/><polyline points="5 12 12 5 19 12"/></svg></span>
                        </div>
                        <p className="text-2xl font-bold mt-1">80%</p>
                        <p className="text-[11px] opacity-80 leading-none mt-1">Organic reach</p>
                     </div>
                     <div className="rounded-2xl bg-white border border-lord-border p-3 flex items-center gap-3">
                        <p className="text-xl font-bold">20%</p>
                        <p className="text-[11px] text-lord-text-muted font-medium leading-tight">Direct<br/>reach</p>
                     </div>
                  </div>
                </div>
                
                {/* Dots Graph mockup */}
                <div className="flex gap-1.5 items-end h-12 px-2 mt-4 ml-2">
                   {[2,1,3,2,4,3,2,1,1,3,2,1,0,3,4,3,2,2].map((v, i) => (
                      <div key={i} className="flex flex-col gap-1 w-2.5">
                         {[...Array(5)].map((_, j) => (
                            <div key={j} className={`w-2.5 h-2.5 rounded-full ${j >= 5 - v ? 'bg-lord-teal' : 'bg-transparent'}`} />
                         ))}
                      </div>
                   ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
             {/* Small Bottom Left Widget: Track Audience */}
             <div className="bg-white rounded-[32px] shadow-sm p-6 relative">
                 <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-lord-bg hover:bg-gray-200 text-gray-500"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
                 <p className="text-xs text-lord-text-muted uppercase font-semibold tracking-wide">Total followers</p>
                 <h3 className="text-lg font-bold text-lord-text-main mt-0.5">Track your audience</h3>

                 <div className="mt-8 flex justify-center scale-110 relative">
                    <svg width="140" height="70" viewBox="0 0 140 70">
                       <path d="M10,70 A60,60 0 0,1 130,70" fill="none" stroke="#efefef" strokeWidth="20" strokeLinecap="butt"/>
                       <path d="M10,70 A60,60 0 0,1 60,18" fill="none" stroke="#83d395" strokeWidth="20" strokeLinecap="butt"/>
                       <path d="M62,17 A60,60 0 0,1 115,35" fill="none" stroke="#407088" strokeWidth="20" strokeLinecap="butt"/>
                    </svg>
                    <div className="absolute bottom-0 text-center">
                       <p className="text-[28px] font-bold text-lord-text-main leading-tight">120K</p>
                       <p className="text-[10px] uppercase font-bold text-lord-text-muted">Total members</p>
                    </div>
                 </div>

                 <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between text-[13px] font-semibold text-lord-text-main">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-lord-green"></div> Organic</div>
                       <span>48 members</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-semibold text-lord-text-main">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-lord-teal"></div> Referral</div>
                       <span>27 members</span>
                    </div>
                    <div className="flex items-center justify-between text-[13px] font-semibold text-lord-text-muted">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-200"></div> Paid ads</div>
                       <span>18 members</span>
                    </div>
                 </div>
             </div>
             
             {/* Small Bottom Right Widget: Talent recruitment */}
             <div className="bg-white rounded-[32px] shadow-sm p-6 relative">
                 <button className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-lord-bg hover:bg-gray-200 text-gray-500"><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
                 <p className="text-xs text-lord-text-muted uppercase font-semibold tracking-wide">Engagement statistics</p>
                 <h3 className="text-lg font-bold text-lord-text-main mt-0.5">Engagement growth</h3>
                 
                 <div className="flex gap-3 mt-6">
                    <div className="w-[80px] h-[80px] rounded-[24px] bg-[#fdf5f2] overflow-hidden">
                       <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-400 font-bold">M</div>
                    </div>
                    <div className="w-[80px] h-[80px] rounded-[24px] bg-[#f0f4ec] overflow-hidden">
                       <div className="w-full h-full bg-green-50 flex items-center justify-center text-green-400 font-bold">D</div>
                    </div>
                    <div className="w-[80px] h-[80px] rounded-[24px] bg-lord-teal text-white flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-lord-teal-dark transition-colors">
                       <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                       <span className="text-[10px] font-medium">Join call</span>
                    </div>
                 </div>

                 <div className="mt-8">
                    <div className="flex items-center justify-between text-[11px] font-bold text-lord-text-main mb-3">
                       <span>120 Interactions</span>
                       <span>80 Interactions</span>
                    </div>
                    <div className="flex gap-1.5 h-10 items-end">
                       {[...Array(18)].map((_, i) => (
                           <div key={i} className={`flex-1 rounded-sm ${i < 12 ? 'bg-lord-green' : 'bg-gray-200'}`} style={{ height: `${40 + Math.random()*60}%`}} />
                       ))}
                    </div>
                    <div className="flex gap-4 items-center justify-center mt-3">
                       <div className="flex items-center gap-1.5 text-[11px] font-semibold text-lord-text-muted"><div className="w-2 h-2 rounded-full bg-lord-green" /> Matched</div>
                       <div className="flex items-center gap-1.5 text-[11px] font-semibold text-lord-text-muted"><div className="w-2 h-2 rounded-full bg-gray-200" /> Not match</div>
                    </div>
                 </div>
             </div>
          </div>
        </div>

        {/* Right Side Column (Salaries and incentive map -> Unanswered Comments) */}
        <div className="bg-white rounded-[32px] p-6 shadow-sm flex flex-col h-full sticky top-8 border-none">
          <p className="text-xs text-lord-text-muted font-semibold tracking-wide">Action needed</p>
          <h2 className="text-[22px] font-bold text-lord-text-main mt-0.5 mb-6">Review Interactions</h2>
          
          <div className="flex flex-col flex-1">
            <div className="mb-8">
               {unanswered.map((u, i) => (
                  <CommentRow key={u.commentId || i} item={u} onReplied={removeComment} />
               ))}
               {unanswered.length === 0 && (
                 <p className="text-sm text-lord-text-muted py-4">All caught up!</p>
               )}
            </div>

            {/* Inner Dark Widget Matching "Basic salary" module */}
            <div className="mt-auto bg-lord-teal rounded-[32px] text-white p-6 shadow-lg shadow-lord-teal/20 relative">
               <div className="absolute top-2right-2 w-16 h-16 bg-white/5 rounded-full blur-xl pointer-events-none" />
               <div className="w-full bg-lord-green rounded-full px-4 py-3 flex items-center justify-between text-[13px] font-bold text-lord-teal mb-4 cursor-pointer">
                  <span>Auto respond block</span>
                  <span>$2,040</span>
               </div>
               
               <div className="w-full bg-white rounded-full px-4 py-3 flex items-center justify-between text-[13px] font-bold text-lord-text-main mb-6 cursor-pointer">
                  <span>Perform limit</span>
                  <span>$300</span>
               </div>

               <div className="flex justify-between items-end">
                  <div>
                     <p className="text-[13px] text-white/70 mb-1 font-semibold">Total comments handled</p>
                     <p className="text-3xl font-bold">{loading ? '...' : (stats?.totalComments || 2540).toLocaleString()}</p>
                     
                     <div className="flex gap-2 mt-4 relative">
                        <button className="w-9 h-9 rounded-full bg-white text-lord-teal flex items-center justify-center font-bold text-sm shadow-sm"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></button>
                        <button className="w-9 h-9 rounded-full bg-lord-green text-lord-teal flex items-center justify-center font-bold text-sm shadow-sm"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>
                        <div className="absolute -top-1 right-8 w-4 h-4 rounded-full bg-[#1b1f22] border-[1.5px] border-lord-teal flex items-center justify-center text-[9px] font-bold text-white leading-none">2</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[13px] text-white/70 mb-1 font-semibold">Interaction rate</p>
                     <p className="text-3xl font-bold tracking-tight">100%</p>
                  </div>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
