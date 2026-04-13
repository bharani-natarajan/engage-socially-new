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
