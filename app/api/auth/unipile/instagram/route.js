import { NextResponse } from 'next/server';
import { getHostedAuthLink } from '@/lib/unipile';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET() {
  try {
    const callbackUrl = `${APP_URL}/api/auth/unipile/instagram/callback`;
    const result = await getHostedAuthLink(
      callbackUrl,
      `${APP_URL}/settings?ig_error=connection_failed`,
      callbackUrl,
      ['INSTAGRAM']
    );
    const url = result.url ?? result.link ?? result.hosted_url;
    if (!url) throw new Error('No hosted auth URL returned from Unipile');
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[Unipile Instagram auth error]', err.message);
    return NextResponse.redirect(
      `${APP_URL}/settings?ig_error=${encodeURIComponent(err.message)}`
    );
  }
}
