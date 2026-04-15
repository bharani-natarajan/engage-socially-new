import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SEEDS = [42, 1337, 9999, 5678];

async function generateVariation(imageBase64, prompt, seed) {
  const res = await fetch('https://api.cometapi.com/bria/image/edit/replace_background', {
    method: 'POST',
    headers: {
      'x-key': process.env.COMET_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageBase64,
      prompt,
      mode: 'high_control',
      sync: true,
      refine_prompt: true,
      original_quality: true,
      seed,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? data?.detail ?? JSON.stringify(data));
  }
  return data?.result?.image_url ?? data?.result_url ?? data?.image_url;
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
