import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAccount } from '@/lib/unipile';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const store = await cookies();
    const accountId = store.get('unipile_account_id')?.value;

    if (accountId) {
      try {
        await deleteAccount(accountId);
      } catch (err) {
        console.error('[Unipile deleteAccount error]', err.message);
      }
    }

    // Update database user record to set unipileAccountId to null
    if (authHeader) {
      try {
        await fetch(`${API_URL}/auth/unipile-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify({ unipileAccountId: null }),
        });
      } catch (err) {
        console.error('[Unipile database update error]', err.message);
      }
    }

    // Clear all cookies
    store.delete('unipile_account_id');
    store.delete('unipile_name');
    store.delete('li_org_id');
    store.delete('li_post_target');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Disconnect error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
