import { NextResponse } from 'next/server';
import { requireUnipileFbAuth } from '@/lib/tokens';
import { deletePost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function DELETE(_request, { params }) {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  const { postId } = await params;

  try {
    await deletePost(postId, tokens.accountId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
