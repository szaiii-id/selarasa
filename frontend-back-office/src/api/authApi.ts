import api from './axios';

export const authApi = {
  /**
   * Fetches the CSRF cookie from Laravel Sanctum before authenticating.
   * This is strictly required for Cookie-based (SPA) authentication to prevent CSRF attacks.
   * 
   * @returns Promise resolving to the API response.
   */
  getCsrfCookie() {
    // Adjust the base URL to point to the root domain instead of the '/api/v1' prefix
    const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://selarasa:8000';
    return api.get(`${baseUrl}/sanctum/csrf-cookie`);
  },

  /**
   * Submits user credentials to the backend for authentication.
   * The token will automatically be stored in a secure HttpOnly Cookie by the backend.
   * 
   * @param credentials - Object containing username and password.
   * @returns Promise resolving to the API response.
   */
  login(credentials: object) {
    return api.post('/auth/login', credentials);
  },

  /**
   * Fetches the currently authenticated user's data using the session cookie.
   * Replaces the need for localStorage by fetching state from the backend.
   * 
   * @returns Promise resolving to the API response.
   */
  getUser() {
    return api.get('/auth/me');
  },

  /**
   * Sends a request to the backend to revoke the current session.
   * Ensures the session is securely terminated on the server side.
   * 
   * @returns Promise resolving to the API response.
   */
  logout() {
    return api.post('/auth/logout');
  }
};