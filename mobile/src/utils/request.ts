import axios from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('mobile_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

request.interceptors.response.use(
  (response) => {
    if (response.status === 204) return { message: '操作成功' } as any;
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mobile_token');
      localStorage.removeItem('mobile_user');
      window.location.href = '/login';
    }
    const msg = error.response?.data?.message || error.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

export default request;
