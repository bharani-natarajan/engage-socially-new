import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 50;

export async function POST(request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get('image');
    const prompt = formData.get('prompt')?.trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    // Warn if image is large — big base64 payloads slow down the upstream request
    const mb = bytes.byteLength / 1024 / 1024;
    console.log('[FLUX submit] image size', mb.toFixed(2), 'MB');

    const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let res;
    try {
      res = await fetch('https://api.cometapi.com/flux/v1/flux-2-max', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${process.env.COMET_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Product photography: ${prompt}. The product from the reference image should be the hero of the composition. Professional commercial photography, high quality, sharp focus on product.`,
          input_image: base64,
          width: 1024,
          height: 1024,
          seed: 42,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await res.json();
    console.log('[FLUX submit]', res.status, JSON.stringify(data).slice(0, 300));

    if (!res.ok || data.error) {
      throw new Error(data?.error?.message ?? data?.message ?? JSON.stringify(data));
    }
    if (!data.polling_url) {
      throw new Error('No polling_url in response: ' + JSON.stringify(data));
    }

    return NextResponse.json({ pollingUrl: data.polling_url });
  } catch (err) {
    console.error('[Generate error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
