import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccounts } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET() {
  try {
    const result = await getAccounts();
    const accounts = result.items ?? result.data ?? result.accounts ?? [];

    const isHttps = APP_URL?.startsWith('https');
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };

    const store = await cookies();
    const connected = {};
    const stopped = {};

    for (const account of accounts) {
      const provider = (account.provider ?? account.type ?? '').toUpperCase();
      const name =
        account.name ??
        account.username ??
        account.connection_params?.username ??
        provider;
      const isStopped = (account.status ?? '').toUpperCase() === 'STOPPED';

      if (provider === 'LINKEDIN') {
        store.set('unipile_account_id', account.id, { ...base, httpOnly: false });
        store.set('unipile_name', name, { ...base, httpOnly: false });
        if (isStopped) stopped.linkedin = { id: account.id, name };
        else connected.linkedin = name;
      }
    }

    return NextResponse.json({ ok: true, connected, stopped });
  } catch (err) {
    console.error('[Unipile sync error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
