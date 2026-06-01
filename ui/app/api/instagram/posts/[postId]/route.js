import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { getMediaById, getMediaInsights } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  const { postId } = await params;

  try {
    const post = await getMediaById(postId, tokens.accessToken);

    let insights = null;
    try {
      const raw = await getMediaInsights(postId, tokens.accessToken, post.media_type);
      insights = Object.fromEntries(
        (raw.data ?? []).map((m) => [m.name, m.values?.[0]?.value ?? m.value ?? 0])
      );
    } catch {
      // Insights not available for all media types
    }

    return NextResponse.json({ ...post, insights });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
