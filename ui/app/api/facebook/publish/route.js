import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { publishPhoto } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const { imageUrl, caption } = await request.json();
    if (!imageUrl) return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });

    const data = await publishPhoto(tokens.pageId, imageUrl, caption, tokens.pageToken);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
