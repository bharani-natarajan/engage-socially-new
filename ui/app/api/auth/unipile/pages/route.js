import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAccount } from '@/lib/unipile';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const store = await cookies();
    const accountId = store.get('unipile_account_id')?.value;

    if (!accountId) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 401 });
    }

    const account = await getAccount(accountId);
    const personalName =
      account.name ??
      account.username ??
      account.connection_params?.im?.username ??
      'Personal Profile';

    // Extract pages from connection_params.im.organizations
    const rawOrgs = account.connection_params?.im?.organizations ?? [];
    const pages = rawOrgs.map((org) => {
      // organization_urn is typically "urn:li:fsd_company:116093968"
      const urnParts = org.organization_urn ? org.organization_urn.split(':') : [];
      const id = urnParts[urnParts.length - 1] || null;
      return {
        id,
        name: org.name,
      };
    }).filter(page => page.id);

    return NextResponse.json({
      personalName,
      pages,
    });
  } catch (err) {
    console.error('[Unipile pages error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
