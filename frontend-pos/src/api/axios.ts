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
 * Response Interceptor to handle global API HTTP status codes.
 * - 401: Redirects unauthenticated users to the login page.
 * - 403: Passed down to individual components/stores for role permission alerts. 
 * - 422: Passed down to individual components for form validation handling.
 * - 429: Rejects with a rate-limiting error message.
 * - 500+: Rejects with a server error message.
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
    } else if (status === 429) {
      return Promise.reject(new Error('Too many requests. Please try again later.'));
    } else if (status >= 500) {
      return Promise.reject(new Error('Server is currently unavailable. Please try again later.'));
    }
    
    return Promise.reject(error);
  }
);

export default api;



