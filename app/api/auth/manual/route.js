import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const GRAPH = 'https://graph.facebook.com';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const manualToken = searchParams.get('token');

  if (!manualToken) {
    return NextResponse.json({ error: "Please provide a ?token=XYZ parameter" }, { status: 400 });
  }

  try {
    // 0. Exchange short-lived token for a long-lived token (60 days)
    const exchangeRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&fb_exchange_token=${manualToken}`
    );
    const exchangeData = await exchangeRes.json();
    const longLivedToken = exchangeData.access_token ?? manualToken;

    // 1. Get Facebook Pages to resolve the Instagram Business Account ID using the provided token
    const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${longLivedToken}`);
    const pagesData = await pagesRes.json();
    console.log('[Manual Auth Debug] /me/accounts response:', JSON.stringify(pagesData, null, 2));

    if (!pagesData.data?.length) {
      throw new Error(`No Facebook Pages found. API response: ${JSON.stringify(pagesData)}`);
    }
    const page = pagesData.data[0];

    // 2. Get the Instagram Business Account linked to this page
    const igRes = await fetch(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );
    const igData = await igRes.json();
    if (!igData.instagram_business_account) {
      throw new Error('No Instagram Business Account linked to this Facebook Page.');
    }
    const igUserId = igData.instagram_business_account.id;

    // 3. Fetch Instagram username for display
    const profileRes = await fetch(
      `${GRAPH}/${igUserId}?fields=username&access_token=${longLivedToken}`
    );
    const profileData = await profileRes.json();

    // 4. Store tokens in HttpOnly cookies exactly like the OAuth flow does
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
    store.set('ig_access_token', longLivedToken, base);
    store.set('ig_user_id', igUserId, base);
    store.set('ig_username', profileData.username ?? 'ManualAuth', { ...base, httpOnly: false });

    // Facebook Page tokens — same page from /me/accounts
    store.set('fb_page_token', page.access_token, base);
    store.set('fb_page_id', page.id, base);
    store.set('fb_page_name', page.name ?? '', { ...base, httpOnly: false });

    return NextResponse.redirect(`${APP_URL}/?connected=true`);
  } catch (err) {
    console.error('[Manual Auth Error]', err.message);
    return NextResponse.redirect(`${APP_URL}/?error=${encodeURIComponent(err.message)}`);
  }
}
