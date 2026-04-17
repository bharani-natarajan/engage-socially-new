import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { getMedia, getComments } from '@/lib/instagram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const { error, tokens } = await requireAuth();
  if (error) return error;
  const { userId, accessToken: token } = tokens;

  try {
    const mediaData = await getMedia(userId, token);
    const posts = mediaData.data ?? [];

    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + (p.like_count ?? 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.comments_count ?? 0), 0);

    // Fetch comments for up to 8 most recent posts to find unanswered ones
    const recent = posts.slice(0, 8);
    const commentResults = await Promise.allSettled(
      recent.map((p) => getComments(p.id, token).then((r) => ({ post: p, comments: r.data ?? [] })))
    );

    const unanswered = [];
    const uniqueIds = new Set();

    for (const result of commentResults) {
      if (result.status !== 'fulfilled') continue;
      const { post, comments } = result.value;
      for (const comment of comments) {
        if (comment.from?.id) uniqueIds.add(comment.from.id);
        const hasReply = comment.replies?.data?.length > 0;
        if (!hasReply) {
          unanswered.push({
            commentId: comment.id,
            text: comment.text,
            username: comment.username,
            timestamp: comment.timestamp,
            postId: post.id,
            postCaption: post.caption ?? '',
            postThumb: post.thumbnail_url ?? post.media_url ?? null,
          });
        }
      }
    }

    // Total comments checked across the recent posts
    const checkedTotal = commentResults
      .filter((r) => r.status === 'fulfilled')
      .reduce((sum, r) => sum + r.value.comments.length, 0);
    const unansweredCount = unanswered.length;
    const repliedCount = checkedTotal - unansweredCount;

    // Sort unanswered by most recent first, cap at 20
    unanswered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Last 10 posts with comment counts for graph
    const last10 = posts.slice(0, 10).map((p) => ({
      id: p.id,
      comments: p.comments_count ?? 0,
    }));
    const avgCommentsPerPost = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;

    const latestPost = posts[0];
    const latestPostPreview = latestPost ? {
      image: latestPost.thumbnail_url ?? latestPost.media_url ?? null,
      likes: latestPost.like_count ?? 0,
      comments: latestPost.comments_count ?? 0,
      permalink: latestPost.permalink ?? null,
    } : null;

    return NextResponse.json({
      totalPosts,
      totalLikes,
      totalComments,
      uniqueCommenters: uniqueIds.size,
      unansweredComments: unanswered.slice(0, 20),
      checkedTotal,
      unansweredCount,
      repliedCount,
      last10,
      avgCommentsPerPost,
      latestPostPreview,
    });
  } catch (err) {
    console.error('[Dashboard error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
