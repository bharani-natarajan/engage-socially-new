import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const BASE = 'https://graph.facebook.com/v25.0';

export async function DELETE(request, { params }) {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  const { postId } = await params;

  try {
    const url = new URL(`${BASE}/${postId}`);
    url.searchParams.set('access_token', tokens.pageToken);
    const res = await fetch(url.toString(), { method: 'DELETE', cache: 'no-store' });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
