import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getTokens, getFbTokens, getUnipileTokens } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request) {
  const igTokens = await getTokens();
  const fbTokens = await getFbTokens();
  const unipileTokens = await getUnipileTokens();

  const isAuthenticated = igTokens.accessToken || fbTokens.pageToken || unipileTokens.accountId;
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Not authenticated. Please connect at least one account.' },
      { status: 401 }
    );
  }

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
      console.log('[FLUX ready] sample URL:', data.result?.sample);
      const bflUrl = data.result?.sample ?? data.sample ?? data.result ?? data.output ?? data.image_url;
      if (!bflUrl) {
        return NextResponse.json({ error: 'Ready but no image URL: ' + JSON.stringify(data) }, { status: 500 });
      }

      // Let Cloudinary fetch directly from the pre-signed Azure URL
      const upload = await cloudinary.uploader.upload(bflUrl, {
        folder: 'engage-socially/ai-generated',
        resource_type: 'image',
      });

      console.log('[FLUX] uploaded to Cloudinary:', upload.secure_url);
      return NextResponse.json({ status: 'ready', imageUrl: upload.secure_url });
    }

    if (data?.status === 'Error' || data?.status === 'Failed') {
      return NextResponse.json({ status: 'failed', error: `Generation ${data.status}` }, { status: 500 });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (err) {
    console.error('[Status error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
