// client/src/services/api.js

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('accessToken')

  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

export const authAPI = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  verifyEmail: (body) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  resendOtp: (body) => request('/auth/resend-otp', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
}

export const sessionsAPI = {
  getAll: () => request('/sessions'),
  getById: (id) => request(`/sessions/${id}`),
  create: (body) => request('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
  getStats: () => request('/sessions/dashboard-stats'),
  presign: (id, body) => request(`/sessions/${id}/presign`, { method: 'POST', body: JSON.stringify(body) }),
  createSubmission: (id, body) => request(`/sessions/${id}/submissions`, { method: 'POST', body: JSON.stringify(body) }),
}
