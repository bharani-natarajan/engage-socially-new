import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getPosts, normalizePost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  try {
    const result = await getPosts(tokens.accountId);
    console.log('[LinkedIn posts] raw keys:', Object.keys(result), 'count:', (result.items ?? result.data ?? result.items ?? []).length);
    const posts = (result.items ?? result.data ?? []).map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    console.error('[LinkedIn posts error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
