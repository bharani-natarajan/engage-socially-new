'use client';

import { useEffect, useState, useCallback } from 'react';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ label, value, icon, bg, iconColor }) {
  return (
    <div className="bg-lord-card rounded-[28px] p-6 flex items-center gap-5 shadow-sm">
      <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center flex-shrink-0 ${bg}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
      <div>
        <p className="text-xs font-semibold text-lord-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-3xl font-bold text-lord-text-main mt-0.5">
          {value === null
            ? <span className="inline-block w-16 h-8 rounded-xl bg-lord-bg animate-pulse" />
            : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-green text-lord-green-dark text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-lord-green" />Done
    </span>
  );
  if (status === 'error') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-red text-lord-red text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-lord-red" />Failed
    </span>
  );
  if (status === 'generating') return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-orange text-lord-orange text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-lord-orange animate-pulse" />Replying…
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-lord-orange text-lord-orange text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-lord-orange" />Waiting
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
      if (!aiRes.ok) throw new Error(aiData.error);

      const replyRes = await fetch('/api/instagram/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: item.commentId, message: aiData.suggestion }),
      });
      if (!replyRes.ok) throw new Error('Reply failed');

      setStatus('done');
      setTimeout(() => onReplied(item.commentId), 1200);
    } catch {
      setStatus('error');
    }
  }

  return (
    <div
      className="flex items-center justify-between py-3.5 px-3 border-b border-lord-border last:border-0 rounded-xl hover:bg-lord-bg/60 cursor-pointer transition-colors"
      onClick={autoReply}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-lord-bg flex-shrink-0 overflow-hidden">
          {item.postThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.postThumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lord-text-muted font-bold text-sm">
              {item.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-lord-text-main leading-tight">@{item.username}</p>
          <p className="text-xs text-lord-text-muted mt-0.5 truncate max-w-[220px]">{item.text}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
        <span className="text-xs text-lord-text-muted hidden sm:block">{timeAgo(item.timestamp)}</span>
        <StatusPill status={status} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyingAll, setReplyingAll] = useState(false);
  const [replyAllDone, setReplyAllDone] = useState(0);

  useEffect(() => {
    fetch('/api/instagram/dashboard')
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setStats(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const removeComment = useCallback((commentId) => {
    setStats((prev) => ({
      ...prev,
      unansweredComments: prev.unansweredComments.filter((c) => c.commentId !== commentId),
    }));
  }, []);

  async function replyToAll() {
    if (!stats?.unansweredComments?.length) return;
    setReplyingAll(true);
    setReplyAllDone(0);
    for (const item of [...stats.unansweredComments]) {
      try {
        const aiRes = await fetch('/api/instagram/ai-reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentText: item.text, username: item.username, postCaption: item.postCaption }),
        });
        const aiData = await aiRes.json();
        if (!aiRes.ok) continue;
        const replyRes = await fetch('/api/instagram/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commentId: item.commentId, message: aiData.suggestion }),
        });
        if (replyRes.ok) { setReplyAllDone((n) => n + 1); removeComment(item.commentId); }
      } catch { /* continue */ }
    }
    setReplyingAll(false);
  }

  const unanswered = stats?.unansweredComments ?? [];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lord-text-main">Good morning 👋</h1>
          <p className="text-sm text-lord-text-muted mt-0.5">Here's your Instagram overview</p>
        </div>
        {unanswered.length > 0 && (
          <button
            onClick={replyToAll}
            disabled={replyingAll}
            className="flex items-center gap-2 px-5 py-2.5 bg-lord-green hover:bg-lord-green-dark disabled:opacity-60 text-white text-sm font-semibold rounded-full transition-colors shadow-sm"
          >
            {replyingAll ? (
              <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Replying {replyAllDone}/{unanswered.length + replyAllDone}…</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Auto Reply All ({unanswered.length})</>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-[20px] bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Posts"
          value={loading ? null : stats?.totalPosts ?? 0}
          bg="bg-lord-green-light"
          iconColor="#6eb87e"
          icon='<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'
        />
        <StatCard
          label="Total Likes"
          value={loading ? null : stats?.totalLikes ?? 0}
          bg="bg-red-50"
          iconColor="#f87171"
          icon='<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'
        />
        <StatCard
          label="Total Comments"
          value={loading ? null : stats?.totalComments ?? 0}
          bg="bg-blue-50"
          iconColor="#60a5fa"
          icon='<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'
        />
        <StatCard
          label="Unique Commenters"
          value={loading ? null : stats?.uniqueCommenters ?? 0}
          bg="bg-amber-50"
          iconColor="#fbbf24"
          icon='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
        />
      </div>

      {/* Unanswered Comments Panel */}
      <div className="bg-lord-card rounded-[28px] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-lord-border">
          <div>
            <h3 className="text-base font-bold text-lord-text-main">Unanswered Comments</h3>
            <p className="text-xs text-lord-text-muted mt-0.5">
              {loading ? 'Loading…' : `${unanswered.length} comment${unanswered.length !== 1 ? 's' : ''} waiting — click any row to auto-reply`}
            </p>
          </div>
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-lord-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lord-orange" />Waiting</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lord-green" />Done</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-lord-red" />Failed</span>
          </div>
        </div>

        <div className="px-4 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-lord-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unanswered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-[20px] bg-lord-green-light flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6eb87e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-sm font-semibold text-lord-text-main">All caught up!</p>
              <p className="text-xs text-lord-text-muted mt-1">Every comment has been replied to.</p>
            </div>
          ) : (
            unanswered.map((item) => (
              <CommentRow key={item.commentId} item={item} onReplied={removeComment} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
