import { NextResponse } from 'next/server';
import { getUnipileTokens } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { accountId } = await getUnipileTokens();
  if (!accountId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({ userId: accountId });
}
