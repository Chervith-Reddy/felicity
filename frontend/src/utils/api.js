import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('felicity_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    const isLoginRoute = err.config?.url?.includes('/auth/login') || err.config?.url?.includes('/auth/organizer/login');
    if (err.response?.status === 401 && !isLoginRoute) {
      localStorage.removeItem('felicity_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
