import crypto from 'crypto';

const BASE = 'https://api.canva.com/rest/v1';
const AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const TOKEN_URL = `${BASE}/oauth/token`;

// ── PKCE helpers ──────────────────────────────────────────────────────────────

export function generatePkce() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function buildAuthUrl(clientId, redirectUri, challenge, state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'design:content:read design:meta:read',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${AUTH_URL}?${params}`;
}

// ── Token exchange / refresh ──────────────────────────────────────────────────

export async function exchangeCode(code, verifier, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      client_id: process.env.CANVA_CLIENT_ID,
      client_secret: process.env.CANVA_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error ?? 'Canva token exchange failed');
  return data; // { access_token, refresh_token, expires_in }
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.CANVA_CLIENT_ID,
      client_secret: process.env.CANVA_CLIENT_SECRET,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error ?? 'Canva token refresh failed');
  return data;
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function req(accessToken, path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? data.error ?? JSON.stringify(data) ?? `Canva ${res.status}`);
  return data;
}

// ── Designs ───────────────────────────────────────────────────────────────────

export async function listDesigns(accessToken, continuation = null) {
  const params = new URLSearchParams({ ownership: 'owned', limit: '20' });
  if (continuation) params.set('continuation', continuation);
  return req(accessToken, `/designs?${params}`);
}

// ── Exports ───────────────────────────────────────────────────────────────────

export async function startExport(accessToken, designId) {
  return req(accessToken, '/exports', {
    method: 'POST',
    body: JSON.stringify({
      design_id: designId,
      format: { type: 'jpg', quality: 'high', lossless: false },
    }),
  });
}

export async function getExportJob(accessToken, jobId) {
  return req(accessToken, `/exports/${jobId}`);
}

// Poll until the export job is done (max ~30 s)
export async function waitForExport(accessToken, jobId, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const data = await getExportJob(accessToken, jobId);
    const job = data.job ?? data;
    if (job.status === 'success') {
      const url = job.urls?.[0] ?? job.export_urls?.[0];
      if (!url) throw new Error('Export succeeded but no URL returned');
      return url;
    }
    if (job.status === 'failed') throw new Error('Canva export job failed');
  }
  throw new Error('Canva export timed out');
}
