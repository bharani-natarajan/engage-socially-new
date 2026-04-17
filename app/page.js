'use client';

import { useEffect, useState } from 'react';

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

function CommentRow({ comment, onReplied }) {
  const [status, setStatus] = useState('idle'); // idle | replying | done | error

  async function autoReply() {
    if (status !== 'idle') return;
    setStatus('replying');
    try {
      const aiRes = await fetch('/api/instagram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: comment.text, username: comment.username, postCaption: comment.postCaption }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error);
      const replyRes = await fetch('/api/instagram/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.commentId, message: aiData.suggestion }),
      });
      if (!replyRes.ok) throw new Error('Reply failed');
      setStatus('done');
      setTimeout(() => onReplied(comment.commentId), 1200);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center justify-between py-3.5 border-b border-lord-border/60 last:border-0 hover:bg-lord-border/20 px-2 transition-colors rounded-xl">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-gray-400">
          {comment.username.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-lord-text-main leading-tight">@{comment.username}</p>
          <p className="text-[11px] text-lord-text-muted truncate max-w-[160px] mt-0.5">{comment.text}</p>
        </div>
      </div>
      <div className="flex-shrink-0 ml-2">
        {status === 'done' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-green text-lord-green text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-lord-green" /> Done
          </span>
        ) : status === 'error' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-red text-lord-red text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-lord-red" /> Failed
          </span>
        ) : (
          <button
            onClick={autoReply}
            disabled={status === 'replying'}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-green text-lord-green text-[11px] font-bold hover:bg-lord-green hover:text-white transition-colors disabled:opacity-50"
          >
            {status === 'replying' ? (
              <><svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Replying…</>
            ) : (
              <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Auto Reply</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [latestPost, setLatestPost] = useState(null);
  const [topComments, setTopComments] = useState([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [repliedCount, setRepliedCount] = useState(0);
  const [unansweredCount, setUnansweredCount] = useState(0);
  const [checkedTotal, setCheckedTotal] = useState(0);
  const [last10, setLast10] = useState([]);
  const [avgCommentsPerPost, setAvgCommentsPerPost] = useState(0);
  const [uniqueCommenters, setUniqueCommenters] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [replyingAll, setReplyingAll] = useState(false);
  const [replyAllDone, setReplyAllDone] = useState(0);

  useEffect(() => {
    fetch('/api/instagram/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.latestPostPreview) setLatestPost(d.latestPostPreview);
        setTopComments((d.unansweredComments ?? []).slice(0, 5));
        setTotalLikes(d.totalLikes ?? 0);
        setTotalComments(d.totalComments ?? 0);
        setRepliedCount(d.repliedCount ?? 0);
        setUnansweredCount(d.unansweredCount ?? 0);
        setCheckedTotal(d.checkedTotal ?? 0);
        setLast10(d.last10 ?? []);
        setAvgCommentsPerPost(d.avgCommentsPerPost ?? 0);
        setUniqueCommenters(d.uniqueCommenters ?? 0);
      })
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, []);

  function removeComment(commentId) {
    setTopComments((prev) => prev.filter((c) => c.commentId !== commentId));
  }

  async function replyToAll() {
    if (!topComments.length || replyingAll) return;
    setReplyingAll(true);
    setReplyAllDone(0);
    for (const c of [...topComments]) {
      try {
        const aiRes = await fetch('/api/instagram/ai-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentText: c.text, username: c.username, postCaption: c.postCaption }),
        });
        const aiData = await aiRes.json();
        if (!aiRes.ok) continue;
        const replyRes = await fetch('/api/instagram/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId: c.commentId, message: aiData.suggestion }),
        });
        if (replyRes.ok) { setReplyAllDone((n) => n + 1); removeComment(c.commentId); }
      } catch { /* continue */ }
    }
    setReplyingAll(false);
  }

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
            {/* Latest Post Card */}
            <a
              href={latestPost?.permalink ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-[32px] overflow-hidden relative h-[420px] bg-gray-100 flex flex-col justify-end shadow-sm block"
            >
              {/* Latest Instagram post image */}
              {latestPost?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={latestPost.image} alt="Latest post" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}

              {/* Glass stats bar */}
              <div className="relative z-10 w-full rounded-3xl bg-white/20 backdrop-blur-md border border-white/30 p-4 mt-auto flex items-center justify-around shadow-sm">
                <div className="flex items-center gap-2 text-white">
                  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  <span className="font-bold text-[15px]">{latestPost ? latestPost.likes.toLocaleString() : '—'}</span>
                </div>
                <div className="w-px h-6 bg-white/30" />
                <div className="flex items-center gap-2 text-white">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span className="font-bold text-[15px]">{latestPost ? latestPost.comments.toLocaleString() : '—'}</span>
                </div>
              </div>
            </a>

            {/* Average Work Time */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm relative">
                <p className="text-[12px] text-lord-text-muted font-semibold mb-1">Avg comments / post</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-lord-text-main leading-none">
                    {commentsLoading ? <span className="inline-block w-16 h-7 bg-gray-100 rounded-xl animate-pulse" /> : avgCommentsPerPost}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-lord-green-light text-lord-green-dark text-[11px] font-bold">
                    {last10.length} posts
                  </span>
                </div>

                {commentsLoading || last10.length === 0 ? (
                  <div className="h-[130px] mt-4 flex items-center justify-center text-[11px] text-gray-300">
                    {commentsLoading ? 'Loading…' : 'No data'}
                  </div>
                ) : (() => {
                  const vals = last10.map((p) => p.comments);
                  const max = Math.max(...vals, 1);
                  const barW = 14;
                  const gap = 6;
                  const chartH = 80;
                  const labelH = 16;
                  const totalW = vals.length * (barW + gap) - gap;

                  return (
                    <div className="mt-4 overflow-hidden">
                      <svg width="100%" viewBox={`0 0 ${totalW} ${chartH + labelH}`} preserveAspectRatio="xMidYMax meet">
                        {vals.map((v, i) => {
                          const bh = Math.max(3, (v / max) * chartH);
                          const x = i * (barW + gap);
                          const y = chartH - bh;
                          const isMax = v === max;
                          return (
                            <g key={i}>
                              <rect x={x} y={y} width={barW} height={bh} rx="4" fill={isMax ? '#407088' : '#c5dce8'} />
                              <text
                                x={x + barW / 2}
                                y={y - 3}
                                textAnchor="middle"
                                fontSize="7"
                                fontWeight={isMax ? '700' : '500'}
                                fill={isMax ? '#407088' : '#9ca3af'}
                              >{v}</text>
                              <text x={x + barW / 2} y={chartH + labelH - 2} textAnchor="middle" fontSize="7" fill="#9ca3af">
                                {i + 1}
                              </text>
                            </g>
                          );
                        })}
                        {/* x-axis line */}
                        <line x1="0" y1={chartH} x2={totalW} y2={chartH} stroke="#e5e7eb" strokeWidth="1" />
                      </svg>
                      <div className="flex items-center justify-between mt-1 text-[9px] text-gray-400 font-medium">
                        <span>Post 1 (latest)</span>
                        <span>Post {last10.length}</span>
                      </div>
                    </div>
                  );
                })()}
            </div>
        </div>

        {/* ================= MIDDLE COLUMN ================= */}
        <div className="flex flex-col gap-6">
          
          {/* Top Wide Widget: Likes & Comments */}
          <div className="rounded-[32px] bg-white p-6 shadow-sm flex flex-col justify-between min-h-[240px]">
            <div className="flex items-start justify-between">

              {/* Total Likes */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-red-100 overflow-hidden rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg width="18" height="18" fill="#ef4444" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <div>
                  <h2 className="text-[44px] font-bold tracking-tight text-lord-text-main leading-none">
                    {commentsLoading ? <span className="inline-block w-24 h-10 bg-gray-100 rounded-xl animate-pulse" /> : totalLikes.toLocaleString()}
                  </h2>
                  <p className="text-[12px] text-lord-text-muted mt-2 font-medium">Total likes</p>
                </div>
              </div>

              {/* Total Comments — same style as likes */}
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-50 overflow-hidden rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <svg width="18" height="18" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <h2 className="text-[44px] font-bold tracking-tight text-lord-text-main leading-none">
                    {commentsLoading ? <span className="inline-block w-24 h-10 bg-gray-100 rounded-xl animate-pulse" /> : totalComments.toLocaleString()}
                  </h2>
                  <p className="text-[12px] text-lord-text-muted mt-2 font-medium">Total comments</p>
                </div>
              </div>

              {/* Replied / Not replied mini-blocks */}
              <div className="flex flex-col gap-2 w-[160px] flex-shrink-0">
                {/* Replied */}
                <div className="rounded-[20px] bg-lord-teal p-3.5 text-white flex flex-col justify-center">
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-[10px] font-bold bg-white text-lord-teal px-2 py-0.5 rounded-full">Replied</span>
                  </div>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-2xl font-bold">
                      {commentsLoading ? '…' : checkedTotal === 0 ? '0%' : `${Math.round((repliedCount / checkedTotal) * 100)}%`}
                    </p>
                    <p className="text-[10px] opacity-80 leading-tight pb-1">{commentsLoading ? '' : `${repliedCount} of ${checkedTotal}`}</p>
                  </div>
                </div>
                {/* Not replied */}
                <div className="rounded-[20px] bg-white border-2 border-lord-border p-3.5 flex flex-col justify-center">
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="w-6 h-6 rounded-full bg-lord-orange/10 flex items-center justify-center">
                      <svg width="12" height="12" fill="none" stroke="#f6a23c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <span className="text-[10px] font-bold text-lord-orange">Pending</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-xl font-bold text-lord-text-main">
                      {commentsLoading ? '…' : checkedTotal === 0 ? '0%' : `${Math.round((unansweredCount / checkedTotal) * 100)}%`}
                    </p>
                    <p className="text-[11px] text-lord-text-muted pb-0.5">{commentsLoading ? '' : `${unansweredCount} of ${checkedTotal}`}</p>
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
             {/* Commenters breakdown widget */}
             <div className="bg-white rounded-[32px] shadow-sm p-6 relative">
                 <p className="text-[11px] text-lord-text-muted font-medium mb-1">Instagram</p>
                 <h3 className="text-xl font-bold text-lord-text-main">Commenters</h3>

                 {(() => {
                   const total = totalComments;
                   const unique = uniqueCommenters;
                   const repeat = Math.max(0, total - unique);
                   // Geometry: cx=90, cy=90, r=62, strokeWidth=22
                   // viewBox="0 0 180 104" — top of arc stroke: 90-62-11=17 ✓
                   const cx = 90, cy = 90, r = 62, sw = 22;
                   const startX = cx - r, startY = cy;   // (28, 90)
                   const endX = cx + r, endY = cy;       // (152, 90)

                   function pt(pct) {
                     const angle = (1 - pct) * Math.PI;
                     return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
                   }

                   const p1 = total > 0 ? unique / total : 0;
                   const [x1, y1] = pt(p1);
                   const laf1 = p1 > 0.5 ? 1 : 0;
                   const laf2 = (1 - p1) > 0.5 ? 1 : 0;

                   return (
                     <>
                       <div className="mt-4 flex justify-center relative" style={{ height: 110 }}>
                         <svg width="180" height="104" viewBox="0 0 180 104" overflow="visible">
                           {/* Background arc */}
                           <path
                             d={`M${startX},${startY} A${r},${r} 0 0,1 ${endX},${endY}`}
                             fill="none" stroke="#f0f2f5" strokeWidth={sw} strokeLinecap="butt"
                           />
                           {!commentsLoading && total > 0 && (<>
                             {/* Unique — green */}
                             {p1 > 0.01 && (
                               <path
                                 d={`M${startX},${startY} A${r},${r} 0 ${laf1},1 ${x1.toFixed(2)},${y1.toFixed(2)}`}
                                 fill="none" stroke="#83d395" strokeWidth={sw} strokeLinecap="butt"
                               />
                             )}
                             {/* Repeat — teal */}
                             {p1 < 0.99 && (
                               <path
                                 d={`M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${laf2},1 ${endX},${endY}`}
                                 fill="none" stroke="#407088" strokeWidth={sw} strokeLinecap="butt"
                               />
                             )}
                           </>)}
                           {/* Center label in SVG so it's always perfectly aligned */}
                           <text x={cx} y={cy - 4} textAnchor="middle" fontSize="28" fontWeight="700" fill="#1a1d1f">
                             {commentsLoading ? '…' : total}
                           </text>
                           <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fontWeight="600" fill="#6f767e">
                             Total comments
                           </text>
                         </svg>
                       </div>

                       <div className="mt-4 space-y-3">
                         <div className="flex items-center justify-between text-[12px] font-medium text-lord-text-main">
                           <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-lord-green" /> Unique commenters</div>
                           <span className="font-bold">{commentsLoading ? '…' : unique.toLocaleString()}</span>
                         </div>
                         <div className="flex items-center justify-between text-[12px] font-medium text-lord-text-main">
                           <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-lord-teal" /> Repeat commenters</div>
                           <span className="font-bold">{commentsLoading ? '…' : repeat.toLocaleString()}</span>
                         </div>
                         <div className="flex items-center justify-between text-[12px] font-medium text-lord-text-muted">
                           <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full bg-gray-200" /> Unique %</div>
                           <span className="font-bold text-lord-text-main">
                             {commentsLoading || total === 0 ? '—' : `${Math.round((unique / total) * 100)}%`}
                           </span>
                         </div>
                       </div>
                     </>
                   );
                 })()}
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
           <div className="flex items-start justify-between mb-5">
             <div>
               <p className="text-[12px] text-lord-text-muted font-medium mb-1">Instagram</p>
               <h2 className="text-[24px] font-bold text-lord-text-main">Unanswered comments</h2>
             </div>
             {topComments.length > 0 && (
               <button
                 onClick={replyToAll}
                 disabled={replyingAll}
                 className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-full bg-lord-green text-white text-[12px] font-bold shadow-sm hover:bg-lord-green-dark disabled:opacity-50 transition-colors"
               >
                 {replyingAll ? (
                   <><svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>{replyAllDone}/{topComments.length + replyAllDone}…</>
                 ) : (
                   <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Reply All</>
                 )}
               </button>
             )}
           </div>

           <div className="flex flex-col gap-1">
             {commentsLoading ? (
               [...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center gap-3 py-3.5 px-2">
                   <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                   <div className="flex-1 space-y-1.5">
                     <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
                     <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                   </div>
                 </div>
               ))
             ) : topComments.length === 0 ? (
               <div className="py-10 text-center text-lord-text-muted text-[13px]">All caught up! No unanswered comments.</div>
             ) : (
               topComments.map((c) => (
                 <CommentRow key={c.commentId} comment={c} onReplied={removeComment} />
               ))
             )}
           </div>
        </div>

      </div>
    </div>
  );
}
