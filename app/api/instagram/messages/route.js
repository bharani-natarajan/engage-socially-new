import { NextResponse } from 'next/server';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { startNewChat } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  const { recipientId, message } = await request.json();
  if (!recipientId || !message?.trim()) {
    return NextResponse.json({ error: 'recipientId and message are required' }, { status: 400 });
  }

  try {
    const data = await startNewChat(tokens.accountId, [recipientId], message.trim());
    return NextResponse.json(data);
  } catch (err) {
    console.error('[IG DM error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
