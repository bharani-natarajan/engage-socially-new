import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getPosts, normalizePost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || null;

  try {
    const result = await getPosts(tokens.accountId, orgId);
    const posts = (result.items ?? result.data ?? []).map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    console.error('[LinkedIn posts error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
