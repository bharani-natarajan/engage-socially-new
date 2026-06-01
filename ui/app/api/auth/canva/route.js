import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generatePkce, buildAuthUrl } from '@/lib/canva';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET() {
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'CANVA_CLIENT_ID not configured' }, { status: 500 });
  }

  const { verifier, challenge } = generatePkce();
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${APP_URL}/api/auth/canva/callback`;
  const authUrl = buildAuthUrl(clientId, redirectUri, challenge, state);

  const isHttps = APP_URL?.startsWith('https');
  const cookieBase = {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 600, // 10 minutes for PKCE state
  };

  const store = await cookies();
  // Clear any stale tokens so the callback stores fresh ones
  store.delete('canva_access_token');
  store.delete('canva_refresh_token');
  store.delete('canva_connected');
  store.set('canva_pkce_verifier', verifier, cookieBase);
  store.set('canva_oauth_state', state, cookieBase);

  return NextResponse.redirect(authUrl);
}
