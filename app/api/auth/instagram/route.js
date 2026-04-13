import { NextResponse } from 'next/server';

export function GET() {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
    scope: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_comments',
      'pages_show_list',
    ].join(','),
    response_type: 'code',
  });

  return NextResponse.redirect(
    `https://www.facebook.com/dialog/oauth?${params.toString()}`
  );
}
