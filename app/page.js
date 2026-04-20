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
        body: JSON.stringify({
            commentText: comment.text,
            username: comment.username,
            postCaption: comment.postCaption,
            brandContext: localStorage.getItem('setting_ai_context') ?? '',
            tone: localStorage.getItem('setting_ai_tone') ?? 'friendly',
            avoid: localStorage.getItem('setting_ai_avoid') ?? '',
          }),
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
    <div className="flex items-center gap-3.5 py-4 px-1">
      <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-[16px] text-gray-500">
        {comment.username.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-lord-text-main leading-tight truncate">@{comment.username}</p>
        <p className="text-[12px] text-lord-text-muted truncate mt-0.5">{comment.text}</p>
      </div>
      <div className="flex-shrink-0">
        {status === 'done' ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-lord-green text-lord-green text-[12px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-lord-green" /> Done
          </span>
        ) : status === 'error' ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-lord-red text-lord-red text-[12px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-lord-red" /> Failed
          </span>
        ) : (
          <button
            onClick={autoReply}
            disabled={status === 'replying'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-lord-green text-lord-green text-[12px] font-semibold hover:bg-lord-green hover:text-white transition-colors disabled:opacity-50"
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
  const [topCommenters, setTopCommenters] = useState([]);
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
        setTopCommenters(d.topCommenters ?? []);
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
          body: JSON.stringify({
            commentText: c.text,
            username: c.username,
            postCaption: c.postCaption,
            brandContext: localStorage.getItem('setting_ai_context') ?? '',
            tone: localStorage.getItem('setting_ai_tone') ?? 'friendly',
            avoid: localStorage.getItem('setting_ai_avoid') ?? '',
          }),
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
          <div className="px-4 py-2.5 rounded-full bg-lord-card text-lord-text-main text-[13px] font-bold border border-lord-border flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <a href="/create" className="px-5 py-2.5 rounded-full bg-lord-green text-lord-card text-[13px] font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            Create Post
          </a>
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
            <div className="bg-lord-card rounded-[32px] p-6 shadow-sm relative">
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
          <div className="rounded-[32px] bg-lord-card p-6 shadow-sm flex flex-col justify-between min-h-[240px]">
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
                <div className="rounded-[20px] bg-lord-card border-2 border-lord-border p-3.5 flex flex-col justify-center">
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
             <div className="bg-lord-card rounded-[32px] shadow-sm p-6 relative">
                 <p className="text-[11px] text-lord-text-muted font-medium mb-1">Instagram</p>
                 <h3 className="text-xl font-bold text-lord-text-main">Commenters</h3>

                 {(() => {
                   const total = totalComments;
                   const unique = uniqueCommenters;
                   const repeat = Math.max(0, total - unique);

                   // Use stroke-dasharray on a single full arc to draw segments cleanly.
                   // Full semicircle circumference = π * r
                   const r = 58;
                   const cx = 90, cy = 82;
                   const circumference = Math.PI * r; // ~182px

                   const p1 = total > 0 ? unique / total : 0;  // green (unique)
                   const p2 = total > 0 ? repeat / total : 0;  // teal (repeat)

                   const gap = 4; // px gap between segments
                   const seg1 = Math.max(0, p1 * circumference - gap);
                   const seg2 = Math.max(0, p2 * circumference - gap);

                   // Each arc uses dasharray: [segLen, rest] with dashoffset to position it
                   // Arc starts at the left (180°). SVG path drawn left→right.
                   const offset1 = 0;                          // green starts at 0
                   const offset2 = -(seg1 + gap);              // teal starts after green + gap

                   return (
                     <>
                       <div className="mt-4 flex justify-center" style={{ height: 108 }}>
                         <svg width="180" height="108" viewBox="0 0 180 108">
                           {/* Full background arc */}
                           <path
                             d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
                             fill="none" stroke="#eef0f3" strokeWidth="20" strokeLinecap="round"
                           />
                           {!commentsLoading && total > 0 && (<>
                             {/* Unique — green */}
                             {seg1 > 2 && (
                               <path
                                 d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
                                 fill="none" stroke="#83d395" strokeWidth="20" strokeLinecap="round"
                                 strokeDasharray={`${seg1} ${circumference}`}
                                 strokeDashoffset={offset1}
                               />
                             )}
                             {/* Repeat — teal */}
                             {seg2 > 2 && (
                               <path
                                 d={`M${cx - r},${cy} A${r},${r} 0 0,1 ${cx + r},${cy}`}
                                 fill="none" stroke="#407088" strokeWidth="20" strokeLinecap="round"
                                 strokeDasharray={`${seg2} ${circumference}`}
                                 strokeDashoffset={offset2}
                               />
                             )}
                           </>)}
                           {/* Center label */}
                           <text x={cx} y={cy - 6} textAnchor="middle" fontSize="30" fontWeight="700" fill="#1a1d1f" fontFamily="sans-serif">
                             {commentsLoading ? '…' : total}
                           </text>
                           <text x={cx} y={cy + 12} textAnchor="middle" fontSize="10" fontWeight="500" fill="#6f767e" fontFamily="sans-serif">
                             Total comments
                           </text>
                         </svg>
                       </div>

                       <div className="mt-3 space-y-3">
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
             
             {/* Top Commenters widget */}
             <div className="bg-lord-card rounded-[32px] shadow-sm p-6 relative flex flex-col">
               <p className="text-[11px] text-lord-text-muted font-medium mb-1">Instagram</p>
               <h3 className="text-xl font-bold text-lord-text-main">Top Commenters</h3>

               {/* Avatar row — top 3 */}
               <div className="flex gap-4 mt-5">
                 {commentsLoading ? (
                   [...Array(3)].map((_, i) => (
                     <div key={i} className="flex flex-col items-center gap-1.5">
                       <div className="w-11 h-11 rounded-full bg-lord-bg animate-pulse" />
                       <div className="w-10 h-2 rounded bg-lord-bg animate-pulse" />
                       <div className="w-6 h-2 rounded bg-lord-bg animate-pulse" />
                     </div>
                   ))
                 ) : topCommenters.slice(0, 3).map((c, i) => {
                   const ringColors = ['#83d395', '#407088', '#f6a23c'];
                   return (
                     <div key={c.username} className="flex flex-col items-center gap-1.5">
                       <div
                         className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[16px] text-white shadow-sm"
                         style={{ backgroundColor: ringColors[i] }}
                       >
                         {c.username.charAt(0).toUpperCase()}
                       </div>
                       <span className="text-[9px] font-semibold text-lord-text-muted truncate max-w-[52px] text-center">@{c.username}</span>
                       <span className="text-[9px] font-bold text-lord-text-main">{c.count}</span>
                     </div>
                   );
                 })}
                 {!commentsLoading && topCommenters.length === 0 && (
                   <p className="text-[11px] text-lord-text-muted mt-2">No comment data yet.</p>
                 )}
               </div>

               {/* Stats row */}
               {!commentsLoading && topCommenters.length > 0 && (
                 <div className="flex items-center justify-between text-[11px] font-bold text-lord-text-main mt-5 mb-2">
                   <span className="text-lord-text-main">{topCommenters[0]?.count} comments</span>
                   <span className="text-lord-text-muted">{topCommenters.length} commenters</span>
                 </div>
               )}

               {/* Bar chart */}
               <div className="mt-auto pt-2">
                 {commentsLoading ? (
                   <div className="flex gap-1.5 h-12 items-end">
                     {[...Array(5)].map((_, i) => <div key={i} className="flex-1 rounded-full bg-lord-bg animate-pulse" style={{ height: '60%' }} />)}
                   </div>
                 ) : topCommenters.length > 0 ? (() => {
                   const maxCount = topCommenters[0]?.count ?? 1;
                   return (
                     <>
                       <div className="flex gap-2 h-16 items-end mb-2">
                         {topCommenters.map((c, i) => {
                           const h = Math.max(15, (c.count / maxCount) * 100);
                           const isTop = i === 0;
                           return (
                             <div key={c.username} className="flex-1 flex flex-col items-center gap-1">
                               <span className="text-[9px] font-bold text-lord-text-muted">{c.count}</span>
                               <div
                                 className={`w-full rounded-full ${isTop ? 'bg-lord-green' : 'bg-lord-bg'}`}
                                 style={{ height: `${h}%` }}
                               />
                             </div>
                           );
                         })}
                       </div>
                       <div className="flex gap-2 items-center justify-center mt-1">
                         {topCommenters.map((c) => (
                           <span key={c.username} className="text-[9px] text-lord-text-muted truncate max-w-[48px]">@{c.username}</span>
                         ))}
                       </div>
                       <div className="flex gap-5 items-center justify-center mt-3">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-lord-text-muted"><div className="w-2 h-2 rounded-full bg-lord-green" /> Most active</div>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-lord-text-muted"><div className="w-2 h-2 rounded-full bg-lord-bg" style={{ border: '1px solid #efefef' }} /> Others</div>
                       </div>
                     </>
                   );
                 })() : null}
               </div>
             </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="w-full bg-lord-card rounded-[32px] p-6 shadow-sm">
           <div className="flex items-start justify-between mb-4">
             <div>
               <p className="text-[12px] text-lord-text-muted font-medium mb-1">Payout monthly</p>
               <h2 className="text-[22px] font-bold text-lord-text-main leading-snug">Unanswered<br/>comments</h2>
             </div>
             {topComments.length > 0 && (
               <button
                 onClick={replyToAll}
                 disabled={replyingAll}
                 className="mt-1 flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-lord-green text-white text-[13px] font-bold shadow-sm hover:bg-lord-green-dark disabled:opacity-50 transition-colors"
               >
                 {replyingAll ? (
                   <><svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>{replyAllDone}/{topComments.length + replyAllDone}…</>
                 ) : (
                   <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Reply All</>
                 )}
               </button>
             )}
           </div>

           <div className="flex flex-col divide-y divide-lord-border/50">
             {commentsLoading ? (
               [...Array(5)].map((_, i) => (
                 <div key={i} className="flex items-center gap-3.5 py-4 px-1">
                   <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                   <div className="flex-1 space-y-2">
                     <div className="h-3.5 bg-gray-200 rounded animate-pulse w-2/5" />
                     <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5" />
                   </div>
                   <div className="w-24 h-8 rounded-full bg-gray-200 animate-pulse" />
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
