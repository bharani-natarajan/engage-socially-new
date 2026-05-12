import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { getComments, replyToComment } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  const mediaId = new URL(request.url).searchParams.get('mediaId');
  if (!mediaId) {
    return NextResponse.json({ error: 'mediaId is required' }, { status: 400 });
  }

  try {
    const data = await getComments(mediaId, tokens.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  const { commentId, message } = await request.json();
  if (!commentId || !message?.trim()) {
    return NextResponse.json(
      { error: 'commentId and message are required' },
      { status: 400 }
    );
  }

  try {
    const data = await replyToComment(commentId, message.trim(), tokens.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
