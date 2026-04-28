'use client';

import { useState, useEffect } from 'react';
import { upsertLead } from '@/lib/leads';

const INTENT_STYLES = {
  'Inquiry':        { bg: 'bg-blue-50',   text: 'text-blue-600',  border: 'border-blue-200'  },
  'Complaint':      { bg: 'bg-red-50',    text: 'text-red-500',   border: 'border-red-200'   },
  'Purchase Intent':{ bg: 'bg-green-50',  text: 'text-green-600', border: 'border-green-200' },
  'Others':         { bg: 'bg-gray-50',   text: 'text-gray-500',  border: 'border-gray-200'  },
};

const FILTERS = ['All', 'Inquiry', 'Complaint', 'Purchase Intent', 'Others'];

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Avatar({ username }) {
  const initial = (username?.[0] ?? '?').toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
      {initial}
    </div>
  );
}

function ReplyItem({ reply }) {
  return (
    <div className="flex gap-3 mt-3 ml-11">
      <Avatar username={reply.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900">@{reply.username}</span>
          <span className="text-xs text-gray-400">{timeAgo(reply.timestamp)}</span>
        </div>
        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{reply.text}</p>
      </div>
    </div>
  );
}

async function callAiReply(commentText, username, postCaption) {
  const brandContext = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_ai_context') ?? '') : '';
  const tone = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_ai_tone') ?? 'friendly') : 'friendly';
  const avoid = typeof localStorage !== 'undefined' ? (localStorage.getItem('setting_ai_avoid') ?? '') : '';
  const res = await fetch('/api/instagram/ai-reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentText, username, postCaption, brandContext, tone, avoid }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI generation failed');
  return data.suggestion;
}

async function callSendReply(commentId, message, platform = 'instagram') {
  const res = await fetch(`/api/${platform}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentId, message }),
  });
  if (!res.ok) throw new Error('Reply failed');
  return res.json();
}

function IntentBadge({ intent }) {
  if (!intent) return null;
  const s = INTENT_STYLES[intent] ?? INTENT_STYLES['Others'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.bg} ${s.text} ${s.border}`}>
      {intent}
    </span>
  );
}

function CommentItem({ comment, mediaId, postCaption, platform, intent }) {
  const [showReply, setShowReply] = useState(false);
  const [showDm, setShowDm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [dmText, setDmText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingDm, setSendingDm] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [autoReplying, setAutoReplying] = useState(false);
  const [autoReplied, setAutoReplied] = useState(false);
  const [replies, setReplies] = useState(comment.replies?.data ?? []);
  const [replyError, setReplyError] = useState('');
  const [dmError, setDmError] = useState('');
  const [dmSent, setDmSent] = useState(false);

  const hasReplies = replies.length > 0;
  const recipientId = comment.from?.id;

  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    setReplyError('');
    try {
      const data = await callSendReply(comment.id, replyText.trim(), platform);
      setReplies((prev) => [...prev, { id: data.id, text: replyText.trim(), username: 'me', timestamp: new Date().toISOString() }]);
      setReplyText('');
      setShowReply(false);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function submitDm(e) {
    e.preventDefault();
    if (!dmText.trim() || !recipientId) return;
    setSendingDm(true);
    setDmError('');
    try {
      const res = await fetch('/api/instagram/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, message: dmText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send DM');
      setDmText('');
      setDmSent(true);
      setTimeout(() => { setDmSent(false); setShowDm(false); }, 2000);
    } catch (err) {
      setDmError(err.message);
    } finally {
      setSendingDm(false);
    }
  }

  async function generateAiReply() {
    setGeneratingReply(true);
    setReplyError('');
    try {
      const suggestion = await callAiReply(comment.text, comment.username, postCaption);
      setReplyText(suggestion);
      setShowReply(true);
      setShowDm(false);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setGeneratingReply(false);
    }
  }

  async function autoReply() {
    if (autoReplying || autoReplied) return;
    setAutoReplying(true);
    setReplyError('');
    try {
      const suggestion = await callAiReply(comment.text, comment.username, postCaption);
      const data = await callSendReply(comment.id, suggestion, platform);
      setReplies((prev) => [...prev, { id: data.id, text: suggestion, username: 'me', timestamp: new Date().toISOString() }]);
      setAutoReplied(true);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setAutoReplying(false);
    }
  }

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex gap-3">
        <Avatar username={comment.username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-gray-900">@{comment.username}</span>
              <span className="text-xs text-gray-400">{timeAgo(comment.timestamp)}</span>
            </div>
            {/* Auto Reply button — only if no replies yet */}
            {!hasReplies && (
              autoReplied ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-green-300 text-green-600 text-[11px] font-semibold">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Replied
                </span>
              ) : (
                <button
                  onClick={autoReply}
                  disabled={autoReplying}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-lord-green text-lord-green text-[11px] font-semibold hover:bg-lord-green hover:text-white transition-colors disabled:opacity-50"
                >
                  {autoReplying ? (
                    <><svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Replying…</>
                  ) : (
                    <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Auto Reply</>
                  )}
                </button>
              )
            )}
          </div>

          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{comment.text}</p>

          {intent && (
            <div className="mt-1.5">
              <IntentBadge intent={intent} />
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { setShowReply((v) => !v); setShowDm(false); }}
              className="text-xs text-gray-400 hover:text-green-600 transition-colors"
            >
              {showReply ? 'Cancel' : 'Reply'}
            </button>
            <button
              onClick={generateAiReply}
              disabled={generatingReply}
              className="text-xs text-gray-400 hover:text-green-600 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {generatingReply ? (
                <><svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>AI…</>
              ) : (
                <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>AI Reply (preview)</>
              )}
            </button>
            {recipientId && (
              <button
                onClick={() => { setShowDm((v) => !v); setShowReply(false); }}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
                {showDm ? 'Cancel' : 'DM'}
              </button>
            )}
          </div>
        </div>
      </div>

      {replies.map((r) => <ReplyItem key={r.id} reply={r} />)}

      {showReply && (
        <form onSubmit={submitReply} className="mt-3 ml-11 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
            disabled={sending}
            autoFocus
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="px-3 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
      )}
      {replyError && <p className="ml-11 mt-1.5 text-xs text-red-500">{replyError}</p>}

      {showDm && (
        <form onSubmit={submitDm} className="mt-3 ml-11 space-y-2">
          <p className="text-xs text-gray-400">
            Send a private DM to <span className="font-medium text-gray-600">@{comment.username}</span>
          </p>
          <div className="flex gap-2">
            <input
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              placeholder="Write a message..."
              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              disabled={sendingDm || dmSent}
              autoFocus
            />
            <button
              type="submit"
              disabled={sendingDm || !dmText.trim() || dmSent}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {dmSent ? '✓ Sent' : sendingDm ? '...' : 'Send'}
            </button>
          </div>
          {dmError && <p className="text-xs text-red-500">{dmError}</p>}
        </form>
      )}
    </div>
  );
}

