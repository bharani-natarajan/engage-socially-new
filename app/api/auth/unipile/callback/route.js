import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/unipile';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id');

  if (!accountId) {
    return NextResponse.redirect(`${APP_URL}/settings?li_error=no_account_id`);
  }

  try {
    // Fetch account to get the LinkedIn display name
    const account = await getAccount(accountId);
    const name = account.name ?? account.username ?? 'LinkedIn User';

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
