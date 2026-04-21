import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { getPagePosts, normalizePost } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const data = await getPagePosts(tokens.pageId, tokens.pageToken);
    const posts = (data.data ?? []).map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
