// Run: node scripts/zoho_exchange.mjs <grant_code>
// Get the grant code from Zoho API Console → Self Client → Generate Code
// Run immediately — the code expires in a few minutes.

import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const env = {};
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  }
  return env;
}

const code = process.argv[2];
if (!code) { console.error('Usage: node scripts/zoho_exchange.mjs <grant_code>'); process.exit(1); }

const env = loadEnv();
const clientId     = env.ZOHO_CLIENT_ID;
const clientSecret = env.ZOHO_CLIENT_SECRET;

const domains = ['https://accounts.zoho.in', 'https://accounts.zoho.com'];

for (const domain of domains) {
  console.log(`\nTrying ${domain} ...`);
  const res = await fetch(`${domain}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, client_secret: clientSecret, code }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));

  if (data.refresh_token) {
    console.log('\n✓ Success! Add this to your .env.local:');
    console.log(`ZOHO_ACCOUNTS_URL=${domain}`);
    console.log(`ZOHO_REFRESH_TOKEN=${data.refresh_token}`);
    process.exit(0);
  }
}
