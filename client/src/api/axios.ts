import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(name + '='))
    ?.split('=')[1];
}

api.interceptors.request.use((config) => {
  const token = getCookie('csrf_token');
  if (token) {
    config.headers['x-csrf-token'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
