// UNIPILE_DSN may be a full URL (https://host:port) or just host:port
const _dsn = process.env.UNIPILE_DSN ?? '';
const BASE = (_dsn.startsWith('http') ? _dsn : `https://${_dsn}`) + '/api/v1';

async function req(path, { method = 'GET', body, form } = {}) {
  const headers = {
    'X-API-KEY': process.env.UNIPILE_API_KEY,
    Accept: 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
    cache: 'no-store',
  });

  if (res.status === 204) return {};
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || JSON.stringify(data) || `Unipile ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function getHostedAuthLink(successUrl, failureUrl, notifyUrl) {
  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return req('/hosted/accounts/link', {
    method: 'POST',
    body: {
      type: 'create',
      providers: ['LINKEDIN'],
      expiresOn,
      api_url: BASE,
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      notify_url: notifyUrl,
    },
  });
}

export async function getAccount(accountId) {
  return req(`/accounts/${accountId}`);
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export async function getPosts(accountId, orgId = null) {
  if (orgId) {
    return req(`/users/${encodeURIComponent(orgId)}/posts?account_id=${encodeURIComponent(accountId)}&is_company=true&limit=20`);
  }
  const account = await getAccount(accountId);
  const providerId =
    account.provider_id ??
    account.connection_params?.provider_id ??
    account.connection_params?.username;
  if (!providerId) throw new Error('Could not determine LinkedIn provider ID from account');
  return req(`/users/${encodeURIComponent(providerId)}/posts?account_id=${encodeURIComponent(accountId)}&limit=20`);
}

export async function getPostById(postSocialId, accountId) {
  return req(`/posts/${encodeURIComponent(postSocialId)}?account_id=${encodeURIComponent(accountId)}`);
}

export async function createPost(accountId, text, imageUrl = null, organizationId = null) {
  if (imageUrl) {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error('Failed to fetch image for upload');
    const imgBuffer = await imgRes.arrayBuffer();

    const form = new FormData();
    form.append('account_id', accountId);
    form.append('text', text);
    form.append('attachments', new Blob([imgBuffer], { type: 'image/jpeg' }), 'image.jpg');
    if (organizationId) form.append('as_organization', organizationId);

    const res = await fetch(`${BASE}/posts`, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.UNIPILE_API_KEY,
        Accept: 'application/json',
      },
      body: form,
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || JSON.stringify(data) || `Unipile ${res.status}`);
    return data;
  }

  const body = { account_id: accountId, text };
  if (organizationId) body.as_organization = organizationId;
  return req('/posts', { method: 'POST', body });
}

// ── Comments ──────────────────────────────────────────────────────────────────

export async function getPostComments(postSocialId, accountId) {
  return req(`/posts/${encodeURIComponent(postSocialId)}/comments?account_id=${encodeURIComponent(accountId)}`);
}

export async function replyToComment(postSocialId, commentId, text, accountId) {
  return req(`/posts/${encodeURIComponent(postSocialId)}/comments`, {
    method: 'POST',
    body: { account_id: accountId, text, comment_id: commentId },
  });
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export async function getChats(accountId) {
  return req(`/chats?account_id=${encodeURIComponent(accountId)}`);
}

export async function getChatMessages(chatId) {
  return req(`/chats/${chatId}/messages`);
}

export async function sendMessage(chatId, text) {
  return req(`/chats/${chatId}/messages`, { method: 'POST', body: { text } });
}

export async function startNewChat(accountId, attendeeIds, text) {
  return req('/chats', {
    method: 'POST',
    body: { account_id: accountId, attendees_ids: attendeeIds, text },
  });
}

// ── Normalizers ───────────────────────────────────────────────────────────────

export function normalizePost(post) {
  return {
    id: post.social_id ?? post.id ?? '',
    caption: post.text ?? '',
    media_type: post.attachments?.length > 0 ? 'IMAGE' : 'TEXT',
    media_url: post.attachments?.[0]?.url ?? null,
    thumbnail_url: post.attachments?.[0]?.url ?? null,
    timestamp: post.created_at ? new Date(post.created_at).toISOString() : null,
    like_count: post.reaction_counter ?? 0,
    comments_count: post.comment_counter ?? 0,
    permalink_url: post.url ?? null,
    _platform: 'linkedin',
  };
}

export function normalizeComment(comment) {
  return {
    id: comment.comment_id ?? comment.id ?? '',
    text: comment.text ?? '',
    username: comment.author_info?.name ?? 'LinkedIn Member',
    timestamp: comment.created_at ? new Date(comment.created_at).toISOString() : null,
    from: {
      id: comment.author_info?.provider_id ?? '',
      name: comment.author_info?.name ?? 'LinkedIn Member',
    },
    replies: { data: [] },
  };
}
