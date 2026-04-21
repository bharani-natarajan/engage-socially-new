import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { getPagePosts, getPostComments, normalizePost, normalizeComment } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const postsData = await getPagePosts(tokens.pageId, tokens.pageToken);
    const rawPosts = postsData.data ?? [];
    const posts = rawPosts.map(normalizePost);

    const totalPosts = posts.length;
    const totalLikes = posts.reduce((s, p) => s + (p.like_count ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0);

    // Last 10 posts for bar chart
    const last10 = posts.slice(0, 10).map((p) => ({
      id: p.id,
      caption: p.caption,
      comments_count: p.comments_count,
      timestamp: p.timestamp,
    }));

    const avgCommentsPerPost = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0;

    // Fetch comments from last 3 posts to compute replied/unanswered + top commenters
    const postsToCheck = posts.slice(0, 3);
    let repliedCount = 0;
    let unansweredCount = 0;
    const commenterMap = {};
    const unansweredComments = [];

    await Promise.all(
      postsToCheck.map(async (post) => {
        try {
          const commentsData = await getPostComments(post.id, tokens.pageToken);
          const comments = (commentsData.data ?? []).map(normalizeComment);
          for (const c of comments) {
            const hasReply = (c.replies?.data?.length ?? 0) > 0;
            if (hasReply) {
              repliedCount++;
            } else {
              unansweredCount++;
              if (unansweredComments.length < 5) {
                unansweredComments.push({
                  commentId: c.id,
                  text: c.text,
                  username: c.username,
                  postCaption: post.caption,
                  timestamp: c.timestamp,
                });
              }
            }
            if (c.username) {
              commenterMap[c.username] = (commenterMap[c.username] ?? 0) + 1;
            }
          }
        } catch {
          // skip posts with inaccessible comments
        }
      })
    );

    const checkedTotal = repliedCount + unansweredCount;

    const topCommenters = Object.entries(commenterMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, count]) => ({ username, count }));

    // Unique commenters count
    const uniqueCommenters = Object.keys(commenterMap).length;

    // Latest post preview (with media if available)
    const latestWithMedia = posts.find((p) => p.media_url) ?? posts[0];
    const latestPostPreview = latestWithMedia
      ? {
          id: latestWithMedia.id,
          media_url: latestWithMedia.media_url,
          like_count: latestWithMedia.like_count,
          comments_count: latestWithMedia.comments_count,
          caption: latestWithMedia.caption,
          timestamp: latestWithMedia.timestamp,
          permalink_url: latestWithMedia.permalink_url,
          _platform: 'facebook',
        }
      : null;

    return NextResponse.json({
      totalPosts,
      totalLikes,
      totalComments,
      uniqueCommenters,
      unansweredComments,
      checkedTotal,
      unansweredCount,
      repliedCount,
      last10,
      avgCommentsPerPost,
      topCommenters,
      latestPostPreview,
    });
  } catch (err) {
    console.error('[Facebook dashboard error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
