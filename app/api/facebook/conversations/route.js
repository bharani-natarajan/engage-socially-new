import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { getConversations, normalizeConversation } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const data = await getConversations(tokens.pageId, tokens.pageToken);
    const conversations = (data.data ?? []).map(normalizeConversation);
    return NextResponse.json({ data: conversations });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
