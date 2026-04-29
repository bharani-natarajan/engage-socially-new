import { NextResponse } from 'next/server';
import { getHostedAuthLink } from '@/lib/unipile';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET() {
  try {
    const result = await getHostedAuthLink(
      `${APP_URL}/api/auth/unipile/callback`,
      `${APP_URL}/settings?li_error=connection_failed`
    );
    const url = result.url ?? result.link ?? result.hosted_url;
    if (!url) throw new Error('No hosted auth URL returned from Unipile');
    return NextResponse.redirect(url);
  } catch (err) {
    console.error('[Unipile auth error]', err.message, err.stack);
    return NextResponse.redirect(
      `${APP_URL}/settings?li_error=${encodeURIComponent(err.message)}`
    );
  }
}
