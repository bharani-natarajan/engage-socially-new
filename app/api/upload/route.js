import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg'];
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

    const key = `uploads/${randomUUID()}.jpg`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: 'image/jpeg',
    }));

    const url = `https://${process.env.AWS_CLOUDFRONT_DOMAIN}/${key}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[Upload error]', err.message);
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 });
  }
}
