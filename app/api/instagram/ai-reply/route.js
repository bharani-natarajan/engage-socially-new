import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { requireAuth } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { commentText, username, postCaption } = await request.json();
    if (!commentText) {
      return NextResponse.json({ error: 'commentText is required' }, { status: 400 });
    }

    const context = postCaption
      ? `The comment is on an Instagram post with this caption: "${postCaption}"\n\n`
      : '';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(
      `${context}A user named @${username ?? 'someone'} left this comment: "${commentText}"\n\nWrite a friendly, engaging Instagram reply in 1-2 sentences. Be warm and authentic. Do not use hashtags. Reply only with the reply text, nothing else.`
    );

    const suggestion = result.response.text().trim();
    return NextResponse.json({ suggestion });
  } catch (err) {
    console.error('[AI reply error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
