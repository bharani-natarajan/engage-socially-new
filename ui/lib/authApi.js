const API_URL =
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ??
  'http://localhost:4000';

async function authFetch(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${API_URL}/auth${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const authApi = {
  signup: (payload) =>
    authFetch('/signup', { body: payload }),

  verifySignup: (email, code) =>
    authFetch('/verify-signup', { body: { email, code } }),

  login: (email, password, unipileAccountId) =>
    authFetch('/login', { body: { email, password, unipileAccountId } }),

  verifyLogin: (email, code) =>
    authFetch('/verify-login', { body: { email, code } }),

  forgotPassword: (email) =>
    authFetch('/forgot-password', { body: { email } }),

  resetPassword: (email, code, newPassword) =>
    authFetch('/reset-password', { body: { email, code, newPassword } }),

  resendOtp: (email, type) =>
    authFetch('/resend-otp', { body: { email, type } }),

  getMe: (token) =>
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),

  updateUnipileAccount: (token, unipileAccountId) =>
    fetch(`${API_URL}/auth/unipile-account`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ unipileAccountId })
    }).then(r => r.json()),

  updateGeminiApiKey: (token, geminiApiKey) =>
    fetch(`${API_URL}/auth/gemini-settings`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ geminiApiKey })
    }).then(r => r.json()),
};
