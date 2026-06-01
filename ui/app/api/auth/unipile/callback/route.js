import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/unipile';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // Log everything Unipile sends back so we can see the exact param name
  const allParams = Object.fromEntries(searchParams.entries());
  console.log('[Unipile callback] query params:', JSON.stringify(allParams));

  // Try all known possible parameter names Unipile might use
  const accountId =
    searchParams.get('account_id') ||
    searchParams.get('accountId') ||
    searchParams.get('id') ||
    searchParams.get('account');

  if (!accountId) {
    console.error('[Unipile callback] No account_id found in params:', allParams);
    return NextResponse.redirect(
      `${APP_URL}/settings?li_error=${encodeURIComponent('No account ID returned — check server logs')}`
    );
  }

  try {
    const account = await getAccount(accountId);
    console.log('[Unipile callback] account object:', JSON.stringify(account));

    const name =
      account.name ??
      account.username ??
      account.connection_params?.username ??
      'LinkedIn User';

    const isHttps = APP_URL.startsWith('https');
    const store = await cookies();
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };
    store.set('unipile_account_id', accountId, base);
    store.set('unipile_name', name, { ...base, httpOnly: false });

    return NextResponse.redirect(`${APP_URL}/settings?li_connected=true`);
  } catch (err) {
    console.error('[Unipile callback error]', err.message);
    return NextResponse.redirect(
      `${APP_URL}/settings?li_error=${encodeURIComponent(err.message)}`
    );
  }
}

// Unipile also POSTs to notify_url — handle that here too
export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[Unipile notify_url]', JSON.stringify(body));

    const accountId = body.account_id;
    if (!accountId || body.status !== 'CREATION_SUCCESS') {
      return NextResponse.json({ ok: true });
    }

    const account = await getAccount(accountId);
    const name =
      account.name ??
      account.username ??
      account.connection_params?.username ??
      'LinkedIn User';

    const isHttps = APP_URL.startsWith('https');
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };

    const store = await cookies();
    store.set('unipile_account_id', accountId, base);
    store.set('unipile_name', name, { ...base, httpOnly: false });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Unipile notify_url error]', err.message);
    return NextResponse.json({ ok: true }); // always 200 to Unipile
  }
}
