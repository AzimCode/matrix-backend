// Thin API client for the admin panel.
//
// The panel is served from the API's own origin, so the session cookie is
// first-party and no CORS or SameSite juggling is needed. Mutating requests
// still have to echo the csrf_token cookie back as a header — that is the
// double-submit check the server performs.

const BASE = '/api';

function csrfToken() {
  const m = /(?:^|;\s*)csrf_token=([^;]+)/.exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : null;
}

export class ApiError extends Error {
  constructor(code, message, details) {
    super(message);
    this.code = code;
    this.details = details ?? [];
  }

  /** Validation failures arrive as a list; surface them instead of a generic message. */
  get fullMessage() {
    if (!this.details.length) return this.message;
    return `${this.message}: ${this.details.map((d) => d.message).join('; ')}`;
  }
}

// A request that never settles leaves the UI frozen mid-action with no
// explanation — the button stays on "..." forever and the page looks broken
// rather than slow. Bound every call so a stalled network surfaces as an
// error the user can act on.
const TIMEOUT_MS = 20000;

/**
 * Fired when a call fails with UNAUTHORIZED on anything other than the sign-in
 * probes — i.e. the session lapsed while the panel was open.
 *
 * Announced from here rather than handled per call site: tab loads used to be
 * the only place that noticed, so an expired session during a save just showed
 * a raw server string and left the admin typing into a dead panel.
 */
export const SESSION_EXPIRED = 'admin:session-expired';

async function request(path, { method = 'GET', body, raw, anonymous = false } = {}) {
  const headers = {};
  if (body && !raw) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const token = csrfToken();
    if (token) headers['X-CSRF-Token'] = token;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: raw ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', `Сервер не ответил за ${TIMEOUT_MS / 1000} секунд`);
    }
    throw new ApiError('NETWORK', 'Не удалось связаться с сервером');
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Some responses (204, redirects) carry no JSON body.
  }

  if (!res.ok || payload?.success === false) {
    const err = payload?.error;
    const apiError = new ApiError(
      err?.code ?? `HTTP_${res.status}`,
      err?.message ?? res.statusText,
      err?.details,
    );
    if (apiError.code === 'UNAUTHORIZED' && !anonymous) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED));
    }
    throw apiError;
  }

  return payload?.data ?? null;
}

export const api = {
  config: () => request('/config'),
  // Both are expected to 401 when nobody is signed in, so neither should be
  // read as a session that just expired.
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, anonymous: true }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me', { anonymous: true }),
  changePassword: (currentPassword, newPassword) =>
    request('/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } }),

  getProfile: () => request('/admin/profile'),
  updateProfile: (data) => request('/admin/profile', { method: 'PATCH', body: data }),

  listExperience: () => request('/admin/experience'),
  createExperience: (data) => request('/admin/experience', { method: 'POST', body: data }),
  updateExperience: (id, data) => request(`/admin/experience/${id}`, { method: 'PATCH', body: data }),
  deleteExperience: (id) => request(`/admin/experience/${id}`, { method: 'DELETE' }),

  listProjects: () => request('/admin/projects?limit=100'),
  createProject: (data) => request('/admin/projects', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/admin/projects/${id}`, { method: 'PATCH', body: data }),
  deleteProject: (id) => request(`/admin/projects/${id}`, { method: 'DELETE' }),

  listSkills: () => request('/admin/skills'),
  createSkill: (data) => request('/admin/skills', { method: 'POST', body: data }),
  updateSkill: (id, data) => request(`/admin/skills/${id}`, { method: 'PATCH', body: data }),
  deleteSkill: (id) => request(`/admin/skills/${id}`, { method: 'DELETE' }),
  skillMatrix: () => request('/skills/matrix'),
  addSkillRelation: (id, relatedSkillId, strength) =>
    request(`/admin/skills/${id}/relations`, { method: 'POST', body: { relatedSkillId, strength } }),
  removeSkillRelation: (id, relatedSkillId) =>
    request(`/admin/skills/${id}/relations/${relatedSkillId}`, { method: 'DELETE' }),

  listEducation: () => request('/admin/education'),
  createEducation: (data) => request('/admin/education', { method: 'POST', body: data }),
  updateEducation: (id, data) => request(`/admin/education/${id}`, { method: 'PATCH', body: data }),
  deleteEducation: (id) => request(`/admin/education/${id}`, { method: 'DELETE' }),

  listCertificates: () => request('/admin/certificates'),
  createCertificate: (data) => request('/admin/certificates', { method: 'POST', body: data }),
  updateCertificate: (id, data) => request(`/admin/certificates/${id}`, { method: 'PATCH', body: data }),
  deleteCertificate: (id) => request(`/admin/certificates/${id}`, { method: 'DELETE' }),

  listResumes: () => request('/admin/resume'),
  activateResume: (id) => request(`/admin/resume/${id}/activate`, { method: 'PATCH' }),
  deleteResume: (id) => request(`/admin/resume/${id}`, { method: 'DELETE' }),
  uploadResume: (file, version) => {
    const fd = new FormData();
    fd.append('file', file);
    if (version) fd.append('version', version);
    return request('/admin/resume', { method: 'POST', body: fd, raw: true });
  },

  listMessages: (status) =>
    request(`/admin/messages?limit=100${status ? `&status=${status}` : ''}`),
  setMessageStatus: (id, status) => request(`/admin/messages/${id}`, { method: 'PATCH', body: { status } }),
  deleteMessage: (id) => request(`/admin/messages/${id}`, { method: 'DELETE' }),
};
