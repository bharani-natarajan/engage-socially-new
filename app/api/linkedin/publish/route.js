import { NextResponse } from 'next/server';
import { requireLinkedInAuth } from '@/lib/tokens';
import { initializeImageUpload, uploadImageBinary, publishPost } from '@/lib/linkedin';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { tokens, error } = await requireLinkedInAuth();
  if (error) return error;

  const { imageUrl, caption, orgUrn } = await request.json();
  const authorUrn = orgUrn || tokens.personUrn;

  try {
    let imageUrn = null;

    if (imageUrl) {
      const initRes = await initializeImageUpload(authorUrn, tokens.accessToken);
      const { uploadUrl, image } = initRes.value;
      imageUrn = image;

      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error('Failed to fetch image for upload.');
      const imgBuffer = await imgRes.arrayBuffer();
      await uploadImageBinary(uploadUrl, imgBuffer, tokens.accessToken);
    }

    const result = await publishPost(authorUrn, caption ?? '', imageUrn, tokens.accessToken);
    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error('[LinkedIn publish error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
