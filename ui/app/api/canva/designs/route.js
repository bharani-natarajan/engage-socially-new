import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listDesigns, refreshAccessToken } from '@/lib/canva';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function cookieOpts(isHttps) {
  return { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/', maxAge: 3600 };
}

async function getFreshAccessToken(store) {
  const refresh = store.get('canva_refresh_token')?.value;
  if (!refresh) return null;
  const tokens = await refreshAccessToken(refresh);
  const isHttps = APP_URL?.startsWith('https');
  store.set('canva_access_token', tokens.access_token, cookieOpts(isHttps));
  if (tokens.refresh_token) store.set('canva_refresh_token', tokens.refresh_token, { ...cookieOpts(isHttps), maxAge: 365 * 24 * 60 * 60 });
  return tokens.access_token;
}

async function getAccessToken(store) {
  return store.get('canva_access_token')?.value ?? getFreshAccessToken(store);
}

function isTokenError(msg) {
  if (/scope/i.test(msg ?? '')) return false;
  return /401|unauthorized|invalid.*(token|oauth)|token.*(invalid|expired)/i.test(msg ?? '');
}

// GET /api/canva/designs?continuation=xxx
export async function GET(request) {
  const store = await cookies();
  let accessToken = await getAccessToken(store).catch(() => null);

  if (!accessToken) {
    return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const continuation = searchParams.get('continuation') ?? null;

  try {
    const data = await listDesigns(accessToken, continuation);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err.message ?? '';

    if (isTokenError(msg)) {
      // Access token expired — refresh and retry once
      store.delete('canva_access_token');
      const newToken = await getFreshAccessToken(store).catch(() => null);
      if (!newToken) return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 });
      try {
        const data = await listDesigns(newToken, continuation);
        return NextResponse.json(data);
      } catch {
        return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 });
      }
    }

    if (/scope|forbidden|403/i.test(msg)) {
      return NextResponse.json({ error: 'canva_needs_reauth' }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
