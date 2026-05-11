import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/unipile';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const allParams = Object.fromEntries(searchParams.entries());
  console.log('[Unipile IG callback] query params:', JSON.stringify(allParams));

  const accountId =
    searchParams.get('account_id') ||
    searchParams.get('accountId') ||
    searchParams.get('id') ||
    searchParams.get('account');

  if (!accountId) {
    console.error('[Unipile IG callback] No account_id in params:', allParams);
    return NextResponse.redirect(
      `${APP_URL}/settings?ig_error=${encodeURIComponent('No account ID returned')}`
    );
  }

  try {
    const account = await getAccount(accountId);
    console.log('[Unipile IG callback] account:', JSON.stringify(account));

    const name =
      account.name ??
      account.username ??
      account.connection_params?.username ??
      'Instagram Account';

    const isHttps = APP_URL.startsWith('https');
    const store = await cookies();
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };
    store.set('unipile_ig_account_id', accountId, base);
    store.set('unipile_ig_name', name, { ...base, httpOnly: false });

    return NextResponse.redirect(`${APP_URL}/settings?ig_connected=true`);
  } catch (err) {
    console.error('[Unipile IG callback error]', err.message);
    return NextResponse.redirect(
      `${APP_URL}/settings?ig_error=${encodeURIComponent(err.message)}`
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[Unipile IG notify_url]', JSON.stringify(body));

    const accountId = body.account_id;
    if (!accountId || body.status !== 'CREATION_SUCCESS') {
      return NextResponse.json({ ok: true });
    }

    const account = await getAccount(accountId);
    const name =
      account.name ??
      account.username ??
      account.connection_params?.username ??
      'Instagram Account';

    const isHttps = APP_URL.startsWith('https');
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };

    const store = await cookies();
    store.set('unipile_ig_account_id', accountId, base);
    store.set('unipile_ig_name', name, { ...base, httpOnly: false });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Unipile IG notify_url error]', err.message);
    return NextResponse.json({ ok: true });
  }
}
