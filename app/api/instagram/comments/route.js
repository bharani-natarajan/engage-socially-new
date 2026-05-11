import { NextResponse } from 'next/server';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { getPostComments, replyToComment, normalizeComment } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  const mediaId = new URL(request.url).searchParams.get('mediaId');
  if (!mediaId) return NextResponse.json({ error: 'mediaId is required' }, { status: 400 });

  try {
    const result = await getPostComments(mediaId, tokens.accountId);
    const comments = (result.items ?? result.data ?? []).map(normalizeComment);
    return NextResponse.json({ data: comments });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  const { commentId, message, postId } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  try {
    const data = await replyToComment(postId, commentId, message.trim(), tokens.accountId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
