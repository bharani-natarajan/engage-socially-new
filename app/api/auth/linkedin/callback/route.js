import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');

  if (oauthError || !code) {
    return NextResponse.redirect(`${APP_URL}/settings?li_error=auth_cancelled`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${APP_URL}/api/auth/linkedin/callback`,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      cache: 'no-store',
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
    const accessToken = tokenData.access_token;

    // 2. Get profile via OpenID userinfo endpoint
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202504',
      },
      cache: 'no-store',
    });
    const profile = await profileRes.json();
    if (!profile.sub) throw new Error('Could not retrieve LinkedIn profile.');

    const personUrn = `urn:li:person:${profile.sub}`;
    const displayName = profile.name ?? profile.given_name ?? 'LinkedIn User';

    // 3. Store in cookies
    const isHttps = APP_URL.startsWith('https');
    const store = await cookies();
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 59 * 24 * 60 * 60, // 59 days
    };
    store.set('li_access_token', accessToken, base);
    store.set('li_person_urn', personUrn, base);
    store.set('li_person_name', displayName, { ...base, httpOnly: false });

    return NextResponse.redirect(`${APP_URL}/settings?li_connected=true`);
  } catch (err) {
    console.error('[LinkedIn OAuth error]', err.message);
    return NextResponse.redirect(
      `${APP_URL}/settings?li_error=${encodeURIComponent(err.message)}`
    );
  }
}
