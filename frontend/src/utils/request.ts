import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// 从环境变量获取API基础URL
const getBaseURL = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
};

const request: AxiosInstance = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
});

// Request interceptor
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 处理204 No Content响应
    if (response.status === 204) {
      return { message: '操作成功' } as any;
    }

    const { data } = response;
    if (data && data.success === false) {
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    return data;
  },
  (error) => {
    console.error('API请求失败:', error);

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 清除zustand persist存储
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      return Promise.reject(new Error('没有权限访问'));
    } else if (error.response?.status === 404) {
      return Promise.reject(new Error('请求的资源不存在'));
    } else if (error.response?.status === 500) {
      return Promise.reject(new Error('服务器内部错误'));
    } else if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请检查网络连接'));
    } else if (error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error('网络连接失败，请检查后端服务是否启动'));
    }

    // 返回原始错误信息
    const errorMsg = error.response?.data?.message || error.message || '请求失败';
    return Promise.reject(new Error(errorMsg));
  }
);

export default request;
