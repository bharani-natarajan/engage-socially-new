import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
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

    // Convert to JPEG and normalize dimensions for Instagram:
    // width 320–1440px, aspect ratio between 4:5 (0.8) and 1.91:1
    const image = sharp(Buffer.from(bytes));
    const meta = await image.metadata();
    const w = meta.width ?? 1080;
    const h = meta.height ?? 1080;
    const ratio = w / h;
    const targetW = Math.min(1440, Math.max(320, w));
    const clampedRatio = Math.min(1.91, Math.max(0.8, ratio));
    const targetH = Math.round(targetW / clampedRatio);
    const jpeg = await image
      .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const dataUri = `data:image/jpeg;base64,${jpeg.toString('base64')}`;
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
