import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api/authApi';
import type { User } from '../types/auth';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref<boolean>(false);
  const isSessionChecked = ref<boolean>(false);

  const errorMessage = ref<string | null>(null);
  const validationErrors = ref<Record<string, string[]>>({});

  const isAuthenticated = computed(() => user.value !== null);

  /**
   * Fetches the authenticated user's data to restore session on page refresh.
   * 
   * @returns {Promise<boolean>} True if a valid session exists.
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
    } finally {
      isSessionChecked.value = true;
    }
  };

  /**
   * Authenticates the user with Smart CSRF check and automatic retry on 419 errors.
   * 
   * @param {Record<string, any>} credentials - The user's login credentials.
   * @returns {Promise<boolean>} True if login is successful.
   */
  const login = async (credentials: Record<string, any>): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {}; 
    
    try {
      // 1. Smart CSRF: Hanya fetch dari server jika cookie belum ada
      await authApi.ensureCsrfCookie();

      // 2. Login & ambil data user dalam 1 request (Single-Roundtrip)
      const response = await authApi.login(credentials);
      const userData = response.data?.data?.user;

      if (!userData) {
        throw new Error('Invalid response structure from server.');
      }

      user.value = userData;
      isSessionChecked.value = true;
      
      return true;
    } catch (error: any) {
      const status = error.response?.status;

      // 3. Auto-Retry: Jika token kedaluwarsa, ambil CSRF baru dan ulangi login otomatis 1x
      if (status === 419 && !credentials._isRetry) {
        try {
          await authApi.refreshCsrfCookie();
          return await login({ ...credentials, _isRetry: true });
        } catch (retryError) {
          errorMessage.value = 'Security session expired. Please try logging in again.';
          return false;
        }
      }

      // 4. Handle error lainnya (Validasi, Auth, Timeout)
      if (status === 422) {
        validationErrors.value = error.response.data.errors || {};
        errorMessage.value = null; 
      } else if (status === 401 || status === 403) {
        errorMessage.value = error.response?.data?.message || 'Authentication failed. Please try again.';
        validationErrors.value = {}; 
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage.value = 'Slow network connection. Please check your internet and try again.';
      } else if (!error.response && error.message) {
        errorMessage.value = error.message;
      } else {
        errorMessage.value = error.response?.data?.message || 'An error occurred on the server.';
      }
      
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Clears the validation error for a specific field.
   * 
   * @param {string} field - The name of the form field.
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
   * Clears the user session on the server and local state.
   */
  const logout = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); 

      await authApi.logout({ signal: controller.signal });

      clearTimeout(timeoutId);
    } catch (error: any) {
      console.warn('Server logout delayed or disconnected. Proceeding with local redirect:', error?.message);
    } finally {
      user.value = null;
      isSessionChecked.value = true;
      isLoading.value = false;

      router.replace({ name: 'Login' });
    }
  };

  return { 
    user,
    isAuthenticated,
    isLoading, 
    isSessionChecked,
    errorMessage, 
    validationErrors,
    clearError,
    fetchUser,
    login, 
    logout 
  };
});