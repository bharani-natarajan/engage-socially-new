export const dynamic = 'force-dynamic';

// Facebook sends a GET request to verify the webhook endpoint.
// It passes hub.verify_token — we must echo back hub.challenge if it matches.
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('[Webhook] Verified successfully');
    return new Response(challenge, { status: 200 });
  }

  console.warn('[Webhook] Verification failed — token mismatch');
  return new Response('Forbidden', { status: 403 });
}

// Facebook sends POST requests with event payloads (new comments, mentions, etc.)
export async function POST(request) {
  const body = await request.json();
  console.log('[Webhook] Event received:', JSON.stringify(body, null, 2));

  // Process webhook events here in future (e.g. new comment notifications)

  return new Response('OK', { status: 200 });
}
