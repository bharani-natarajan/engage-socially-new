import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createContact, refreshAccessToken } from '@/lib/bigin';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

function isTokenError(msg) {
  return /invalid.*(oauth|token)|token.*(invalid|expired)/i.test(msg ?? '');
}

async function freshAccessToken(store) {
  const refresh = store.get('bigin_refresh_token')?.value ?? process.env.ZOHO_REFRESH_TOKEN;
  if (!refresh) return null;
  const tokens = await refreshAccessToken(refresh);
  const isHttps = APP_URL?.startsWith('https');
  store.set('bigin_access_token', tokens.access_token, {
    httpOnly: true, secure: isHttps, sameSite: isHttps ? 'none' : 'lax', path: '/', maxAge: 3600,
  });
  return tokens.access_token;
}

async function getAccessToken(store) {
  const access = store.get('bigin_access_token')?.value;
  if (access) return access;
  return freshAccessToken(store);
}

function resultOk(result) {
  const item = result?.data?.[0];
  return item?.code === 'SUCCESS' || item?.status === 'success'
    ? { ok: true, contactId: item?.details?.id ?? null }
    : null;
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
    const good = resultOk(result);
    if (good) return NextResponse.json(good);
    return NextResponse.json({ error: result?.data?.[0]?.message ?? 'Bigin error' }, { status: 500 });
  } catch (err) {
    if (!isTokenError(err.message)) {
      console.error('[Bigin contact error]', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

    // Token expired — clear cached token, refresh, retry once
    store.delete('bigin_access_token');
    const newToken = await freshAccessToken(store).catch(() => null);
    if (!newToken) return NextResponse.json({ error: 'bigin_not_connected' }, { status: 401 });

    try {
      const retry = await createContact(newToken, lead);
      const good = resultOk(retry);
      if (good) return NextResponse.json(good);
      return NextResponse.json({ error: retry?.data?.[0]?.message ?? 'Bigin error' }, { status: 500 });
    } catch (retryErr) {
      console.error('[Bigin contact retry error]', retryErr.message);
      return NextResponse.json({ error: retryErr.message }, { status: 500 });
    }
  }
}
