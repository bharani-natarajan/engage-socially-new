import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireUnipileAuth } from '@/lib/tokens';
import { getPosts, getPostComments, normalizePost, normalizeComment } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const store = await cookies();
  const orgId = store.get('li_org_id')?.value || null;

  try {
    const result = await getPosts(tokens.accountId, orgId);
    const rawPosts = result.items ?? result.data ?? [];
    const posts = rawPosts.map(normalizePost);

    const totalPosts = posts.length;
    const totalLikes = posts.reduce((s, p) => s + (p.like_count ?? 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0);

    const last10 = posts.slice(0, 10).map((p) => ({
      id: p.id,
      caption: p.caption,
      comments: p.comments_count ?? 0,
      timestamp: p.timestamp,
    }));

    const avgCommentsPerPost = totalPosts > 0 ? Math.round((totalComments / totalPosts) * 10) / 10 : 0;

    const postsToCheck = posts.slice(0, 3);
    let repliedCount = 0;
    let unansweredCount = 0;
    const commenterMap = {};
    const unansweredComments = [];

    await Promise.all(
      postsToCheck.map(async (post) => {
        try {
          const commentsData = await getPostComments(post.id, tokens.accountId);
          const comments = (commentsData.items ?? commentsData.data ?? []).map(normalizeComment);
          for (const c of comments) {
            const hasReply = (c.replies?.data?.length ?? 0) > 0;
            if (hasReply) {
              repliedCount++;
            } else {
              unansweredCount++;
              if (unansweredComments.length < 5) {
                unansweredComments.push({
                  commentId: c.id,
                  postId: post.id,
                  text: c.text,
                  username: c.from?.name ?? c.username,
                  postCaption: post.caption,
                  timestamp: c.timestamp,
                });
              }
            }
            const name = c.from?.name ?? c.username;
            if (name) commenterMap[name] = (commenterMap[name] ?? 0) + 1;
          }
        } catch { /* skip posts with inaccessible comments */ }
      })
    );

    const checkedTotal = repliedCount + unansweredCount;

    const topCommenters = Object.entries(commenterMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([username, count]) => ({ username, count }));

    const uniqueCommenters = Object.keys(commenterMap).length;

    const latestPost = posts[0];
    const latestPostPreview = latestPost
      ? {
          image: latestPost.media_url ?? latestPost.thumbnail_url ?? null,
          likes: latestPost.like_count ?? 0,
          comments: latestPost.comments_count ?? 0,
          permalink: latestPost.permalink_url ?? null,
          id: latestPost.id,
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
    console.error('[LinkedIn dashboard error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
