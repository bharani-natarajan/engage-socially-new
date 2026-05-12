import { NextResponse } from 'next/server';
import { requireFbAuth } from '@/lib/tokens';
import { getConversationMessages } from '@/lib/facebook';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { tokens, error } = await requireFbAuth();
  if (error) return error;

  try {
    const { id } = await params;
    const data = await getConversationMessages(id, tokens.pageToken);
    const messages = (data.data ?? []).map((m) => ({
      id: m.id,
      text: m.message ?? '',
      from: { username: m.from?.name ?? 'Unknown', id: m.from?.id },
      timestamp: m.created_time,
    }));
    return NextResponse.json({ data: messages });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
