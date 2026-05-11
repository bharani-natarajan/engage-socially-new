import { NextResponse } from 'next/server';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { getChatMessages, normalizeChatMessage } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const result = await getChatMessages(id);
    const messages = (result.items ?? result.data ?? []).map(normalizeChatMessage);
    return NextResponse.json({ data: messages });
  } catch (err) {
    console.error('[IG messages error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
