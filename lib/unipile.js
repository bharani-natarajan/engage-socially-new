// UNIPILE_DSN may be a full URL (https://host:port) or just host:port
const _dsn = process.env.UNIPILE_DSN ?? '';
const DSN_BASE = _dsn.startsWith('http') ? _dsn : `https://${_dsn}`;
const BASE = DSN_BASE + '/api/v1';

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

export async function getHostedAuthLink(successUrl, failureUrl, notifyUrl, providers = ['LINKEDIN']) {
  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return req('/hosted/accounts/link', {
    method: 'POST',
    body: {
      type: 'create',
      providers,
      expiresOn,
      api_url: DSN_BASE,
      success_redirect_url: successUrl,
      failure_redirect_url: failureUrl,
      notify_url: notifyUrl,
    },
  });
}

export async function getAccount(accountId) {
  return req(`/accounts/${accountId}`);
}

export async function getAccounts() {
  return req('/accounts');
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export async function getPosts(accountId, orgId = null) {
  if (orgId) {
    return req(`/users/${encodeURIComponent(orgId)}/posts?account_id=${encodeURIComponent(accountId)}&is_company=true&limit=20`);
  }
  const account = await getAccount(accountId);
  const providerId =
    account.connection_params?.im?.id ??
    account.provider_id ??
    account.connection_params?.provider_id;
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
  const body = { account_id: accountId, text };
  if (commentId) body.comment_id = commentId;
  return req(`/posts/${encodeURIComponent(postSocialId)}/comments`, {
    method: 'POST',
    body,
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

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchLinkedInPosts(accountId, keywords, { cursor = null, datePosted = null } = {}) {
  const body = { api: 'classic', category: 'posts', keywords };
  if (cursor) body.cursor = cursor;
  if (datePosted) body.date_posted = datePosted;
  return req(`/linkedin/search?account_id=${encodeURIComponent(accountId)}`, {
    method: 'POST',
    body,
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

export function normalizeSearchPost(post) {
  const author = post.author ?? post.actor ?? {};
  return {
    id: post.social_id ?? post.id ?? '',
    text: post.text ?? '',
    author: {
      name: author.name ?? author.full_name ?? 'LinkedIn Member',
      headline: author.headline ?? '',
      profile_url: author.public_identifier
        ? `https://www.linkedin.com/in/${author.public_identifier}`
        : null,
      avatar_url: author.profile_picture_url ?? null,
    },
    share_url: post.share_url ?? post.url ?? null,
    reaction_count: post.reaction_count ?? post.reaction_counter ?? 0,
    comment_count: post.comment_count ?? post.comment_counter ?? 0,
    timestamp: post.date ?? post.created_at ?? null,
    media_url: post.attachments?.[0]?.url ?? null,
  };
}

export function normalizeComment(comment) {
  const authorDetails = comment.author_details ?? {};
  const displayName = comment.author ?? authorDetails.name ?? 'LinkedIn Member';
  const profileUrl = authorDetails.profile_url ?? null;
  const providerId = authorDetails.id ?? null;

  const rawTs = comment.date ?? comment.created_at;
  let timestamp = null;
  if (rawTs) {
    const ms = typeof rawTs === 'number' ? (rawTs < 1e11 ? rawTs * 1000 : rawTs) : new Date(rawTs).getTime();
    if (!isNaN(ms)) timestamp = new Date(ms).toISOString();
  }

  return {
    id: comment.id ?? comment.comment_id ?? '',
    text: comment.text ?? '',
    username: displayName,
    timestamp,
    from: {
      id: providerId ?? '',
      name: displayName,
      profile_url: profileUrl,
    },
    replies: { data: [] },
  };
}

export function normalizeIgPost(post) {
  return {
    id: post.social_id ?? post.id ?? '',
    caption: post.text ?? '',
    media_type: post.attachments?.length > 0 ? 'IMAGE' : 'TEXT',
    media_url: post.attachments?.[0]?.url ?? null,
    thumbnail_url: post.attachments?.[0]?.url ?? null,
    timestamp: post.created_at ? new Date(post.created_at).toISOString() : null,
    like_count: post.reaction_counter ?? 0,
    comments_count: post.comment_counter ?? 0,
    permalink: post.url ?? null,
    permalink_url: post.url ?? null,
    _platform: 'instagram',
  };
}

export function normalizeFbPost(post) {
  return {
    id: post.social_id ?? post.id ?? '',
    caption: post.text ?? '',
    media_type: post.attachments?.length > 0 ? 'IMAGE' : 'TEXT',
    media_url: post.attachments?.[0]?.url ?? null,
    thumbnail_url: null,
    timestamp: post.created_at ? new Date(post.created_at).toISOString() : null,
    like_count: post.reaction_counter ?? 0,
    comments_count: post.comment_counter ?? 0,
    permalink_url: post.url ?? null,
    _platform: 'facebook',
  };
}

export function normalizeIgComment(comment) {
  return normalizeComment(comment);
}

export function normalizeFbComment(comment) {
  const authorDetails = comment.author_details ?? {};
  const displayName = comment.author ?? authorDetails.name ?? 'Facebook User';
  const profileUrl = authorDetails.profile_url ?? null;
  const providerId = authorDetails.id ?? null;

  const rawTs = comment.date ?? comment.created_at;
  let timestamp = null;
  if (rawTs) {
    const ms = typeof rawTs === 'number' ? (rawTs < 1e11 ? rawTs * 1000 : rawTs) : new Date(rawTs).getTime();
    if (!isNaN(ms)) timestamp = new Date(ms).toISOString();
  }

  return {
    id: comment.id ?? comment.comment_id ?? '',
    text: comment.text ?? '',
    username: displayName,
    timestamp,
    from: {
      id: providerId ?? '',
      name: displayName,
      profile_url: profileUrl,
    },
    replies: { data: [] },
  };
}

export function normalizeChat(chat) {
  const attendees = chat.attendees ?? chat.participants ?? [];
  const lastMsg = chat.last_message ?? null;
  return {
    id: chat.id ?? '',
    updated_time: chat.updated_at ?? chat.last_message_at ?? lastMsg?.created_at ?? null,
    participants: {
      data: attendees.map((a) => ({
        id: a.provider_id ?? a.id ?? '',
        username: a.name ?? a.username ?? a.provider_id ?? a.id ?? 'Unknown',
      })),
    },
    messages: {
      data: lastMsg ? [{
        id: lastMsg.id ?? '',
        text: lastMsg.text ?? '',
        from: {
          username: lastMsg.sender?.name ?? 'Unknown',
          id: lastMsg.sender?.provider_id ?? lastMsg.sender?.id ?? '',
        },
        timestamp: lastMsg.created_at ?? null,
      }] : [],
    },
  };
}

export function normalizeChatMessage(msg) {
  return {
    id: msg.id ?? '',
    text: msg.text ?? msg.body ?? '',
    from: {
      username: msg.sender?.name ?? (msg.sender?.is_me ? 'me' : 'Unknown'),
      id: msg.sender?.provider_id ?? msg.sender?.id ?? '',
    },
    timestamp: msg.created_at ?? null,
    _isMe: msg.sender?.is_me ?? false,
  };
}

export async function deletePost(postSocialId, accountId) {
  return req(`/posts/${encodeURIComponent(postSocialId)}?account_id=${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  });
}
