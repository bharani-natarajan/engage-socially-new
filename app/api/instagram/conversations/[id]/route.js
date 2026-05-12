import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { getConversationMessages } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  try {
    const data = await getConversationMessages(id, tokens.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    console.error('[Messages error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
