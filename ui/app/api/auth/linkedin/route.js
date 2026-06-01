import { NextResponse } from 'next/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const SCOPES = ['openid', 'profile', 'email', 'w_member_social', 'w_organization_social'].join(' ');

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: `${APP_URL}/api/auth/linkedin/callback`,
    scope: SCOPES,
    state: Math.random().toString(36).slice(2),
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params}`
  );
}
