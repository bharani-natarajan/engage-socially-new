import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireUnipileAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  const { error } = await requireUnipileAuth();
  if (error) return error;

  try {
    const { postText, authorName, brandContext, tone, avoid } = await request.json();
    if (!postText) return NextResponse.json({ error: 'postText is required' }, { status: 400 });

    const toneInstructions = {
      friendly: 'Write in a warm, approachable, and conversational tone.',
      professional: 'Write in a polished, professional, and brand-appropriate tone.',
      casual: 'Write in a relaxed, informal, and relatable tone.',
      witty: 'Write in a light-hearted tone with a touch of humour.',
    };

    const parts = [];
    if (brandContext?.trim()) parts.push(`Brand / business context:\n${brandContext.trim()}`);
    parts.push(`LinkedIn post by ${authorName ?? 'someone'}:\n"${postText.trim().slice(0, 600)}"`);
    parts.push(toneInstructions[tone] ?? toneInstructions.professional);
    if (avoid?.trim()) parts.push(`Important — do NOT include: ${avoid.trim()}`);
    parts.push('Write a thoughtful LinkedIn comment on this post. 1-2 sentences. No hashtags. Return only the comment text, nothing else.');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(parts.join('\n\n'));
    return NextResponse.json({ suggestion: result.response.text().trim() });
  } catch (err) {
    console.error('[LinkedIn AI comment error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
