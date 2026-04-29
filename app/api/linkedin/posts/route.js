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
    console.log('[LinkedIn posts] raw keys:', Object.keys(result), 'first few items:', JSON.stringify(result).slice(0, 300));
    const posts = (result.items ?? result.data ?? []).map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    console.error('[LinkedIn posts error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
