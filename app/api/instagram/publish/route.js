import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';
import { createMediaContainer, getContainerStatus, publishContainer } from '@/lib/instagram';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireAuth();
  if (error) return error;

  let { imageUrl, caption } = await request.json();
  // TEST: override with a known public image to isolate S3 regional access issues
  imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Bikesgray.jpg';
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
  }

  try {
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
