import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { replyToComment } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { commentId, message, postId } = await request.json();
  if (!commentId || !message || !postId) {
    return NextResponse.json({ error: 'commentId, message and postId are required' }, { status: 400 });
  }

  try {
    const result = await replyToComment(postId, commentId, message, tokens.accountId);
    return NextResponse.json({ id: result.id ?? null });
  } catch (err) {
    console.error('[LinkedIn reply error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
