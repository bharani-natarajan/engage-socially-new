import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { createMediaContainer, getContainerStatus, publishContainer } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  let { imageUrl, caption } = await request.json();
  // TEST: hardcode cached CloudFront URL to check if Instagram can reach CloudFront at all
  imageUrl = 'https://d2nyqq2zjfzmla.cloudfront.net/uploads/938b80c4-14b9-44e2-84ac-1e0db7f61906.jpg';
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  try {
    // Warm up the CloudFront cache so Instagram's US/EU edge nodes don't get a
    // cold-cache miss (high latency back to ap-south-1) and time out.
    await fetch(imageUrl, { method: 'GET', cache: 'no-store' }).catch(() => {});

    // Step 1: Create media container
    const container = await createMediaContainer(
      tokens.userId,
      imageUrl,
      caption ?? '',
      tokens.accessToken
    );

    // Step 2: Poll until FINISHED (images typically take 1-3 seconds)
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status !== 'FINISHED' && attempts < 20) {
      await new Promise((r) => setTimeout(r, 1500));
      const result = await getContainerStatus(container.id, tokens.accessToken);
      status = result.status_code;
      if (status === 'ERROR') throw new Error('Instagram rejected the media container.');
      attempts++;
    }

    if (status !== 'FINISHED') {
      throw new Error('Media container timed out. Please try again.');
    }

    // Step 3: Publish
    const published = await publishContainer(
      tokens.userId,
      container.id,
      tokens.accessToken
    );

    return NextResponse.json({ id: published.id });
  } catch (err) {
    console.error('[Publish error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
