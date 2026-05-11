import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = [
  'cdninstagram.com',
  'instagram.com',
  'fbcdn.net',
  'fbsbx.com',
  'facebook.com',
  'unipile.com',
  'scontent',
];

// GET /api/image-proxy?url=https://...
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return new NextResponse('url required', { status: 400 });

  let parsed;
  try { parsed = new URL(url); } catch {
    return new NextResponse('invalid url', { status: 400 });
  }

  const allowed = ALLOWED_HOSTS.some((h) => parsed.hostname.includes(h));
  if (!allowed) return new NextResponse('disallowed host', { status: 403 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EngageSocially/1.0)' },
      cache: 'no-store',
    });

    if (!res.ok) return new NextResponse('upstream error', { status: res.status });

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    return new NextResponse(err.message, { status: 500 });
  }
}
