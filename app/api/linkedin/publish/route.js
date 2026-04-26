import { NextResponse } from 'next/server';
import { requireLinkedInAuth } from '@/lib/tokens';
import { initializeImageUpload, uploadImageBinary, publishPost } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireLinkedInAuth();
  if (error) return error;

  const { imageUrl, caption } = await request.json();

  try {
    let imageUrn = null;

    if (imageUrl) {
      // Step 1: Initialize LinkedIn image upload
      const initRes = await initializeImageUpload(tokens.personUrn, tokens.accessToken);
      const { uploadUrl, image } = initRes.value;
      imageUrn = image;

      // Step 2: Fetch image binary and upload to LinkedIn
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error('Failed to fetch image for upload.');
      const imgBuffer = await imgRes.arrayBuffer();
      await uploadImageBinary(uploadUrl, imgBuffer, tokens.accessToken);
    }

    // Step 3: Publish the post
    const result = await publishPost(tokens.personUrn, caption ?? '', imageUrn, tokens.accessToken);
    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error('[LinkedIn publish error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
