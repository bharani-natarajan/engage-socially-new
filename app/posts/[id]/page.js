import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMediaById, getMediaInsights, getComments } from '@/lib/instagram';
import { getPagePostById, getPostComments as getFbPostComments, normalizePost as normalizeFbPost, normalizeComment as normalizeFbComment } from '@/lib/facebook';
import { getPostById as getLiPostById, getSocialActions, getPostComments as getLiPostComments, normalizePost as normalizeLiPost, normalizeComment as normalizeLiComment } from '@/lib/linkedin';
import CommentThreads from '@/components/CommentThreads';

export const dynamic = 'force-dynamic';

function MetricRow({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2.5 text-sm text-gray-500">
        <span>{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold text-gray-900">
        {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
      </span>
    </div>
  );
}

export default async function PostDetailPage({ params, searchParams }) {
  const { id } = await params;
  const platform = (await searchParams)?.platform ?? 'instagram';
  const isFacebook = platform === 'facebook';
  const isLinkedIn = platform === 'linkedin';

  const store = await cookies();

  let post = null;
  let comments = [];
  let insights = {};

  if (isLinkedIn) {
    const liToken = store.get('li_access_token')?.value;
    if (!liToken) notFound();

    try {
      const raw = await getLiPostById(id, liToken);
      post = normalizeLiPost(raw);
    } catch { notFound(); }

    try {
      const [actionsResult, commentsResult] = await Promise.allSettled([
        getSocialActions(id, liToken),
        getLiPostComments(id, liToken),
      ]);
      if (actionsResult.status === 'fulfilled') {
        post.like_count = actionsResult.value.likeCount ?? post.like_count;
        post.comments_count = actionsResult.value.commentCount ?? post.comments_count;
      }
      if (commentsResult.status === 'fulfilled') {
        comments = (commentsResult.value.elements ?? []).map(normalizeLiComment);
      }
    } catch { /* no social data */ }

  } else if (isFacebook) {
    const pageToken = store.get('fb_page_token')?.value;
    if (!pageToken) notFound();

    try {
      const raw = await getPagePostById(id, pageToken);
      post = normalizeFbPost(raw);
    } catch { notFound(); }

    try {
      const commentsData = await getFbPostComments(id, pageToken);
      comments = (commentsData.data ?? []).map(normalizeFbComment);
    } catch { /* no comments */ }

  } else {
    const token = store.get('ig_access_token')?.value;
    const userId = store.get('ig_user_id')?.value;
    if (!token || !userId) notFound();

    try {
      post = await getMediaById(id, token);
    } catch { notFound(); }

    const [insightsResult, commentsResult] = await Promise.allSettled([
      getMediaInsights(id, token, post.media_type),
      getComments(id, token),
    ]);

    if (insightsResult.status === 'fulfilled') {
      insights = Object.fromEntries(
        (insightsResult.value.data ?? []).map((m) => [
          m.name,
          m.values?.[0]?.value ?? m.value ?? 0,
        ])
      );
    }
    if (commentsResult.status === 'fulfilled') {
      comments = commentsResult.value.data ?? [];
    }
  }

  if (!post) notFound();

  const thumb = post.thumbnail_url ?? post.media_url ?? post.image;
  const caption = isFacebook ? post.caption : post.caption;
  const likeCount = isFacebook ? post.like_count : post.like_count;
  const commentsCount = isFacebook ? post.comments_count : post.comments_count;
  const permalink = isFacebook ? post.permalink_url : post.permalink;
  const timestamp = isFacebook ? post.timestamp : post.timestamp;

  const formattedDate = timestamp
    ? new Date(timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link
        href="/posts"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to Posts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: image */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square">
            {thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt={caption ?? 'Post'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">📸</div>
            )}
          </div>
          {caption && (
            <div className="rounded-xl bg-white border border-gray-200 p-4">
              <p className="text-xs text-gray-400 mb-1.5 uppercase tracking-wider font-medium">Caption</p>
              <p className="text-sm text-gray-700 leading-relaxed">{caption}</p>
            </div>
          )}
        </div>

        {/* Right: metrics + details */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-white border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-medium">Metrics</p>
            <MetricRow label="Likes" value={likeCount} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            } />
            <MetricRow label="Comments" value={commentsCount} icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            } />
            {!isFacebook && !isLinkedIn && <>
              <MetricRow label="Reach" value={insights.reach} icon="👁" />
              <MetricRow label="Impressions" value={insights.impressions} icon="📊" />
              <MetricRow label="Saved" value={insights.saved} icon="🔖" />
              {insights.video_views !== undefined && <MetricRow label="Video Views" value={insights.video_views} icon="▶" />}
            </>}
          </div>

          <div className="rounded-xl bg-white border border-gray-200 p-5">
            <p className="text-xs text-gray-400 mb-3 uppercase tracking-wider font-medium">Details</p>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform</span>
                <span className="font-medium" style={{ color: isFacebook ? '#1877F2' : isLinkedIn ? '#0A66C2' : '#833ab4' }}>
                  {isFacebook ? 'Facebook' : isLinkedIn ? 'LinkedIn' : 'Instagram'}
                </span>
              </div>
              {!isFacebook && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type</span>
                  <span className="text-gray-700 capitalize">{post.media_type?.replace('_', ' ').toLowerCase() ?? '—'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm gap-4">
                <span className="text-gray-500 flex-shrink-0">Published</span>
                <span className="text-gray-700 text-right text-xs leading-relaxed">{formattedDate}</span>
              </div>
            </div>
            {permalink && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
                >
                  View on {isFacebook ? 'Facebook' : isLinkedIn ? 'LinkedIn' : 'Instagram'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Comments
          {comments.length > 0 && <span className="ml-2 text-sm text-gray-400 font-normal">({comments.length})</span>}
        </h2>
        <div className="rounded-xl bg-white border border-gray-200 p-5">
          <CommentThreads comments={comments} mediaId={id} postCaption={caption ?? ''} platform={platform} />
        </div>
      </div>
    </div>
  );
}
