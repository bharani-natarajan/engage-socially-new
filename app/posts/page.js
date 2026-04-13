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
          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{posts.length} published</p>
        </div>
        <Link
          href="/create"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-md shadow-violet-500/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Post
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {posts.length === 0 && !error ? (
        <div className="text-center py-20 text-gray-400 rounded-2xl border border-gray-200 bg-white">
          <div className="text-5xl mb-3">📸</div>
          <p className="mb-2 text-gray-500">No posts yet.</p>
          <Link href="/create" className="text-violet-600 hover:underline text-sm">
            Create your first post →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
