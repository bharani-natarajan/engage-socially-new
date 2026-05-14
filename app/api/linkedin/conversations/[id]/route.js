import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getChatMessages, sendMessage, normalizeChatMessage } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { error } = await requireUnipileAuth();
  if (error) return error;

  const { id } = await params;
  try {
    const data = await getChatMessages(id);
    const messages = (data.items ?? data.data ?? []).map(normalizeChatMessage);
    return NextResponse.json({ data: messages });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { error } = await requireUnipileAuth();
  if (error) return error;

  const { id } = await params;
  const { message } = await request.json();
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });

  try {
    const data = await sendMessage(id, message);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
