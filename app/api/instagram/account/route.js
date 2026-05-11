import { NextResponse } from 'next/server';
import { requireUnipileIgAuth } from '@/lib/tokens';
import { getAccount } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { tokens, error } = await requireUnipileIgAuth();
  if (error) return error;

  try {
    const data = await getAccount(tokens.accountId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
