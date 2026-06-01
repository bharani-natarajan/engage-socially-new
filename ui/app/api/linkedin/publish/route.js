import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { createPost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  const { imageUrl, caption, orgId } = await request.json();

  try {
    const result = await createPost(tokens.accountId, caption ?? '', imageUrl ?? null, orgId ?? null);
    return NextResponse.json({ id: result.id ?? result.social_id ?? null });
  } catch (err) {
    console.error('[LinkedIn publish error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
