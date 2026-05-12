import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCode } from '@/lib/canva';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/create?canva_error=${encodeURIComponent(error)}`);
  }

  const store = await cookies();
  const savedState = store.get('canva_oauth_state')?.value;
  const verifier = store.get('canva_pkce_verifier')?.value;

  if (!code || !verifier || state !== savedState) {
    return NextResponse.redirect(`${APP_URL}/create?canva_error=invalid_state`);
  }

  try {
    const redirectUri = `${APP_URL}/api/auth/canva/callback`;
    const tokens = await exchangeCode(code, verifier, redirectUri);

    const isHttps = APP_URL?.startsWith('https');
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };

    store.set('canva_access_token', tokens.access_token, base);
    if (tokens.refresh_token) {
      store.set('canva_refresh_token', tokens.refresh_token, base);
    }
    // Readable flag so the client knows Canva is connected
    store.set('canva_connected', '1', { ...base, httpOnly: false });

    // Clean up PKCE cookies
    store.delete('canva_pkce_verifier');
    store.delete('canva_oauth_state');

    return NextResponse.redirect(`${APP_URL}/create?canva_connected=1`);
  } catch (err) {
    console.error('[Canva OAuth error]', err.message);
    return NextResponse.redirect(`${APP_URL}/create?canva_error=${encodeURIComponent(err.message)}`);
  }
}
