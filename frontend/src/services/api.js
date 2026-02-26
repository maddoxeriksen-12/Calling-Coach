const API_BASE = '';

function getToken() {
  return localStorage.getItem('cc_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('cc_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  register(email, password, name) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  login(email, password) {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    }).then(async (res) => {
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('cc_token', data.access_token);
      return data;
    });
  },

  getMe() {
    return request('/auth/me');
  },

  uploadProduct(name, file) {
    const form = new FormData();
    form.append('name', name);
    form.append('file', file);
    return request('/products/upload', { method: 'POST', body: form });
  },

  getProducts() {
    return request('/products/');
  },

  getProduct(id) {
    return request(`/products/${id}`);
  },

  deleteProduct(id) {
    return request(`/products/${id}`, { method: 'DELETE' });
  },

  getPersonalities() {
    return request('/sessions/personalities');
  },

  createSession(productId, personalityType) {
    return request('/sessions/', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, personality_type: personalityType }),
    });
  },

  updateCallId(sessionId, vapiCallId) {
    return request(`/sessions/${sessionId}/call-id`, {
      method: 'PATCH',
      body: JSON.stringify({ vapi_call_id: vapiCallId }),
    });
  },

  getSessions() {
    return request('/sessions/');
  },

  getSession(id) {
    return request(`/sessions/${id}`);
  },

  getDashboard() {
    return request('/scores/dashboard');
  },
};
