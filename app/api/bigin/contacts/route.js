import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createContact, refreshAccessToken } from '@/lib/bigin';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

async function getAccessToken(store) {
  const access = store.get('bigin_access_token')?.value;
  if (access) return access;

  const refresh = store.get('bigin_refresh_token')?.value;
  if (!refresh) return null;

  const tokens = await refreshAccessToken(refresh);
  const isHttps = APP_URL?.startsWith('https');
  const base = { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/', maxAge: 365 * 24 * 60 * 60 };
  store.set('bigin_access_token', tokens.access_token, base);
  return tokens.access_token;
}

// POST /api/bigin/contacts  { lead: { ... } }
export async function POST(request) {
  const store = await cookies();
  let accessToken = await getAccessToken(store).catch(() => null);

  if (!accessToken) {
    return NextResponse.json({ error: 'bigin_not_connected' }, { status: 401 });
  }

  const { lead } = await request.json();
  if (!lead) {
    return NextResponse.json({ error: 'lead is required' }, { status: 400 });
  }

  try {
    const result = await createContact(accessToken, lead);
    // Bigin returns { data: [{ code, details, message, status }] }
    const item = result?.data?.[0];
    if (item?.code === 'SUCCESS' || item?.status === 'success') {
      return NextResponse.json({ ok: true, contactId: item?.details?.id ?? null });
    }
    // Token may have expired mid-request — try refresh once
    if (item?.code === 'INVALID_TOKEN' || item?.message?.toLowerCase().includes('token')) {
      const refresh = store.get('bigin_refresh_token')?.value;
      if (!refresh) return NextResponse.json({ error: 'bigin_not_connected' }, { status: 401 });
      const tokens = await refreshAccessToken(refresh);
      const isHttps = APP_URL?.startsWith('https');
      store.set('bigin_access_token', tokens.access_token, { httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/', maxAge: 365 * 24 * 60 * 60 });
      const retry = await createContact(tokens.access_token, lead);
      const retryItem = retry?.data?.[0];
      if (retryItem?.code === 'SUCCESS' || retryItem?.status === 'success') {
        return NextResponse.json({ ok: true, contactId: retryItem?.details?.id ?? null });
      }
      return NextResponse.json({ error: retryItem?.message ?? 'Bigin error' }, { status: 500 });
    }
    return NextResponse.json({ error: item?.message ?? 'Bigin error' }, { status: 500 });
  } catch (err) {
    console.error('[Bigin contact error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
