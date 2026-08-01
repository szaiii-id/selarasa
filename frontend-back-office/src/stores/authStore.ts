import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/authApi';
import type { User } from '../types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref<boolean>(false);
  
  const errorMessage = ref<string | null>(null);
  const validationErrors = ref<Record<string, string[]>>({});

  const isAuthenticated = computed(() => user.value !== null);

  /**
   * Fetches the currently authenticated user's data from the backend using the session cookie.
   * This is used to restore the user session on page refresh.
   * Role eligibility is enforced entirely by the backend during login (AuthService),
   * so no role check is duplicated here.
   * 
   * @returns {Promise<boolean>} A boolean indicating if a valid session exists.
   */
  const fetchUser = async (): Promise<boolean> => {
    try {
      const response = await authApi.getUser();
      const userData = response.data?.data?.user;

      if (!userData) {
        user.value = null;
        return false;
      }

      user.value = userData;
      return true;
    } catch (error) {
      user.value = null;
      return false;
    }
  };

  /**
   * Authenticates the user and establishes a secure HttpOnly cookie session.
   * Role-based access restriction (e.g. blocking 'cashier') is fully handled
   * by the backend (AuthService) — it returns 401 before the session is created,
   * so this function never needs to re-check the role on its own.
   * 
   * @param {Record<string, any>} credentials - The user's login credentials.
   * @returns {Promise<boolean>} A boolean indicating success or failure.
   */
  const login = async (credentials: Record<string, any>): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {}; 
    
    try {
      await authApi.getCsrfCookie();

      const response = await authApi.login(credentials);
      const userData = response.data?.data?.user;

      if (!userData) {
        throw new Error('Invalid response structure from server.');
      }

      user.value = userData;
      
      return true;
    } catch (error: any) {
      const status = error.response?.status;

      if (status === 422) {
        validationErrors.value = error.response.data.errors || {};
        errorMessage.value = null; 
      } else if (status === 401) {
        errorMessage.value = error.response?.data?.message || 'Authentication failed. Please try again.';
        validationErrors.value = {}; 
      } else {
        errorMessage.value = error.message || 'An error occurred on the server.';
      }
      
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Clears the validation error for a specific field when the user starts typing.
   * 
   * @param {string} field - The name of the form field (e.g., 'username' or 'password').
   */
  const clearError = (field: string) => {
    if (validationErrors.value[field]) {
      const updatedErrors = { ...validationErrors.value };
      delete updatedErrors[field];
      validationErrors.value = updatedErrors;
    }
    errorMessage.value = null;
  };

  /**
   * Clears the user session on the server and removes local state.
   */
  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed on the server:', error);
    } finally {
      user.value = null;
      window.location.href = '/login';
    }
  };

  return { 
    user,
    isAuthenticated,
    isLoading, 
    errorMessage, 
    validationErrors,
    clearError,
    fetchUser,
    login, 
    logout 
  };
});