import api from './axios';

/**
 * Checks if the XSRF-TOKEN cookie currently exists in the browser.
 * 
 * @returns {boolean} True if the token exists.
 */
const hasCsrfCookie = (): boolean => {
  return document.cookie
    .split('; ')
    .some((row) => row.startsWith('XSRF-TOKEN='));
};

/**
 * Resolves the base URL for Sanctum requests by removing the API prefix.
 * 
 * @returns {string} The formatted Sanctum URL.
 */
const getSanctumUrl = (): string => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://selarasa:8000';
  return `${baseUrl}/sanctum/csrf-cookie`;
};

export const authApi = {
  /**
   * Fetches the CSRF cookie only if it does not already exist in the browser.
   */
  async ensureCsrfCookie(): Promise<void> {
    if (!hasCsrfCookie()) {
      await api.get(getSanctumUrl(), { 
        timeout: 15000 
      });
    }
  },

  /**
   * Forces a refresh of the CSRF cookie. Used primarily for recovering from 419 errors.
   */
  async refreshCsrfCookie(): Promise<void> {
    await api.get(getSanctumUrl(), { 
      timeout: 15000 
    });
  },

  /**
   * Submits user credentials for authentication.
   * 
   * @param {object} credentials - User username and password.
   */
  login(credentials: object) {
    // Endpoint khusus Back Office
    return api.post('/backoffice/auth/login', credentials, {
      timeout: 20000
    });
  },

  /**
   * Fetches the currently authenticated user's data using the session cookie.
   */
  getUser() {
    return api.get('/auth/me', {
      timeout: 8000
    });
  },

  /**
   * Revokes the current session on the backend.
   * 
   * @param {object} config - Optional Axios request configuration (e.g., AbortController signal).
   */
  logout(config = {}) {
    return api.post('/auth/logout', {}, {
      timeout: 4000, 
      ...config
    });
  }
};