import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const VALID_INTENTS = ['Inquiry', 'Complaint', 'Purchase Intent', 'Others'];

export async function POST(request) {
  const { comments } = await request.json();
  if (!Array.isArray(comments) || comments.length === 0) {
    return NextResponse.json({ results: [] });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Classify each social media comment by intent. Use exactly one of these labels: "Inquiry", "Complaint", "Purchase Intent", "Others".

- Inquiry: asking a question about the product/service
- Complaint: expressing dissatisfaction or reporting a problem
- Purchase Intent: showing interest in buying
- Others: everything else (praise, general reactions, off-topic)

Comments:
${JSON.stringify(comments.map((c) => ({ id: c.id, text: c.text })))}

Return ONLY a JSON array like: [{"id":"...","intent":"..."}]
No markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim().replace(/^```json|^```|```$/g, '').trim();
    const parsed = JSON.parse(raw);

    const results = parsed
      .filter((r) => r.id && VALID_INTENTS.includes(r.intent))
      .map((r) => ({ id: r.id, intent: r.intent }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[classify error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
