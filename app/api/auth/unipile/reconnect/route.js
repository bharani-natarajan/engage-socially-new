import { NextResponse } from 'next/server';
import { getHostedReconnectLink } from '@/lib/unipile';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// GET /api/auth/unipile/reconnect?accountId=xxx&platform=instagram
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const platform = searchParams.get('platform') ?? 'linkedin';

  if (!accountId) {
    return NextResponse.json({ error: 'accountId required' }, { status: 400 });
  }

  const callbackPath = platform === 'instagram'
    ? '/api/auth/unipile/instagram/callback'
    : platform === 'facebook'
    ? '/api/auth/unipile/facebook/callback'
    : '/api/auth/unipile/callback';

  const errorParam = platform === 'instagram' ? 'ig_error' : platform === 'facebook' ? 'fb_error' : 'li_error';

  try {
    const callbackUrl = `${APP_URL}${callbackPath}`;
    const result = await getHostedReconnectLink(
      accountId,
      callbackUrl,
      `${APP_URL}/settings?${errorParam}=reconnect_failed`,
      callbackUrl
    );
    const url = result.url ?? result.link ?? result.hosted_url;
    if (!url) throw new Error('No reconnect URL returned from Unipile');
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[Unipile reconnect error]', err.message);
    return NextResponse.redirect(
      `${APP_URL}/settings?${errorParam}=${encodeURIComponent(err.message)}`
    );
  }
}
