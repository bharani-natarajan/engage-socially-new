import { NextResponse } from 'next/server';
import { requireUnipileAuth } from '@/lib/tokens';
import { getChats, getChatAttendees, normalizeChat } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileAuth();
  if (error) return error;

  try {
    const [chatsData, attendeesData] = await Promise.all([
      getChats(tokens.accountId),
      getChatAttendees(tokens.accountId).catch((err) => {
        console.error('[getChatAttendees error]', err.message);
        return { items: [] };
      }),
    ]);

    const attendees = attendeesData.items ?? attendeesData.data ?? [];
    const attendeeMap = new Map();
    for (const a of attendees) {
      if (a.provider_id) attendeeMap.set(a.provider_id, a);
      if (a.id) attendeeMap.set(a.id, a);
    }

    const chats = (chatsData.items ?? chatsData.data ?? []).map((chat) => {
      const normalized = normalizeChat(chat);
      const otherProviderId = chat.attendee_provider_id;
      if (otherProviderId && attendeeMap.has(otherProviderId)) {
        const attendee = attendeeMap.get(otherProviderId);
        normalized.participants = {
          data: [{
            id: attendee.provider_id ?? attendee.id ?? '',
            username: attendee.name ?? attendee.username ?? attendee.provider_id ?? attendee.id ?? 'Unknown',
          }],
        };
      }
      return normalized;
    });

    return NextResponse.json({ data: chats });
  } catch (err) {
    console.error('[Conversations error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
