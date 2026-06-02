const API_URL =
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ??
  'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const adminApi = {
  getStats: () => apiFetch('/admin/stats'),
  listUsers: (options = {}) => {
    const limit = options.limit ?? 100;
    return apiFetch(`/admin/users?limit=${limit}`);
  },
  createUser: (userData) => apiFetch('/admin/users', { method: 'POST', body: userData }),
  deleteUser: (userId) => apiFetch(`/admin/users/${userId}`, { method: 'DELETE' }),
  linkWorkflows: (userId, workflowIds) => apiFetch(`/admin/users/${userId}/link-workflows`, { method: 'POST', body: { workflowIds } }),
};
