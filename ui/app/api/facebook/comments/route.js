import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { getPostComments, replyToComment, normalizeComment } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('mediaId'); // same param name as Instagram for UI compatibility

  if (!postId) return NextResponse.json({ error: 'mediaId required' }, { status: 400 });

  try {
    const data = await getPostComments(postId, tokens.pageToken);
    const comments = (data.data ?? []).map(normalizeComment);
    return NextResponse.json({ data: comments });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const { commentId, message } = await request.json();
    if (!commentId || !message) {
      return NextResponse.json({ error: 'commentId and message required' }, { status: 400 });
    }
    const data = await replyToComment(commentId, message, tokens.pageToken);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
