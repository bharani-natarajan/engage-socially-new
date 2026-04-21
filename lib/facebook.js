const BASE = 'https://graph.facebook.com/v25.0';

async function request(path, params = {}, method = 'GET') {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v)).replace(/%7B/gi, '{').replace(/%7D/gi, '}').replace(/%2C/gi, ',')}`)
    .join('&');
  const url = `${BASE}${path}?${qs}`;
  console.log('[FB] request url:', url);
  const res = await fetch(url, { method, cache: 'no-store' });
  const data = await res.json();
  console.log('[FB] response:', JSON.stringify(data, null, 2));
  if (data.error) throw new Error(data.error.message || 'Facebook API error');
  return data;
}

export async function getPagePosts(pageId, token) {
  return request(`/${pageId}/feed`, {
    fields: 'id,message,story,full_picture,created_time,likes.summary(true),comments.summary(true),permalink_url',
    limit: 50,
    access_token: token,
  });
}

export async function getPagePostById(postId, token) {
  return request(`/${postId}`, {
    fields: 'id,message,story,full_picture,created_time,likes.summary(true),comments.summary(true),permalink_url',
    access_token: token,
  });
}

export async function getPostComments(postId, token) {
  return request(`/${postId}/comments`, {
    fields: 'id,message,from{id,name},created_time,comments{id,message,from{id,name},created_time}',
    summary: 'true',
    access_token: token,
  });
}

export async function replyToComment(commentId, message, token) {
  const url = new URL(`${BASE}/${commentId}/comments`);
  url.searchParams.set('message', message);
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString(), { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function getConversations(pageId, token) {
  return request(`/${pageId}/conversations`, {
    platform: 'messenger',
    fields: 'id,participants{id,name,email},updated_time,messages{id,message,from{id,name},to,created_time}',
    access_token: token,
  });
}

export async function getConversationMessages(conversationId, token) {
  return request(`/${conversationId}/messages`, {
    fields: 'id,message,from{id,name},to,created_time',
    access_token: token,
  });
}

export async function sendMessage(pageId, recipientId, message, token) {
  const url = new URL(`${BASE}/${pageId}/messages`);
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
    cache: 'no-store',
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data;
}

export async function publishPhoto(pageId, imageUrl, caption, token) {
  const url = new URL(`${BASE}/${pageId}/photos`);
  url.searchParams.set('url', imageUrl);
  url.searchParams.set('caption', caption || '');
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString(), { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

// Normalize a Facebook post to match the Instagram post shape used by the UI
export function normalizePost(post) {
  return {
    id: post.id,
    caption: post.message ?? post.story ?? '',
    media_type: post.full_picture ? 'IMAGE' : 'TEXT',
    media_url: post.full_picture ?? null,
    thumbnail_url: null,
    timestamp: post.created_time,
    like_count: post.likes?.summary?.total_count ?? 0,
    comments_count: post.comments?.summary?.total_count ?? 0,
    permalink_url: post.permalink_url ?? null,
    _platform: 'facebook',
  };
}

// Normalize a Facebook comment to match the Instagram comment shape
export function normalizeComment(comment) {
  const resolveUsername = (from) => from?.name ?? (from?.id ? `user_${from.id}` : 'Unknown');
  return {
    id: comment.id,
    text: comment.message ?? '',
    username: resolveUsername(comment.from),
    timestamp: comment.created_time,
    from: comment.from ?? {},
    replies: {
      data: (comment.comments?.data ?? []).map((r) => ({
        id: r.id,
        text: r.message ?? '',
        username: resolveUsername(r.from),
        timestamp: r.created_time,
      })),
    },
  };
}

// Normalize a Facebook conversation to match the Instagram DM shape
export function normalizeConversation(convo) {
  return {
    id: convo.id,
    updated_time: convo.updated_time,
    participants: {
      data: (convo.participants?.data ?? []).map((p) => ({
        id: p.id,
        username: p.name ?? p.email ?? p.id,
      })),
    },
    messages: {
      data: (convo.messages?.data ?? []).map((m) => ({
        id: m.id,
        text: m.message ?? '',
        from: { username: m.from?.name ?? 'Unknown', id: m.from?.id },
        timestamp: m.created_time,
      })),
    },
  };
}
