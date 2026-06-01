import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/bigin';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/leads?bigin_error=${encodeURIComponent(error)}`);
  }

  const store = await cookies();
  const savedState = store.get('bigin_oauth_state')?.value;

  if (!code || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/leads?bigin_error=invalid_state`);
  }

  try {
    const redirectUri = `${APP_URL}/api/auth/bigin/callback`;
    const tokens = await exchangeCode(code, redirectUri);

    const isHttps = APP_URL?.startsWith('https');
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };

    store.set('bigin_access_token', tokens.access_token, base);
    if (tokens.refresh_token) {
      store.set('bigin_refresh_token', tokens.refresh_token, base);
    }
    store.set('bigin_connected', '1', { ...base, httpOnly: false });
    store.delete('bigin_oauth_state');

    return NextResponse.redirect(`${APP_URL}/leads?bigin_connected=1`);
  } catch (err) {
    console.error('[Bigin OAuth error]', err.message);
    return NextResponse.redirect(`${APP_URL}/leads?bigin_error=${encodeURIComponent(err.message)}`);
  }
}
