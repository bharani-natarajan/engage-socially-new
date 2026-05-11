import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { getPostById, getPostComments, normalizeIgPost, normalizeComment } from '@/lib/unipile';
import { getMediaInsights } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  const { postId } = await params;

  try {
    const raw = await getPostById(postId, tokens.accountId);
    const post = normalizeIgPost(raw);

    let insights = null;
    const store = await cookies();
    const igToken = store.get('ig_access_token')?.value;
    if (igToken) {
      try {
        const rawInsights = await getMediaInsights(postId, igToken, 'IMAGE');
        insights = Object.fromEntries(
          (rawInsights.data ?? []).map((m) => [m.name, m.values?.[0]?.value ?? m.value ?? 0])
        );
      } catch { /* insights not available */ }
    }

    return NextResponse.json({ ...post, insights });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
