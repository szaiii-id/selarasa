import axios from 'axios';

/**
 * Global Axios instance configured for the Laravel RESTful backend.
 * Includes credentials and XSRF token support required for Sanctum SPA authentication.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 8000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true
});

/**
 * Response interceptor for global HTTP status handling.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401) {
      const isAuthCheck = requestUrl.includes('/auth/me');
      if (!isAuthCheck && window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    } else if (status >= 500) {
      error.userMessage = 'Server is currently unavailable. Please try again later.';
    }

    return Promise.reject(error);
  }
);

export default api;