'use client';

import { useEffect, useRef, useState } from 'react';
import CommentThreads from './CommentThreads';

const SETTING_AI_AUTO_REPLY = 'setting_ai_auto_reply';

export default function CommentsModal({ post, onClose }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoReplying, setAutoReplying] = useState(false);
  const backdropRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/instagram/comments?mediaId=${post.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load comments');
        const loaded = data.data ?? [];
        setComments(loaded);

        // Auto-reply if setting is enabled
        if (localStorage.getItem(SETTING_AI_AUTO_REPLY) === 'true' && loaded.length > 0) {
          const unanswered = loaded.filter((c) => !c.replies?.data?.length);
          if (unanswered.length > 0) {
            setAutoReplying(true);
            for (const comment of unanswered) {
              try {
                const aiRes = await fetch('/api/instagram/ai-reply', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    commentText: comment.text,
                    username: comment.username,
                    postCaption: post.caption,
                  }),
                });
                const aiData = await aiRes.json();
                if (!aiRes.ok || !aiData.suggestion) continue;

                const replyRes = await fetch('/api/instagram/comments', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ commentId: comment.id, message: aiData.suggestion }),
                });
                if (replyRes.ok) {
                  setComments((prev) =>
                    prev.map((c) =>
                      c.id === comment.id
                        ? {
                            ...c,
                            replies: {
                              data: [
                                ...(c.replies?.data ?? []),
                                { id: Date.now().toString(), text: aiData.suggestion, username: 'me', timestamp: new Date().toISOString() },
                              ],
                            },
                          }
                        : c
                    )
                  );
                }
              } catch {
                // skip failed auto-replies silently
              }
            }
            setAutoReplying(false);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [post.id, post.caption]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  function onBackdropClick(e) {
    if (e.target === backdropRef.current) onClose();
  }

  const thumb = post.thumbnail_url ?? post.media_url;

  return (
    <div
      ref={backdropRef}
      onClick={onBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex overflow-hidden">
        {/* Left: post image */}
        <div className="hidden sm:block w-72 flex-shrink-0 bg-gray-100">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumb}
              alt={post.caption ?? 'Post'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl">
              📸
            </div>
          )}
        </div>

        {/* Right: comments */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Comments</h2>
              {!loading && !autoReplying && (
                <p className="text-xs text-gray-400 mt-0.5">{comments.length} comment{comments.length !== 1 ? 's' : ''}</p>
              )}
              {autoReplying && (
                <p className="text-xs text-violet-500 mt-0.5 flex items-center gap-1.5">
                  <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  AI auto-replying…
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <p className="text-sm text-red-500 text-center py-10">{error}</p>
            )}
            {!loading && !error && (
              <CommentThreads comments={comments} mediaId={post.id} postCaption={post.caption} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
