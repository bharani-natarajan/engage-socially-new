import { NextResponse } from 'next/server';
import { requireUnipileFbAuth } from '@/lib/tokens';
import { getPosts, normalizeFbPost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  try {
    const result = await getPosts(tokens.accountId);
    const posts = (result.items ?? result.data ?? []).map(normalizeFbPost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
