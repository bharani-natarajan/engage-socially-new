import { NextResponse } from 'next/server';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { createPost } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  const { imageUrl, caption } = await request.json();
  if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

  try {
    const data = await createPost(tokens.accountId, caption ?? '', imageUrl);
    return NextResponse.json({ id: data.id ?? data.post_id });
  } catch (err) {
    console.error('[IG publish error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
