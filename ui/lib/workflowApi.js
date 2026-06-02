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
      // Token expired or invalid — redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
      return;
    }
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const workflowApi = {
  // Workflows
  list: () =>
    apiFetch('/workflows'),

  create: (arg1, arg2) => {
    // Supports: create(payload) or create(userId, payload)
    const payload = arg2 !== undefined ? arg2 : arg1;
    return apiFetch('/workflows', { method: 'POST', body: payload });
  },

  update: (arg1, arg2, arg3) => {
    // Supports: update(id, payload) or update(userId, id, payload)
    const id = arg3 !== undefined ? arg2 : arg1;
    const payload = arg3 !== undefined ? arg3 : arg2;
    return apiFetch(`/workflows/${id}`, { method: 'PATCH', body: payload });
  },

  remove: (arg1, arg2) => {
    // Supports: remove(id) or remove(userId, id)
    const id = arg2 !== undefined ? arg2 : arg1;
    return apiFetch(`/workflows/${id}`, { method: 'DELETE' });
  },

  run: (arg1, arg2, arg3) => {
    // Supports: run(id, payload) or run(userId, id, payload)
    const id = arg3 !== undefined ? arg2 : arg1;
    const payload = arg3 !== undefined ? arg3 : arg2;
    return apiFetch(`/workflows/${id}/run`, { method: 'POST', body: payload });
  },

  // Comments
  listComments: (arg1, arg2) => {
    // Supports: listComments(workflowId) or listComments(userId, workflowId)
    const workflowId = arg2 !== undefined ? arg2 : arg1;
    return apiFetch(`/workflows/${workflowId}/comments`);
  },

  listAllComments: () =>
    apiFetch('/comments'),

  addComments: (arg1, arg2, arg3) => {
    // Supports: addComments(workflowId, comments) or addComments(userId, workflowId, comments)
    const workflowId = arg3 !== undefined ? arg2 : arg1;
    const comments = arg3 !== undefined ? arg3 : arg2;
    return apiFetch(`/workflows/${workflowId}/comments`, { method: 'POST', body: { comments } });
  },

  updateComment: (arg1, arg2, arg3) => {
    // Supports: updateComment(commentId, payload) or updateComment(userId, commentId, payload)
    const commentId = arg3 !== undefined ? arg2 : arg1;
    const payload = arg3 !== undefined ? arg3 : arg2;
    return apiFetch(`/comments/${commentId}`, { method: 'PATCH', body: payload });
  },

  removeComment: (arg1, arg2) => {
    // Supports: removeComment(commentId) or removeComment(userId, commentId)
    const commentId = arg2 !== undefined ? arg2 : arg1;
    return apiFetch(`/comments/${commentId}`, { method: 'DELETE' });
  },

  // Analytics
  getAnalytics: (arg1, arg2) => {
    // Supports: getAnalytics(range) or getAnalytics(userId, range)
    const range = arg2 !== undefined ? arg2 : (typeof arg1 === 'string' && arg1.length < 5 ? arg1 : '7d');
    return apiFetch(`/analytics?range=${range}`);
  },
};
