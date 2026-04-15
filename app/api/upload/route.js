import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG images are allowed.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 8 MB limit.' }, { status: 400 });
    }

    const dataUri = `data:image/jpeg;base64,${Buffer.from(bytes).toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'engage-socially',
      resource_type: 'image',
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error('[Upload error]', err.message);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
