import { NextResponse } from 'next/server';
import { requireUnipileFbAuth } from '@/lib/tokens';
import { startNewChat } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  try {
    const { recipientId, message } = await request.json();
    if (!recipientId || !message) {
      return NextResponse.json({ error: 'recipientId and message required' }, { status: 400 });
    }
    const data = await startNewChat(tokens.accountId, [recipientId], message);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
