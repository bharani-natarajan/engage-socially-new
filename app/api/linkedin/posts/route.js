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
    // r_member_social not approved — return empty list so the UI degrades gracefully
    if (err.message?.includes('permission') || err.message?.includes('403') || err.message?.includes('ACCESS_DENIED')) {
      return NextResponse.json({ data: [], _notice: 'r_member_social scope not available' });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
