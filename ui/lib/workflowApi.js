const API_URL =
  (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined) ??
  'http://localhost:4000';

async function apiFetch(path, { method = 'GET', body, userId } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const workflowApi = {
  // Workflows
  list: (userId) =>
    apiFetch('/workflows', { userId }),

  create: (userId, payload) =>
    apiFetch('/workflows', { method: 'POST', body: payload, userId }),

  update: (userId, id, payload) =>
    apiFetch(`/workflows/${id}`, { method: 'PATCH', body: payload, userId }),

  remove: (userId, id) =>
    apiFetch(`/workflows/${id}`, { method: 'DELETE', userId }),

  // Comments
  listComments: (userId, workflowId) =>
    apiFetch(`/workflows/${workflowId}/comments`, { userId }),

  addComments: (userId, workflowId, comments) =>
    apiFetch(`/workflows/${workflowId}/comments`, { method: 'POST', body: { comments }, userId }),

  updateComment: (userId, commentId, payload) =>
    apiFetch(`/comments/${commentId}`, { method: 'PATCH', body: payload, userId }),

  removeComment: (userId, commentId) =>
    apiFetch(`/comments/${commentId}`, { method: 'DELETE', userId }),
};
