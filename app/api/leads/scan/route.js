import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getMedia, getComments } from '@/lib/instagram';
import { getPagePosts, getPostComments, normalizeComment as normalizeFbComment } from '@/lib/facebook';

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
  const igToken = store.get('ig_access_token')?.value;
  const igUserId = store.get('ig_user_id')?.value;
  const fbPageToken = store.get('fb_page_token')?.value;
  const fbPageId = store.get('fb_page_id')?.value;

  if (!igToken && !fbPageToken) {
    return NextResponse.json({ error: 'No connected platforms' }, { status: 401 });
  }

  const allComments = []; // { id, text, username, from, platform, postCaption }

  // Fetch Instagram comments
  if (igToken && igUserId) {
    try {
      const mediaData = await getMedia(igUserId, igToken);
      const posts = (mediaData.data ?? []).slice(0, 10);
      const results = await Promise.allSettled(
        posts.map((p) =>
          getComments(p.id, igToken).then((r) =>
            (r.data ?? []).map((c) => ({
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
      results.forEach((r) => {
        if (r.status === 'fulfilled') allComments.push(...r.value);
      });
    } catch { /* skip */ }
  }

  // Fetch Facebook comments
  if (fbPageToken && fbPageId) {
    try {
      const postsData = await getPagePosts(fbPageId, fbPageToken);
      const posts = (postsData.data ?? []).slice(0, 10);
      const results = await Promise.allSettled(
        posts.map((p) =>
          getPostComments(p.id, fbPageToken).then((r) =>
            (r.data ?? []).map(normalizeFbComment).map((c) => ({
              id: c.id,
              text: c.text,
              username: c.username ?? '',
              from: c.from ?? {},
              platform: 'facebook',
              postId: p.id,
              postCaption: p.message ?? p.story ?? '',
              postThumbnail: p.full_picture ?? p.picture ?? null,
            }))
          )
        )
      );
      results.forEach((r) => {
        if (r.status === 'fulfilled') allComments.push(...r.value);
      });
    } catch { /* skip */ }
  }

  if (!allComments.length) {
    return NextResponse.json({ leads: [] });
  }

  // Classify in batches of 50
  const BATCH = 50;
  const intentMap = {};
  for (let i = 0; i < allComments.length; i += BATCH) {
    const batch = allComments.slice(i, i + BATCH);
    try {
      const map = await classifyBatch(batch);
      Object.assign(intentMap, map);
    } catch { /* skip failed batches */ }
  }

  // Build leads for qualifying comments
  const leads = [];
  const seen = new Set();

  for (const comment of allComments) {
    const intent = intentMap[comment.id];
    if (intent !== 'Inquiry' && intent !== 'Purchase Intent') continue;

    const userId = comment.from?.id || comment.username;
    const leadId = `${comment.platform}_${userId}`;
    if (seen.has(leadId)) continue; // deduplicate: keep first occurrence
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
