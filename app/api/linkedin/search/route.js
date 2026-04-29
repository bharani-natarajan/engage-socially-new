import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { searchLinkedInPosts, normalizeSearchPost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { keywords, cursor, datePosted } = await request.json();
  if (!keywords?.trim()) {
    return NextResponse.json({ error: 'keywords is required' }, { status: 400 });
  }

  try {
    const result = await searchLinkedInPosts(tokens.accountId, keywords.trim(), { cursor, datePosted });
    const raw = result.items ?? result.data ?? result.posts ?? [];
    const posts = raw.map(normalizeSearchPost);
    return NextResponse.json({ data: posts, cursor: result.paging?.cursor ?? result.next_cursor ?? null });
  } catch (err) {
    console.error('[LinkedIn search error]', err.message.slice(0, 800));
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
