'use client';

import Link from 'next/link';
import { useState } from 'react';
import CommentsModal from './CommentsModal';

export default function PostCard({ post, platform = 'instagram', onDelete }) {
  const [showComments, setShowComments] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const thumb = post.thumbnail_url ?? post.media_url;
  const date = new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isFacebook = platform === 'facebook';
  const isLinkedIn = platform === 'linkedin';
  const postHref = isFacebook
    ? `/posts/${post.id}?platform=facebook`
    : isLinkedIn
    ? `/posts/${encodeURIComponent(post.id)}?platform=linkedin`
    : `/posts/${post.id}`;

  async function handleDelete() {
    if (platform === 'instagram') {
      setDeleteError('Instagram does not support deleting posts via API. Please delete from the Instagram app.');
      return;
    }
    if (platform === 'linkedin') {
      setDeleteError('LinkedIn does not support deleting posts via API.');
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/facebook/posts/${post.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      onDelete?.(post.id);
    } catch (err) {
      setDeleteError(err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const imageInner = (
    <>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt={post.caption ?? 'Post'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📸</div>
      )}
      {isFacebook && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-[#1877F2]/90 text-white text-xs font-bold">f</span>
      )}
      {isLinkedIn && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-[#0A66C2]/90 text-white text-xs font-bold">in</span>
      )}
      {!isFacebook && post.media_type === 'VIDEO' && (
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-xs font-medium flex items-center gap-1">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Video
        </span>
      )}
      {!isFacebook && post.media_type === 'CAROUSEL_ALBUM' && (
        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-xs font-medium">⊞ Album</span>
      )}
    </>
  );

  return (
    <>
      <div className="group flex flex-col rounded-2xl overflow-hidden bg-lord-card border border-lord-border hover:border-green-200 hover:shadow-lg hover:shadow-green-500/10 transition-all shadow-sm">
        <Link href={postHref} className="relative aspect-square overflow-hidden bg-gray-50 block">
          {imageInner}
        </Link>

        <div className="p-4 flex-1 flex flex-col gap-2">
          {post.caption && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{post.caption}</p>
          )}

          {deleteError && (
            <p className="text-[10px] text-red-500 leading-tight">{deleteError}</p>
          )}

          <div className="flex items-center justify-between mt-auto pt-1">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f43f5e"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {(post.like_count ?? 0).toLocaleString()}
              </span>
              <button onClick={() => setShowComments(true)} className="flex items-center gap-1 hover:text-green-600 transition-colors">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {(post.comments_count ?? 0).toLocaleString()}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{date}</span>

              {/* Delete */}
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                  title="Delete post"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-[10px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    {deleting ? '…' : 'Delete'}
                  </button>
                  <span className="text-gray-300 text-[10px]">/</span>
                  <button
                    onClick={() => { setConfirmDelete(false); setDeleteError(''); }}
                    className="text-[10px] font-semibold text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showComments && <CommentsModal post={post} platform={platform} onClose={() => setShowComments(false)} />}
    </>
  );
}
