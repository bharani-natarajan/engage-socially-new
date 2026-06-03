import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccounts } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    let userUnipileAccountId = null;

    const isHttps = APP_URL?.startsWith('https');
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
    };

    const store = await cookies();

    if (authHeader) {
      try {
        const meRes = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': authHeader
          }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          userUnipileAccountId = meData.user?.unipileAccountId;

          // Sync database target settings to cookies
          const dbTarget = meData.user?.linkedinPostTarget || 'personal';
          const dbOrgId = meData.user?.linkedinOrgId || '';
          store.set('li_post_target', dbTarget, { ...base, httpOnly: false });
          store.set('li_org_id', dbOrgId, { ...base, httpOnly: false });
        }
      } catch (err) {
        console.error('[Unipile sync auth error]', err.message);
      }
    }

    const result = await getAccounts();
    const accounts = result.items ?? result.data ?? result.accounts ?? [];

    const connected = {};
    const stopped = {};

    // If the database has a different account ID (or none) than our cookie,
    // update the database to link the new account to the current logged-in user.
    const cookieAccountId = store.get('unipile_account_id')?.value;
    if (authHeader && cookieAccountId && cookieAccountId !== userUnipileAccountId) {
      try {
        const updateRes = await fetch(`${API_URL}/auth/unipile-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({ unipileAccountId: cookieAccountId })
        });
        if (updateRes.ok) {
          userUnipileAccountId = cookieAccountId;
        }
      } catch (err) {
        console.error('[Unipile sync db update error]', err.message);
      }
    }

    // Find the account matching the logged-in user's unipileAccountId
    let targetAccount = null;
    if (userUnipileAccountId) {
      targetAccount = accounts.find(account => 
        account.id === userUnipileAccountId && 
        (account.provider ?? account.type ?? '').toUpperCase() === 'LINKEDIN'
      );
    }

    if (targetAccount) {
      const name =
        targetAccount.name ??
        targetAccount.username ??
        targetAccount.connection_params?.username ??
        'LINKEDIN';
      const isStopped = (targetAccount.status ?? '').toUpperCase() === 'STOPPED';

      store.set('unipile_account_id', targetAccount.id, { ...base, httpOnly: false });
      store.set('unipile_name', name, { ...base, httpOnly: false });
      
      if (isStopped) {
        stopped.linkedin = { id: targetAccount.id, name };
      } else {
        connected.linkedin = name;
      }
    } else {
      // If the user does not have a linked account, or it wasn't found in Unipile,
      // clear the cookies so we don't display another user's LinkedIn details.
      store.delete('unipile_account_id');
      store.delete('unipile_name');
    }

    return NextResponse.json({ ok: true, connected, stopped });
  } catch (err) {
    console.error('[Unipile sync error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
