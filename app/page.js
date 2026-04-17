'use client';

import { useEffect, useState, useCallback } from 'react';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ label, value, icon, gradient, textColor }) {
  return (
    <div className={`rounded-2xl p-5 flex items-center gap-4 ${gradient}`}>
      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide opacity-80 ${textColor}`}>{label}</p>
        <p className={`text-3xl font-bold mt-0.5 ${textColor}`}>
          {value === null ? (
            <span className="inline-block w-14 h-7 bg-white/30 rounded animate-pulse" />
          ) : value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function UnansweredRow({ item, onReplied }) {
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function autoReply() {
    setStatus('generating');
    setErrorMsg('');
    try {
      const aiRes = await fetch('/api/instagram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentText: item.text, username: item.username, postCaption: item.postCaption }),
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
      setTimeout(() => onReplied(item.commentId), 1000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
        {item.postThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.postThumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">📷</div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">@{item.username}</span>
          <span className="text-xs text-gray-400">{timeAgo(item.timestamp)}</span>
        </div>
        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.text}</p>
        {status === 'error' && <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>}
      </div>

      <button
        onClick={autoReply}
        disabled={status === 'generating' || status === 'done'}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          status === 'done'
            ? 'bg-green-50 text-green-600'
            : status === 'generating'
            ? 'bg-green-50 text-green-400 cursor-not-allowed'
            : 'bg-green-500 text-white hover:bg-green-600 shadow-sm shadow-green-500/30'
        }`}
      >
        {status === 'done' ? (
          <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Replied</>
        ) : status === 'generating' ? (
          <><svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Replying…</>
        ) : (
          <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Auto Reply</>
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
    const total = stats.unansweredComments.length;
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Good morning 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">Here's what's happening with your Instagram today.</p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Posts"
          value={loading ? null : stats?.totalPosts ?? 0}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
          textColor="text-white"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>}
        />
        <StatCard
          label="Total Likes"
          value={loading ? null : stats?.totalLikes ?? 0}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          textColor="text-white"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
        />
        <StatCard
          label="Total Comments"
          value={loading ? null : stats?.totalComments ?? 0}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          textColor="text-white"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
        />
        <StatCard
          label="Unique Commenters"
          value={loading ? null : stats?.uniqueCommenters ?? 0}
          gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          textColor="text-white"
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
      </div>

      {/* Unanswered Comments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Unanswered Comments</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${unanswered.length} comment${unanswered.length !== 1 ? 's' : ''} waiting`}
            </p>
          </div>
          {unanswered.length > 0 && (
            <button
              onClick={replyToAll}
              disabled={replyingAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-green-500/30"
            >
              {replyingAll ? (
                <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Replying {replyAllDone}/{unanswered.length + replyAllDone}…</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Auto Reply All</>
              )}
            </button>
          )}
        </div>

        <div className="px-6">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : unanswered.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p className="text-sm font-semibold text-gray-800">All caught up!</p>
              <p className="text-xs text-gray-400 mt-1">Every comment has been replied to.</p>
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
