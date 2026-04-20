'use client';

import Link from 'next/link';
import { useState } from 'react';
import CommentsModal from './CommentsModal';

export default function PostCard({ post }) {
  const [showComments, setShowComments] = useState(false);
  const thumb = post.thumbnail_url ?? post.media_url;
  const date = new Date(post.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <>
      <div className="group flex flex-col rounded-2xl overflow-hidden bg-lord-card border border-lord-border hover:border-green-200 hover:shadow-lg hover:shadow-green-500/10 transition-all shadow-sm">
        <Link href={`/posts/${post.id}`} className="relative aspect-square overflow-hidden bg-gray-50 block">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt={post.caption ?? 'Post'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📸</div>
          )}
          {post.media_type === 'VIDEO' && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-xs font-medium flex items-center gap-1">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Video
            </span>
          )}
          {post.media_type === 'CAROUSEL_ALBUM' && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-white text-xs font-medium">⊞ Album</span>
          )}
        </Link>

        <div className="p-4 flex-1 flex flex-col gap-2">
          {post.caption && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{post.caption}</p>
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
            <span className="text-xs text-gray-400">{date}</span>
          </div>
        </div>
      </div>

      {showComments && <CommentsModal post={post} onClose={() => setShowComments(false)} />}
    </>
  );
}
