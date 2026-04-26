import { NextResponse } from 'next/server';
import { requireLinkedInAuth } from '@/lib/tokens';
import { getPosts, normalizePost } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireLinkedInAuth();
  if (error) return error;

  try {
    const result = await getPosts(tokens.personUrn, tokens.accessToken);
    const posts = (result.elements ?? []).map(normalizePost);
    return NextResponse.json({ data: posts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
