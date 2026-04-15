const BASE = 'https://graph.facebook.com/v25.0';

async function request(path, params = {}, method = 'GET') {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    method,
    cache: 'no-store',
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || 'Instagram API error');
  return data;
}

export async function getAccount(userId, token) {
  return request(`/${userId}`, {
    fields: 'username,name,biography,followers_count,media_count,profile_picture_url,website',
    access_token: token,
  });
}

export async function getMedia(userId, token) {
  return request(`/${userId}/media`, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
    limit: 50,
    access_token: token,
  });
}

export async function getMediaById(mediaId, token) {
  return request(`/${mediaId}`, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
    access_token: token,
  });
}

export async function getMediaInsights(mediaId, token, mediaType) {
  const metric =
    mediaType === 'VIDEO'
      ? 'reach,impressions,saved,video_views'
      : 'reach,impressions,saved';
  return request(`/${mediaId}/insights`, { metric, access_token: token });
}

export async function getComments(mediaId, token) {
  return request(`/${mediaId}/comments`, {
    fields: 'id,text,username,timestamp,like_count,from{id,username},replies{id,text,username,timestamp,from{id,username}}',
    access_token: token,
  });
}

export async function getConversations(userId, token) {
  return request(`/${userId}/conversations`, {
    platform: 'instagram',
    fields: 'id,participants,updated_time,messages{id,text,from,to,timestamp}',
    access_token: token,
  });
}

export async function getConversationMessages(conversationId, token) {
  return request(`/${conversationId}/messages`, {
    fields: 'id,text,from,to,timestamp',
    access_token: token,
  });
}

export async function sendDirectMessage(userId, recipientId, message, token) {
  const url = new URL(`${BASE}/${userId}/messages`);
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

export async function replyToComment(commentId, message, token) {
  const url = new URL(`${BASE}/${commentId}/replies`);
  url.searchParams.set('message', message);
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString(), { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function createMediaContainer(userId, imageUrl, caption, token) {
  const url = new URL(`${BASE}/${userId}/media`);
  url.searchParams.set('image_url', imageUrl);
  url.searchParams.set('media_type', 'IMAGE');
  url.searchParams.set('caption', caption || '');
  url.searchParams.set('access_token', token);
  console.log('[Instagram] Creating container with image_url:', imageUrl);
  const res = await fetch(url.toString(), { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  console.log('[Instagram] Container response:', JSON.stringify(data));
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function getContainerStatus(containerId, token) {
  return request(`/${containerId}`, { fields: 'status_code', access_token: token });
}

export async function publishContainer(userId, creationId, token) {
  const url = new URL(`${BASE}/${userId}/media_publish`);
  url.searchParams.set('creation_id', creationId);
  url.searchParams.set('access_token', token);
  const res = await fetch(url.toString(), { method: 'POST', cache: 'no-store' });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}
