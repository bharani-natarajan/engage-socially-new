import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { commentText, username, postCaption, brandContext, tone, avoid } = await request.json();
    if (!commentText) {
      return NextResponse.json({ error: 'commentText is required' }, { status: 400 });
    }

    const toneInstructions = {
      friendly: 'Write in a warm, approachable, and conversational tone.',
      professional: 'Write in a polished, professional, and brand-appropriate tone.',
      casual: 'Write in a relaxed, informal, and relatable tone.',
      witty: 'Write in a light-hearted tone with a touch of humour.',
    };

    const parts = [];

    if (brandContext?.trim()) {
      parts.push(`Brand / business context:\n${brandContext.trim()}`);
    }

    if (postCaption?.trim()) {
      parts.push(`The comment is on an Instagram post with this caption: "${postCaption.trim()}"`);
    }

    parts.push(`A user named @${username ?? 'someone'} left this comment: "${commentText}"`);

    parts.push(toneInstructions[tone] ?? toneInstructions.friendly);

    if (avoid?.trim()) {
      parts.push(`Important — do NOT include any of the following in your reply: ${avoid.trim()}`);
    }

    parts.push('Write a reply in 1-2 sentences. Do not use hashtags. Reply only with the reply text, nothing else.');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(parts.join('\n\n'));

    const suggestion = result.response.text().trim();
    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error('[AI reply error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
