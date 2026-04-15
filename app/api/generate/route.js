import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SEEDS = [42, 1337, 9999, 5678];

async function submitFlux(imageBase64, prompt, seed) {
  const res = await fetch('https://api.cometapi.com/flux/v1/flux-2-max', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.COMET_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: `Product photography: ${prompt}. The product from the reference image should be the hero of the composition. Professional commercial photography, high quality, sharp focus on product.`,
      input_image: imageBase64,
      width: 1024,
      height: 1024,
      seed,
    }),
  });

  const data = await res.json();
  console.log('[FLUX submit]', res.status, JSON.stringify(data).slice(0, 200));
  if (!res.ok || data.error) {
    throw new Error(data?.error?.message ?? data?.message ?? JSON.stringify(data));
  }
  const taskId = data?.task_id ?? data?.id;
  if (!taskId) throw new Error('No task_id in response: ' + JSON.stringify(data));
  return taskId;
}

async function pollFlux(taskId) {
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const res = await fetch(
      `https://api.cometapi.com/flux/v1/get_result?task_id=${taskId}`,
      { headers: { 'Authorization': `Bearer ${process.env.COMET_API_KEY}` } }
    );
    const data = await res.json();
    console.log('[FLUX poll]', taskId, data?.status);
    if (data?.status === 'Ready' && data?.result_url) return data.result_url;
    if (data?.status === 'Error' || data?.status === 'Failed') {
      throw new Error(`Generation ${data.status}: ${JSON.stringify(data)}`);
    }
  }
  throw new Error('Generation timed out');
}

async function generateVariation(imageBase64, prompt, seed) {
  const taskId = await submitFlux(imageBase64, prompt, seed);
  return pollFlux(taskId);
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
