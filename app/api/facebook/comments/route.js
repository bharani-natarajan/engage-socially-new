import { NextResponse } from 'next/server';
import { requireUnipileFbAuth } from '@/lib/tokens';
import { getPostComments, replyToComment, normalizeFbComment } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('mediaId');

  if (!postId) return NextResponse.json({ error: 'mediaId required' }, { status: 400 });

  try {
    const result = await getPostComments(postId, tokens.accountId);
    const comments = (result.items ?? result.data ?? []).map(normalizeFbComment);
    return NextResponse.json({ data: comments });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  try {
    const { commentId, message, postId } = await request.json();
    if (!commentId || !message) {
      return NextResponse.json({ error: 'commentId and message required' }, { status: 400 });
    }
    const data = await replyToComment(postId, commentId, message, tokens.accountId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
