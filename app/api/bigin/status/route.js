import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const store = await cookies();
  const hascookie = !!(store.get('bigin_access_token')?.value || store.get('bigin_refresh_token')?.value);
  const hasEnv = !!process.env.ZOHO_REFRESH_TOKEN;
  return NextResponse.json({ connected: hascookie || hasEnv });
}
