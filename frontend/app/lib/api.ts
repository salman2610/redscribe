import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.24:8000';

export const api = axios.create({
  baseURL: API_BASE,
});

// Auto-attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password })),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

export const projects = {
  list: () => api.get('/projects'),
  create: (data: any) => api.post('/projects', data),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const findings = {
  list: (projectId: string) => api.get(`/findings/project/${projectId}`),
  create: (projectId: string, data: any) => api.post(`/findings/project/${projectId}`, data),
  update: (id: string, data: any) => api.put(`/findings/${id}`, data),
  delete: (id: string) => api.delete(`/findings/${id}`),
  reorder: (projectId: string, findingIds: string[]) => api.post(`/findings/project/${projectId}/reorder`, { finding_ids: findingIds }),
};

export const attackChains = {
  list: (projectId: string) => api.get(`/attack-chains/project/${projectId}`),
  create: (projectId: string, data: any) => api.post(`/attack-chains/project/${projectId}`, data),
  update: (id: string, data: any) => api.put(`/attack-chains/${id}`, data),
  delete: (id: string) => api.delete(`/attack-chains/${id}`),
};

export const assets = {
  list: (projectId: string) => api.get(`/assets/project/${projectId}`),
  create: (projectId: string, data: any) => api.post(`/assets/project/${projectId}`, data),
  delete: (id: string) => api.delete(`/assets/${id}`),
};

export const evidence = {
  list: (findingId: string) => api.get(`/evidence/findings/${findingId}`),
  upload: (findingId: string, file: File, caption: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    return api.post(`/evidence/findings/${findingId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
  },
  delete: (id: string) => api.delete(`/evidence/${id}`),
  fileUrl: (filePath: string) => `${API_BASE}/evidence/file/${filePath}`,
};

export const uploads = {
  nmap: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/uploads/project/${projectId}/nmap`, form);
  },
  burp: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/uploads/project/${projectId}/burp`, form);
  },
  nessus: (projectId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/uploads/project/${projectId}/nessus`, form);
  },
};

export const ai = {
  enrich: (findingId: string) => api.post(`/ai/enrich/${findingId}`),
  enrichAll: (projectId: string) => api.post(`/ai/enrich-all/${projectId}`),
  executiveSummary: (projectId: string) => api.post(`/ai/executive-summary/${projectId}`),
  rewrite: (text: string, tone: string) => api.post(`/ai/rewrite?text=${encodeURIComponent(text)}&tone=${tone}`),
  improve: (text: string, field: string, context?: string) =>
    api.post('/ai/improve', { text, field, context: context || '' }),
};
