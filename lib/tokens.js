import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function getTokens() {
  const store = await cookies();
  return {
    accessToken: store.get('ig_access_token')?.value ?? null,
    userId: store.get('ig_user_id')?.value ?? null,
    username: store.get('ig_username')?.value ?? null,
  };
}

export async function requireAuth() {
  const tokens = await getTokens();
  if (!tokens.accessToken || !tokens.userId) {
    return {
      tokens: null,
      error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  return { tokens, error: null };
}

export async function getFbTokens() {
  const store = await cookies();
  return {
    pageToken: store.get('fb_page_token')?.value ?? null,
    pageId: store.get('fb_page_id')?.value ?? null,
    pageName: store.get('fb_page_name')?.value ?? null,
  };
}

export async function requireFbAuth() {
  const tokens = await getFbTokens();
  if (!tokens.pageToken || !tokens.pageId) {
    return {
      tokens: null,
      error: NextResponse.json(
        { error: 'Facebook not connected. Please reconnect your account to enable Facebook access.' },
        { status: 401 }
      ),
    };
  }
  return { tokens, error: null };
}

export async function getUnipileTokens() {
  const store = await cookies();
  return {
    accountId: store.get('unipile_account_id')?.value ?? null,
    name: store.get('unipile_name')?.value ?? null,
  };
}

export async function requireUnipileAuth() {
  const tokens = await getUnipileTokens();
  if (!tokens.accountId) {
    return {
      tokens: null,
      error: NextResponse.json(
        { error: 'LinkedIn not connected. Please connect your LinkedIn account in Settings.' },
        { status: 401 }
      ),
    };
  }
  return { tokens, error: null };
}

export async function getUnipileIgTokens() {
  const store = await cookies();
  return {
    accountId: store.get('unipile_ig_account_id')?.value ?? null,
    name: store.get('unipile_ig_name')?.value ?? null,
  };
}

export async function requireUnipileIgAuth() {
  const tokens = await getUnipileIgTokens();
  if (!tokens.accountId) {
    return {
      tokens: null,
      error: NextResponse.json(
        { error: 'Instagram not connected. Please connect your Instagram account in Settings.' },
        { status: 401 }
      ),
    };
  }
  return { tokens, error: null };
}

export async function getUnipileFbTokens() {
  const store = await cookies();
  return {
    accountId: store.get('unipile_fb_account_id')?.value ?? null,
    name: store.get('unipile_fb_name')?.value ?? null,
  };
}

export async function requireUnipileFbAuth() {
  const tokens = await getUnipileFbTokens();
  if (!tokens.accountId) {
    return {
      tokens: null,
      error: NextResponse.json(
        { error: 'Facebook not connected. Please connect your Facebook account in Settings.' },
        { status: 401 }
      ),
    };
  }
  return { tokens, error: null };
}
