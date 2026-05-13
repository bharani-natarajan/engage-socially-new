import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await cookies();
  const connected = !!(store.get('bigin_access_token')?.value || store.get('bigin_refresh_token')?.value);
  return NextResponse.json({ connected });
}
