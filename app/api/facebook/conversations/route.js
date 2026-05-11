import { NextResponse } from 'next/server';
import { requireUnipileFbAuth } from '@/lib/tokens';
import { getChats, normalizeChat } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  try {
    const result = await getChats(tokens.accountId);
    const conversations = (result.items ?? result.data ?? []).map(normalizeChat);
    return NextResponse.json({ data: conversations });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
