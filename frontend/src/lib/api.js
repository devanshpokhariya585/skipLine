const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let token = localStorage.getItem('sc_token') || null;

export function setToken(t) {
  token = t;
  if (t) localStorage.setItem('sc_token', t);
  else localStorage.removeItem('sc_token');
}

export function getToken() {
  return token;
}

async function request(method, path, body, isForm = false) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (isForm) {
    payload = body; // FormData; browser sets content-type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload });

  // Some endpoints (template download) return a file.
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/vnd') || type.includes('octet-stream')) {
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong');
    err.status = res.status;
    err.errors = data.errors || null; // field-level errors, when provided
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
  upload: (p, formData) => request('POST', p, formData, true),
  getBlob: (p) => request('GET', p),
};
