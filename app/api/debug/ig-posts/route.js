import { NextResponse } from 'next/server';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { getPosts } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

// GET /api/debug/ig-posts — returns raw Unipile response for first 2 posts
export async function GET() {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  try {
    const result = await getPosts(tokens.accountId);
    const first2 = (result.items ?? result.data ?? []).slice(0, 2);
    return NextResponse.json({ raw: first2 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
