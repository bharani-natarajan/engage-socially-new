import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const store = await cookies();
  const allCookies = store.getAll();

  return NextResponse.json({
    cookieCount: allCookies.length,
    cookieNames: allCookies.map((c) => c.name),
    hasAccessToken: !!store.get('ig_access_token')?.value,
    hasUserId: !!store.get('ig_user_id')?.value,
    username: store.get('ig_username')?.value ?? null,
    requestHeaders: {
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      cookie: request.headers.get('cookie') ? '[present]' : '[missing]',
    },
  });
}
