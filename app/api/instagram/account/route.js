import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { getAccount } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  try {
    const data = await getAccount(tokens.userId, tokens.accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
