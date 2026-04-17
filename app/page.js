'use client';

import { useEffect, useState, useCallback } from 'react';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-0.5">
          {value === null ? (
            <span className="inline-block w-16 h-7 bg-gray-100 rounded animate-pulse" />
          ) : (
            value.toLocaleString()
          )}
        </p>
      </div>
    </div>
  );
}

function UnansweredRow({ item, onReplied }) {
  const [status, setStatus] = useState('idle'); // idle | generating | done | error
  const [errorMsg, setErrorMsg] = useState('');

  async function autoReply() {
    setStatus('generating');
    setErrorMsg('');
    try {
      const aiRes = await fetch('/api/instagram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: item.text,
          username: item.username,
          postCaption: item.postCaption,
        }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok) throw new Error(aiData.error || 'AI generation failed');

      const replyRes = await fetch('/api/instagram/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: item.commentId, message: aiData.suggestion }),
      });
      const replyData = await replyRes.json();
      if (!replyRes.ok) throw new Error(replyData.error || 'Reply failed');

      setStatus('done');
      setTimeout(() => onReplied(item.commentId), 1200);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-50 last:border-0">
      {/* Post thumb */}
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
        {item.postThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.postThumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📷</div>
        )}
      </div>

      {/* Comment info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900">@{item.username}</span>
          <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed line-clamp-2">{item.text}</p>
        {status === 'error' && (
          <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
        )}
      </div>

      {/* Auto Reply button */}
      <button
        onClick={autoReply}
        disabled={status === 'generating' || status === 'done'}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          status === 'done'
            ? 'bg-emerald-50 text-emerald-600 cursor-default'
            : status === 'generating'
            ? 'bg-violet-50 text-violet-400 cursor-not-allowed'
            : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
        }`}
      >
        {status === 'done' ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Replied
          </>
        ) : status === 'generating' ? (
          <>
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Replying…
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Auto Reply
          </>
        )}
      </button>
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
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStats(d);
      })
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
    const items = [...stats.unansweredComments];
    for (const item of items) {
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
        if (replyRes.ok) {
          setReplyAllDone((n) => n + 1);
          removeComment(item.commentId);
        }
      } catch {
        // continue on error
      }
    }
    setReplyingAll(false);
  }

  const unanswered = stats?.unansweredComments ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your Instagram account at a glance</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Posts"
          value={loading ? null : stats?.totalPosts ?? 0}
          color="bg-blue-50"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          }
        />
        <StatCard
          label="Total Likes"
          value={loading ? null : stats?.totalLikes ?? 0}
          color="bg-red-50"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          }
        />
        <StatCard
          label="Total Comments"
          value={loading ? null : stats?.totalComments ?? 0}
          color="bg-violet-50"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Unique Commenters"
          value={loading ? null : stats?.uniqueCommenters ?? 0}
          color="bg-emerald-50"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>

      {/* Unanswered Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Unanswered Comments</h2>
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">
                {unanswered.length} comment{unanswered.length !== 1 ? 's' : ''} waiting for a reply
              </p>
            )}
          </div>
          {unanswered.length > 0 && (
            <button
              onClick={replyToAll}
              disabled={replyingAll}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors"
            >
              {replyingAll ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Replying {replyAllDone}/{unanswered.length + replyAllDone}…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Auto Reply All
                </>
              )}
            </button>
          )}
        </div>

        <div className="px-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unanswered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="mx-auto mb-3 text-gray-200" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <p className="text-sm font-medium">All comments have been replied to</p>
            </div>
          ) : (
            unanswered.map((item) => (
              <UnansweredRow key={item.commentId} item={item} onReplied={removeComment} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
