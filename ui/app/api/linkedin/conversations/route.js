import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getChats, normalizeChat } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  try {
    const data = await getChats(tokens.accountId);
    const chats = (data.items ?? data.data ?? []).map(normalizeChat);
    return NextResponse.json({ data: chats });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
