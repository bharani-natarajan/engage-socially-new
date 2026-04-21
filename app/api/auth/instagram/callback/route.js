import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const GRAPH = 'https://graph.facebook.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');

  if (oauthError || !code) {
    return NextResponse.redirect(`${APP_URL}/?error=auth_cancelled`);
  }

  try {
    // 1. Exchange code for short-lived user access token
    const tokenParams = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      redirect_uri: `${APP_URL}/api/auth/instagram/callback`,
      code,
    });
    const tokenRes = await fetch(`${GRAPH}/oauth/access_token?${tokenParams}`);
    const tokenData = await tokenRes.json();
    if (tokenData.error) throw new Error(tokenData.error.message);
    const shortToken = tokenData.access_token;

    // 2. Exchange for long-lived token (valid 60 days)
    const longParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      fb_exchange_token: shortToken,
    });
    const longRes = await fetch(`${GRAPH}/oauth/access_token?${longParams}`);
    const longData = await longRes.json();
    if (longData.error) throw new Error(longData.error.message);
    const longToken = longData.access_token;

    // 3. Get Facebook Pages to resolve the Instagram Business Account ID
    const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${longToken}`);
    const pagesData = await pagesRes.json();
    if (!pagesData.data?.length) {
      throw new Error(
        'No Facebook Pages found. Connect your Instagram account to a Facebook Page first.'
      );
    }
    const page = pagesData.data[0];

    // 4. Get the Instagram Business Account linked to this page
    const igRes = await fetch(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );
    const igData = await igRes.json();
    if (!igData.instagram_business_account) {
      throw new Error('No Instagram Business Account linked to this Facebook Page.');
    }
    const igUserId = igData.instagram_business_account.id;

    // 5. Fetch Instagram username for display
    const profileRes = await fetch(
      `${GRAPH}/${igUserId}?fields=username&access_token=${longToken}`
    );
    const profileData = await profileRes.json();

    // 6. Store tokens in HttpOnly cookies
    // Use secure:true + sameSite:none when served over HTTPS (ngrok/prod),
    // plain lax on http localhost.
    const isHttps = APP_URL.startsWith('https');
    const store = await cookies();
    const base = {
      httpOnly: true,
      secure: isHttps,
      sameSite: isHttps ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 24 * 60 * 60, // 60 days
    };
    // Instagram tokens
    store.set('ig_access_token', longToken, base);
    store.set('ig_user_id', igUserId, base);
    store.set('ig_username', profileData.username ?? '', { ...base, httpOnly: false });

    // Facebook Page tokens (from the same OAuth flow)
    store.set('fb_page_token', page.access_token, base);
    store.set('fb_page_id', page.id, base);
    store.set('fb_page_name', page.name ?? '', { ...base, httpOnly: false });

    return NextResponse.redirect(`${APP_URL}/?connected=true`);
  } catch (err) {
    console.error('[OAuth callback error]', err.message);
    return NextResponse.redirect(
      `${APP_URL}/?error=${encodeURIComponent(err.message)}`
    );
  }
}
