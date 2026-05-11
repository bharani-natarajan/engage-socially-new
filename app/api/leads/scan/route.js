import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getPosts, getPostComments, normalizeIgPost, normalizeFbPost, normalizeComment, normalizeFbComment } from '@/lib/unipile';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VALID_INTENTS = ['Inquiry', 'Complaint', 'Purchase Intent', 'Others'];

async function classifyBatch(items) {
  if (!items.length) return {};
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Classify each social media comment by intent. Use exactly one of: "Inquiry", "Complaint", "Purchase Intent", "Others".
- Inquiry: asking a question about the product/service
- Complaint: expressing dissatisfaction or reporting a problem
- Purchase Intent: showing interest in buying
- Others: praise, general reactions, off-topic

Comments:
${JSON.stringify(items.map((c) => ({ id: c.id, text: c.text })))}

Return ONLY a JSON array like: [{"id":"...","intent":"..."}]
No markdown, no explanation.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim().replace(/^```json|^```|```$/g, '').trim();
  const parsed = JSON.parse(raw);
  const map = {};
  parsed
    .filter((r) => r.id && VALID_INTENTS.includes(r.intent))
    .forEach((r) => { map[r.id] = r.intent; });
  return map;
}

export async function GET() {
  const store = await cookies();
  const igAccountId = store.get('unipile_ig_account_id')?.value;
  const fbAccountId = store.get('unipile_fb_account_id')?.value;

  if (!igAccountId && !fbAccountId) {
    return NextResponse.json({ error: 'No connected platforms' }, { status: 401 });
  }

  const allComments = [];

  if (igAccountId) {
    try {
      const postsResult = await getPosts(igAccountId);
      const posts = (postsResult.items ?? postsResult.data ?? []).slice(0, 10).map(normalizeIgPost);
      const results = await Promise.allSettled(
        posts.map((p) =>
          getPostComments(p.id, igAccountId).then((r) =>
            (r.items ?? r.data ?? []).map(normalizeComment).map((c) => ({
              id: c.id,
              text: c.text,
              username: c.username ?? '',
              from: c.from ?? {},
              platform: 'instagram',
              postId: p.id,
              postCaption: p.caption ?? '',
              postThumbnail: p.thumbnail_url ?? p.media_url ?? null,
            }))
          )
        )
      );
      results.forEach((r) => { if (r.status === 'fulfilled') allComments.push(...r.value); });
    } catch { /* skip */ }
  }

  if (fbAccountId) {
    try {
      const postsResult = await getPosts(fbAccountId);
      const posts = (postsResult.items ?? postsResult.data ?? []).slice(0, 10).map(normalizeFbPost);
      const results = await Promise.allSettled(
        posts.map((p) =>
          getPostComments(p.id, fbAccountId).then((r) =>
            (r.items ?? r.data ?? []).map(normalizeFbComment).map((c) => ({
              id: c.id,
              text: c.text,
              username: c.username ?? '',
              from: c.from ?? {},
              platform: 'facebook',
              postId: p.id,
              postCaption: p.caption ?? '',
              postThumbnail: p.media_url ?? null,
            }))
          )
        )
      );
      results.forEach((r) => { if (r.status === 'fulfilled') allComments.push(...r.value); });
    } catch { /* skip */ }
  }

  if (!allComments.length) {
    return NextResponse.json({ leads: [] });
  }

  const BATCH = 50;
  const intentMap = {};
  for (let i = 0; i < allComments.length; i += BATCH) {
    const batch = allComments.slice(i, i + BATCH);
    try {
      const map = await classifyBatch(batch);
      Object.assign(intentMap, map);
    } catch { /* skip failed batches */ }
  }

  const leads = [];
  const seen = new Set();

  for (const comment of allComments) {
    const intent = intentMap[comment.id];
    if (intent !== 'Inquiry' && intent !== 'Purchase Intent') continue;

    const userId = comment.from?.id || comment.username;
    const leadId = `${comment.platform}_${userId}`;
    if (seen.has(leadId)) continue;
    seen.add(leadId);

    leads.push({
      id: leadId,
      username: comment.username,
      name: comment.from?.name || comment.username,
      userId,
      platform: comment.platform,
      intent,
      commentText: comment.text,
      postId: comment.postId,
      postCaption: comment.postCaption,
      postThumbnail: comment.postThumbnail ?? null,
      addedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ leads, scanned: allComments.length });
}
