// Zoho accounts domain can vary by region — default to .com
const ACCOUNTS = process.env.ZOHO_ACCOUNTS_URL ?? 'https://accounts.zoho.in';
const API_BASE  = process.env.ZOHO_API_URL ?? 'https://www.zohoapis.in';
const BIGIN     = `${API_BASE}/bigin/v2`;

// ── OAuth ─────────────────────────────────────────────────────────────────────

export function buildAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.ZOHO_CLIENT_ID,
    scope:         'ZohoBigin.modules.contacts.CREATE,ZohoBigin.modules.contacts.READ,ZohoBigin.modules.contacts.UPDATE',
    redirect_uri:  redirectUri,
    access_type:   'offline',   // required to get a refresh_token
    state,
    prompt:        'consent',   // force consent screen so refresh_token is always issued
  });
  return `${ACCOUNTS}/oauth/v2/auth?${params}`;
}

export async function exchangeCode(code, redirectUri) {
  const res = await fetch(`${ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri:  redirectUri,
      code,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data; // { access_token, refresh_token, expires_in }
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(`${ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data; // { access_token, expires_in }
}

// ── Bigin API ─────────────────────────────────────────────────────────────────

async function req(accessToken, path, options = {}) {
  const res = await fetch(`${BIGIN}${path}`, {
    ...options,
    headers: {
      Authorization:  `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? JSON.stringify(data);
    throw new Error(msg || `Bigin ${res.status}`);
  }
  return data;
}

// ── Contacts ──────────────────────────────────────────────────────────────────

async function findContactBySocialHandle(accessToken, socialHandle) {
  if (!socialHandle) return null;
  try {
    const data = await req(accessToken, `/Contacts/search?criteria=(Social_Handle:equals:${encodeURIComponent(socialHandle)})`);
    return data?.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function createContact(accessToken, lead) {
  const nameParts = (lead.name ?? lead.username ?? '').trim().split(' ');
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
  const lastName  = nameParts[nameParts.length - 1] || lead.username || 'Unknown';

  const platformLabel = lead.platform === 'instagram' ? 'Instagram'
    : lead.platform === 'facebook' ? 'Facebook'
    : lead.platform === 'linkedin' ? 'LinkedIn'
    : 'Social Media';

  const description = [
    `Platform: ${platformLabel}`,
    `Intent: ${lead.intent ?? ''}`,
    `Handle: @${lead.username ?? ''}`,
    lead.commentText ? `\nComment:\n"${lead.commentText}"` : '',
    lead.postCaption ? `\nPost: ${lead.postCaption.slice(0, 200)}` : '',
  ].filter(Boolean).join('\n');

  const socialHandle = lead.username ? `${lead.platform}:${lead.username}` : null;

  const fields = {
    First_Name:    firstName,
    Last_Name:     lastName,
    Lead_Source:   'Social Media',
    Source:        platformLabel,
    Description:   description,
    ...(socialHandle ? { Social_Handle: socialHandle } : {}),
    Tag: [
      { name: platformLabel },
      ...(lead.intent ? [{ name: lead.intent }] : []),
    ],
  };

  const existingId = await findContactBySocialHandle(accessToken, socialHandle);
  if (existingId) {
    return req(accessToken, `/Contacts/${existingId}`, { method: 'PUT', body: JSON.stringify({ data: [fields] }) });
  }
  return req(accessToken, '/Contacts', { method: 'POST', body: JSON.stringify({ data: [fields] }) });
}
