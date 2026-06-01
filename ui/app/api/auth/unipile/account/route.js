import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteAccount } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

// DELETE /api/auth/unipile/account?accountId=xxx&platform=instagram
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const platform = searchParams.get('platform');

  if (!accountId || !platform) {
    return NextResponse.json({ error: 'accountId and platform required' }, { status: 400 });
  }

  try {
    await deleteAccount(accountId);

    const store = await cookies();
    if (platform === 'instagram') {
      store.delete('unipile_ig_account_id');
      store.delete('unipile_ig_name');
    } else if (platform === 'facebook') {
      store.delete('unipile_fb_account_id');
      store.delete('unipile_fb_name');
    } else if (platform === 'linkedin') {
      store.delete('unipile_account_id');
      store.delete('unipile_name');
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Unipile delete account error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
