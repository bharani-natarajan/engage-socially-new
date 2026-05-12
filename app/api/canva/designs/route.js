import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listDesigns, refreshAccessToken } from '@/lib/canva';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

async function getAccessToken(store) {
  const access = store.get('canva_access_token')?.value;
  if (access) return access;

  // Try refresh
  const refresh = store.get('canva_refresh_token')?.value;
  if (!refresh) return null;

  const tokens = await refreshAccessToken(refresh);
  const isHttps = APP_URL?.startsWith('https');
  const base = { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/', maxAge: 365 * 24 * 60 * 60 };
  store.set('canva_access_token', tokens.access_token, base);
  if (tokens.refresh_token) store.set('canva_refresh_token', tokens.refresh_token, base);
  return tokens.access_token;
}

// GET /api/canva/designs?continuation=xxx
export async function GET(request) {
  const store = await cookies();
  const accessToken = await getAccessToken(store).catch(() => null);

  if (!accessToken) {
    return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const continuation = searchParams.get('continuation') ?? null;

  try {
    const data = await listDesigns(accessToken, continuation);
    return NextResponse.json(data);
  } catch (err) {
    if (err.message?.includes('401') || err.message?.toLowerCase().includes('unauthorized')) {
      return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
