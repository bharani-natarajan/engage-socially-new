import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getPosts, normalizePost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  try {
    const result = await getPosts(tokens.accountId);
    const posts = (result.items ?? result.data ?? []).map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
