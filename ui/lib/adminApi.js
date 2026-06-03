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
    if (res.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      return;
    }
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
  getUser: (userId) => apiFetch(`/admin/users/${userId}`),
  updateUser: (userId, userData) => apiFetch(`/admin/users/${userId}`, { method: 'PATCH', body: userData }),
  linkWorkflows: (userId, workflowIds) => apiFetch('/admin/link-workflows', { method: 'POST', body: { userId, workflowIds } }),
};
