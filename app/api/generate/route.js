import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SEEDS = [42, 1337, 9999, 5678];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function submitGeneration(imageBase64, prompt, seed) {
  const res = await fetch('https://api.cometapi.com/bria/image/edit/replace_background', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COMET_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageBase64,
      prompt,
      mode: 'high_control',
      refine_prompt: true,
      original_quality: true,
      seed,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? data?.detail ?? JSON.stringify(data));
  }
  // Sync response — return image URL directly
  if (data?.result?.image_url) return data.result.image_url;
  // Async response — return request_id for polling
  if (data?.request_id) return { request_id: data.request_id };
  throw new Error('Unexpected response: ' + JSON.stringify(data));
}

async function pollResult(requestId) {
  const statusUrl = `https://api.cometapi.com/bria/image/edit/status/${requestId}`;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const res = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${process.env.COMET_API_KEY}` },
    });
    const data = await res.json();
    console.log('[Bria poll]', requestId, res.status, JSON.stringify(data).slice(0, 200));
    if (data?.result?.image_url) return data.result.image_url;
    if (data?.image_url) return data.image_url;
    if (data?.status === 'failed' || data?.error) {
      throw new Error(data?.error?.message ?? 'Generation failed');
    }
  }
  throw new Error('Generation timed out');
}

async function generateVariation(imageBase64, prompt, seed) {
  const result = await submitGeneration(imageBase64, prompt, seed);
  if (typeof result === 'string') return result; // already got URL
  return pollResult(result.request_id);
}

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
    const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;

    const results = await Promise.allSettled(
      SEEDS.map((seed) => generateVariation(base64, prompt, seed))
    );

    const images = results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    if (images.length === 0) {
      const firstError = results.find((r) => r.status === 'rejected');
      throw new Error(firstError?.reason?.message ?? 'All generations failed');
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error('[Generate error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
