import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      );
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

    let resizeOpts = {};
    if (w > 1440) {
      resizeOpts = { width: 1440 };
    } else if (w < 320) {
      resizeOpts = { width: 320 };
    }

    // Clamp aspect ratio by cropping
    const clampedRatio = Math.min(1.91, Math.max(0.8, ratio));
    const targetW = resizeOpts.width ?? w;
    const targetH = Math.round(targetW / clampedRatio);

    const jpeg = await image
      .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer();

    const key = `uploads/${randomUUID()}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: jpeg,
      ContentType: 'image/jpeg',
    }));

    const url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[Upload error]', err.message);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
