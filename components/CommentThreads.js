'use client';

import { useState } from 'react';

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

function CommentItem({ comment, mediaId, postCaption }) {
  const [showReply, setShowReply] = useState(false);
  const [showDm, setShowDm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [dmText, setDmText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingDm, setSendingDm] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [replies, setReplies] = useState(comment.replies?.data ?? []);
  const [replyError, setReplyError] = useState('');
  const [dmError, setDmError] = useState('');
  const [dmSent, setDmSent] = useState(false);

  const recipientId = comment.from?.id;

  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);
    setReplyError('');
    try {
      const res = await fetch('/api/instagram/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id, message: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reply');
      setReplies((prev) => [
        ...prev,
        {
          id: data.id,
          text: replyText.trim(),
          username: 'me',
          timestamp: new Date().toISOString(),
        },
      ]);
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
      const res = await fetch('/api/instagram/ai-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentText: comment.text,
          username: comment.username,
          postCaption,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate reply');
      setReplyText(data.suggestion);
      setShowReply(true);
      setShowDm(false);
    } catch (err) {
      setReplyError(err.message);
    } finally {
      setGeneratingReply(false);
    }
  }

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex gap-3">
        <Avatar username={comment.username} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-900">@{comment.username}</span>
            <span className="text-xs text-gray-400">{timeAgo(comment.timestamp)}</span>
          </div>
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{comment.text}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { setShowReply((v) => !v); setShowDm(false); }}
              className="text-xs text-gray-400 hover:text-violet-600 transition-colors"
            >
              {showReply ? 'Cancel' : 'Reply'}
            </button>
            <button
              onClick={generateAiReply}
              disabled={generatingReply}
              className="text-xs text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {generatingReply ? (
                <span className="flex items-center gap-1">
                  <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  AI…
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  AI Reply
                </span>
              )}
            </button>
            {recipientId && (
              <button
                onClick={() => { setShowDm((v) => !v); setShowReply(false); }}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                {showDm ? 'Cancel' : 'DM'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.map((r) => (
        <ReplyItem key={r.id} reply={r} />
      ))}

      {/* Reply form */}
      {showReply && (
        <form onSubmit={submitReply} className="mt-3 ml-11 flex gap-2">
          <input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-500 transition-colors"
            disabled={sending}
            autoFocus
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
          >
            {sending ? '...' : 'Send'}
          </button>
        </form>
      )}
      {replyError && <p className="ml-11 mt-1.5 text-xs text-red-500">{replyError}</p>}

      {/* DM form */}
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

export default function CommentThreads({ comments, mediaId, postCaption }) {
  if (!comments?.length) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        No comments yet.
      </div>
    );
  }

  return (
    <div>
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} mediaId={mediaId} postCaption={postCaption} />
      ))}
    </div>
  );
}
