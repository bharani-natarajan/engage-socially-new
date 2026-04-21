'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PostCard from '@/components/PostCard';
import PlatformTabs from '@/components/PlatformTabs';

export default function PostsPage() {
  const [platform, setPlatform] = useState('instagram');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    setPosts([]);
    fetch(`/api/${platform}/posts`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPosts(d.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [platform]);

  const platformLabel = platform === 'facebook' ? 'Facebook' : 'Instagram';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PlatformTabs platform={platform} onChange={setPlatform} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${posts.length} ${platformLabel} posts`}
          </p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 px-5 py-2.5 bg-lord-green hover:bg-lord-green-dark text-lord-card rounded-full text-sm font-semibold transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Post
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-lord-card border border-lord-border shadow-sm">
              <div className="aspect-square bg-gray-200 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-20 rounded-[32px] bg-lord-card shadow-sm">
          <div className="w-16 h-16 rounded-[24px] bg-lord-green-light flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#83d395" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <p className="text-sm font-semibold text-lord-text-main mb-1">No {platformLabel} posts yet</p>
          <Link href="/create" className="text-lord-green hover:text-lord-green-dark text-sm font-medium">Create your first post →</Link>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => <PostCard key={post.id} post={post} platform={platform} />)}
        </div>
      )}
    </div>
  );
}
