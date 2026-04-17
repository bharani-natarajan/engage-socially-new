import { cookies } from 'next/headers';
import Link from 'next/link';
import PostCard from '@/components/PostCard';
import { getMedia } from '@/lib/instagram';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Posts — Engage Socially' };

export default async function PostsPage() {
  const store = await cookies();
  const token = store.get('ig_access_token')?.value;
  const userId = store.get('ig_user_id')?.value;

  if (!token || !userId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
        <p className="text-gray-500 mb-4">Connect Instagram to see your posts.</p>
        <a
          href="/api/auth/instagram"
          className="px-6 py-3 bg-lord-green text-lord-card rounded-full text-[15px] font-semibold hover:opacity-90 transition-opacity"
        >
          Connect Instagram
        </a>
      </div>
    );
  }

  let posts = [];
  let error = null;
  try {
    const data = await getMedia(userId, token);
    posts = data.data ?? [];
  } catch (e) {
    error = e.message;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">{posts.length} published posts</p>
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

      {posts.length === 0 && !error ? (
        <div className="text-center py-20 rounded-[32px] bg-lord-card shadow-sm">
          <div className="w-16 h-16 rounded-[24px] bg-lord-green-light flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#83d395" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <p className="text-sm font-semibold text-lord-text-main mb-1">No posts yet</p>
          <Link href="/create" className="text-lord-green hover:text-lord-green-dark text-sm font-medium">Create your first post →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (<PostCard key={post.id} post={post} />))}
        </div>
      )}
    </div>
  );
}
