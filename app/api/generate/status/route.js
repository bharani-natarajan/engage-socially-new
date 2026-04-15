import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const pollingUrl = searchParams.get('url');
  if (!pollingUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  try {
    const res = await fetch(pollingUrl, {
      headers: { 'Authorization': `Bearer ${process.env.COMET_API_KEY}` },
    });
    const data = await res.json();
    console.log('[FLUX status]', data?.status, JSON.stringify(data).slice(0, 200));

    if (data?.status === 'Ready') {
      const imageUrl = data.sample ?? data.result ?? data.output ?? data.image_url;
      if (!imageUrl) {
        return NextResponse.json({ error: 'Ready but no image URL in response: ' + JSON.stringify(data) }, { status: 500 });
      }
      return NextResponse.json({ status: 'ready', imageUrl });
    }

    if (data?.status === 'Error' || data?.status === 'Failed') {
      return NextResponse.json({ status: 'failed', error: `Generation ${data.status}` }, { status: 500 });
    }

    // Still pending (Pending / Processing / etc.)
    return NextResponse.json({ status: 'pending' });
  } catch (err) {
    console.error('[Status error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
