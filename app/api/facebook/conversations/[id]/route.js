import { NextResponse } from 'next/server';
import { requireUnipileFbAuth } from '@/lib/tokens';
import { getChatMessages, normalizeChatMessage } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { tokens, error } = await requireUnipileFbAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const result = await getChatMessages(id);
    const messages = (result.items ?? result.data ?? []).map(normalizeChatMessage);
    return NextResponse.json({ data: messages });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
