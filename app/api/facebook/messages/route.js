import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { sendMessage } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const { recipientId, message } = await request.json();
    if (!recipientId || !message) {
      return NextResponse.json({ error: 'recipientId and message required' }, { status: 400 });
    }
    const data = await sendMessage(tokens.pageId, recipientId, message, tokens.pageToken);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
