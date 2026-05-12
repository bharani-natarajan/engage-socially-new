import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { buildAuthUrl } from '@/lib/bigin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET() {
  if (!process.env.ZOHO_CLIENT_ID) {
    return NextResponse.json({ error: 'ZOHO_CLIENT_ID not configured' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${APP_URL}/api/auth/bigin/callback`;
  const authUrl = buildAuthUrl(redirectUri, state);

  const isHttps = APP_URL?.startsWith('https');
  const store = await cookies();
  store.set('bigin_oauth_state', state, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 600,
  });

  return NextResponse.redirect(authUrl);
}
