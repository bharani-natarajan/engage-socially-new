import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAccount } from '@/lib/unipile';

export async function POST() {
  try {
    const store = await cookies();
    const accountId = store.get('unipile_account_id')?.value;

    if (accountId) {
      try {
        await deleteAccount(accountId);
      } catch (err) {
        console.error('[Unipile deleteAccount error]', err.message);
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
