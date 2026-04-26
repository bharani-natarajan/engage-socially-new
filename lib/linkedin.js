const REST = 'https://api.linkedin.com/rest';
const V2 = 'https://api.linkedin.com/v2';

async function request(path, { token, method = 'GET', body, params = {}, base = REST } = {}) {
  let url = `${base}${path}`;
  if (Object.keys(params).length > 0) {
    url += '?' + new URLSearchParams(params).toString();
  }
  const headers = {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': '202501',
    'X-Restli-Protocol-Version': '2.0.0',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  // 201 Created: id is in the response header
  if (res.status === 201) {
    const id = res.headers.get('x-restli-id') ?? res.headers.get('X-RestLi-Id') ?? null;
    return { id };
  }
  if (res.status === 204) return {};

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `LinkedIn API error ${res.status}`);
  return data;
}

export async function getProfile(token) {
  return request('/userinfo', { token, base: V2 });
}

export async function getPosts(authorUrn, token) {
  return request('/posts', {
    token,
    params: { q: 'author', author: authorUrn, count: 20, sortBy: 'LAST_MODIFIED' },
  });
}

export async function getPostById(postUrn, token) {
  return request(`/posts/${encodeURIComponent(postUrn)}`, { token });
}

export async function getSocialActions(postUrn, token) {
  return request(`/socialActions/${encodeURIComponent(postUrn)}`, { token });
}

export async function getPostComments(postUrn, token) {
  return request(`/socialActions/${encodeURIComponent(postUrn)}/comments`, {
    token,
    params: { count: 50 },
  });
}

export async function initializeImageUpload(ownerUrn, token) {
  return request('/images?action=initializeUpload', {
    token,
    method: 'POST',
    body: { initializeUploadRequest: { owner: ownerUrn } },
  });
}

export async function uploadImageBinary(uploadUrl, buffer, token) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: buffer,
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`LinkedIn image upload failed: ${res.status}`);
}

export async function publishPost(authorUrn, caption, imageUrn, token) {
  const body = {
    author: authorUrn,
    lifecycleState: 'PUBLISHED',
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    commentary: caption ?? '',
  };
  if (imageUrn) {
    body.content = { media: { id: imageUrn } };
  }
  return request('/posts', { token, method: 'POST', body });
}

export function normalizePost(post) {
  const urn = post.id ?? '';
  return {
    id: urn,
    caption: post.commentary ?? '',
    media_type: post.content?.media ? 'IMAGE' : 'TEXT',
    media_url: null, // LinkedIn doesn't expose CDN image URLs in the post list
    thumbnail_url: null,
    timestamp: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
    like_count: post.likeCount ?? 0,
    comments_count: post.commentCount ?? 0,
    permalink_url: `https://www.linkedin.com/feed/update/${encodeURIComponent(urn)}`,
    _platform: 'linkedin',
  };
}

export function normalizeComment(comment) {
  return {
    id: comment.id ?? '',
    text: comment.message?.text ?? '',
    username: 'LinkedIn Member',
    timestamp: comment.createdAt ? new Date(comment.createdAt).toISOString() : null,
    from: { id: comment.actor ?? '', name: 'LinkedIn Member' },
    replies: { data: [] },
  };
}
