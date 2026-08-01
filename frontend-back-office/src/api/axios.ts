import axios from 'axios';

/**
 * Global Axios instance configured for the Laravel RESTful backend.
 * Includes credentials and XSRF token support required for Sanctum SPA authentication.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
 * - 429: Rejects with a rate-limiting error message.
 * - 500+: Rejects with a server error message.
 * - 422: Passed down to individual components for form validation handling.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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