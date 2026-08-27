import { defineStore } from 'pinia';
import { ref } from 'vue';
import { userApi } from '../api/userApi';
import type { User, UserFilters, UserPayload } from '../types/user';

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([]);
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0
  });

  const isLoading = ref<boolean>(false);
  const errorMessage = ref<string | null>(null);
  const validationErrors = ref<Record<string, string[]>>({});

  const clearError = (field: string) => {
    if (validationErrors.value[field]) {
      const updatedErrors = { ...validationErrors.value };
      delete updatedErrors[field];
      validationErrors.value = updatedErrors;
    }
    errorMessage.value = null;
  };

  const handleError = (error: any, defaultMessage: string) => {
    const status = error.response?.status;

    if (status === 422) {
      validationErrors.value = error.response.data.errors || {};
      errorMessage.value = null; 
    } else if (status === 403 || status === 409) {
      errorMessage.value = error.response?.data?.message || defaultMessage;
      validationErrors.value = {}; 
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage.value = 'Slow network connection. Please check your internet and try again.';
    } else {
      errorMessage.value = error.response?.data?.message || defaultMessage;
    }
  };

  const fetchUsers = async (params: UserFilters = {}): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const queryParams = { per_page: pagination.value.per_page, ...params };
      const response = await userApi.getUsers(queryParams);
      
      const laravelResponse = response.data;
      
      users.value = laravelResponse.data || [];
      
      pagination.value = {
        current_page: laravelResponse.meta?.current_page || 1,
        last_page: laravelResponse.meta?.last_page || 1,
        per_page: laravelResponse.meta?.per_page || 15,
        total: laravelResponse.meta?.total || 0
      };

      return true;
    } catch (error: any) {
      handleError(error, 'Failed to fetch users data.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUserById = async (id: string): Promise<User | null> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await userApi.getUserById(id); 
      
      return response.data?.data || response.data;
    } catch (error: any) {
      handleError(error, 'Failed to fetch user details.');
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const createUser = async (payload: UserPayload): Promise<any | boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {};

    try {
      const response = await userApi.createUser(payload); 
      
      await fetchUsers({ page: 1 });
      
      return response.data?.data || response.data || true; 
    } catch (error: any) {
      handleError(error, 'Failed to create user.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const updateUser = async (id: string, payload: Partial<UserPayload>): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {};

    try {
      await userApi.updateUser(id, payload);
      await fetchUsers({ page: pagination.value.current_page });
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to update user.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const deactivateUser = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      await userApi.deactivateUser(id);
      await fetchUsers({ page: pagination.value.current_page });
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to deactivate user.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const activateUser = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      await userApi.activateUser(id);
      await fetchUsers({ page: pagination.value.current_page });
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to activate user.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteUser = async (id: string): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      await userApi.deleteUser(id);
      await fetchUsers({ page: pagination.value.current_page });
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to delete user.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    users,
    pagination,
    isLoading,
    errorMessage,
    validationErrors,
    clearError,
    fetchUsers,
    fetchUserById,
    createUser,
    updateUser,
    deactivateUser,
    activateUser,
    deleteUser
  };
});