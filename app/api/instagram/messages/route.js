import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { sendDirectMessage } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  const { recipientId, message } = await request.json();
  if (!recipientId || !message?.trim()) {
    return NextResponse.json(
      { error: 'recipientId and message are required' },
      { status: 400 }
    );
  }

  try {
    const data = await sendDirectMessage(
      tokens.userId,
      recipientId,
      message.trim(),
      tokens.accessToken
    );
    return NextResponse.json(data);
  } catch (err) {
    console.error('[DM error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
