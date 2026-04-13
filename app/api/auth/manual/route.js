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
    // 1. Get Facebook Pages to resolve the Instagram Business Account ID using the provided token
    const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${manualToken}`);
    const pagesData = await pagesRes.json();
    
    if (!pagesData.data?.length) {
      throw new Error('No Facebook Pages found for this token. Make sure the token has pages_show_list permission.');
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
      `${GRAPH}/${igUserId}?fields=username&access_token=${manualToken}`
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
    
    // Inject the manual token into the cookie jar
    store.set('ig_access_token', manualToken, base);
    store.set('ig_user_id', igUserId, base);
    store.set('ig_username', profileData.username ?? 'ManualAuth', {
      ...base,
      httpOnly: false,
    });

    return NextResponse.redirect(`${APP_URL}/?connected=true`);
  } catch (err) {
    console.error('[Manual Auth Error]', err.message);
    return NextResponse.redirect(`${APP_URL}/?error=${encodeURIComponent(err.message)}`);
  }
}
