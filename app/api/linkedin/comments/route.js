import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getPostComments, normalizeComment, replyToComment } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('mediaId');
  if (!mediaId) return NextResponse.json({ error: 'mediaId is required' }, { status: 400 });

  try {
    const result = await getPostComments(decodeURIComponent(mediaId), tokens.accountId);
    const raw = result.items ?? result.data ?? [];
    if (raw[0]) console.log('[LI comment sample]', JSON.stringify(raw[0]).slice(0, 600));
    const comments = raw.map(normalizeComment);
    return NextResponse.json({ data: comments });
  } catch (err) {
    console.error('[LinkedIn comments GET error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { commentId, message, postId } = await request.json();
  if (!message || !postId) {
    return NextResponse.json({ error: 'message and postId are required' }, { status: 400 });
  }

  try {
    const result = await replyToComment(postId, commentId ?? null, message, tokens.accountId);
    return NextResponse.json({ id: result.id ?? null });
  } catch (err) {
    console.error('[LinkedIn reply error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
