import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getPosts, getAccount, normalizePost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId') || null;

  try {
    const acct = await getAccount(tokens.accountId);
    console.log('[LinkedIn account] keys:', Object.keys(acct), 'full:', JSON.stringify(acct).slice(0, 500));
    const result = await getPosts(tokens.accountId, orgId);
    const rawPosts = result.items ?? result.data ?? [];
    console.log('[LinkedIn posts] count:', rawPosts.length, 'first post keys:', rawPosts[0] ? Object.keys(rawPosts[0]) : 'none');
    if (rawPosts[0]) console.log('[LinkedIn posts] first post sample:', JSON.stringify(rawPosts[0]).slice(0, 400));
    const posts = rawPosts.map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    console.error('[LinkedIn posts error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
