import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api', // URL do Backend
});

// Interceptor para injetar o token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('saas_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar expiração de token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se der erro 401 (Não autorizado), desloga o utilizador
      localStorage.removeItem('saas_token');
      localStorage.removeItem('saas_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;