export default function CommentThreads({ comments, mediaId, postCaption, postThumbnail, platform = 'instagram' }) {
  const [replyAllProgress, setReplyAllProgress] = useState(null); // null | { done, total }
  const [replyAllDone, setReplyAllDone] = useState(false);
  const [intents, setIntents] = useState({});
  const [classifying, setClassifying] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [newLeadCount, setNewLeadCount] = useState(0);

  useEffect(() => {
    if (!comments?.length) return;
    setClassifying(true);
    fetch('/api/comments/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comments: comments.map((c) => ({ id: c.id, text: c.text })) }),
    })
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        let added = 0;
        (data.results ?? []).forEach((r) => {
          map[r.id] = r.intent;
          if (r.intent === 'Inquiry' || r.intent === 'Purchase Intent') {
            const comment = comments.find((c) => c.id === r.id);
            if (comment) {
              const userId = comment.from?.id || comment.username;
              upsertLead({
                id: `${platform}_${userId}`,
                username: comment.username,
                name: comment.from?.name || comment.username,
                userId,
                platform,
                intent: r.intent,
                commentText: comment.text,
                postId: mediaId,
                postCaption: postCaption ?? '',
                postThumbnail: postThumbnail ?? null,
                addedAt: new Date().toISOString(),
              });
              added++;
            }
          }
        });
        setIntents(map);
        if (added > 0) setNewLeadCount(added);
      })
      .catch(() => {})
      .finally(() => setClassifying(false));
  }, [comments]);

  if (!comments?.length) {
    return <div className="text-center py-10 text-gray-400 text-sm">No comments yet.</div>;
  }

  const counts = FILTERS.reduce((acc, f) => {
    acc[f] = f === 'All' ? comments.length : comments.filter((c) => intents[c.id] === f).length;
    return acc;
  }, {});

  const filtered = activeFilter === 'All' ? comments : comments.filter((c) => intents[c.id] === activeFilter);

  const unanswered = filtered.filter((c) => !(c.replies?.data?.length > 0));

  async function replyToAll() {
    if (!unanswered.length) return;
    setReplyAllProgress({ done: 0, total: unanswered.length });
    let done = 0;
    for (const c of unanswered) {
      try {
        const suggestion = await callAiReply(c.text, c.username, postCaption);
        await callSendReply(c.id, suggestion, platform);
        done++;
        setReplyAllProgress({ done, total: unanswered.length });
      } catch { /* continue */ }
    }
    setReplyAllDone(true);
    setReplyAllProgress(null);
  }

  return (
    <div>
      {/* Leads detected banner */}
      {newLeadCount > 0 && (
        <a
          href="/leads"
          className="flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span className="text-[12px] font-semibold text-amber-700">
              {newLeadCount} new lead{newLeadCount !== 1 ? 's' : ''} detected from this post
            </span>
          </div>
          <span className="text-[11px] text-amber-600 font-medium">View Leads →</span>
        </a>
      )}

      {/* Intent filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map((f) => {
          const s = f !== 'All' ? INTENT_STYLES[f] : null;
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors ${
                isActive
                  ? f === 'All'
                    ? 'bg-gray-800 text-white border-gray-800'
                    : `${s.bg} ${s.text} ${s.border} ring-1 ring-offset-0 ring-current`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {f}
              <span className={`text-[10px] ${isActive && f !== 'All' ? s.text : 'text-gray-400'}`}>
                {classifying && f !== 'All' ? '…' : counts[f]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Auto Reply All header */}
      {unanswered.length > 0 && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs text-gray-400">
            {unanswered.length} unanswered comment{unanswered.length !== 1 ? 's' : ''}
          </p>
          {replyAllDone ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-300 text-green-600 text-xs font-semibold">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              All replied
            </span>
          ) : replyAllProgress ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lord-green text-lord-green text-xs font-semibold">
              <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {replyAllProgress.done}/{replyAllProgress.total} replied…
            </span>
          ) : (
            <button
              onClick={replyToAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lord-green text-white text-xs font-semibold hover:bg-lord-green-dark transition-colors shadow-sm"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Auto Reply All ({unanswered.length})
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center py-8 text-gray-400 text-sm">No {activeFilter.toLowerCase()} comments.</p>
      )}
      {filtered.map((comment) => (
        <CommentItem key={comment.id} comment={comment} mediaId={mediaId} postCaption={postCaption ?? ''} platform={platform} intent={intents[comment.id]} />
      ))}
    </div>
  );
}
