import { defineStore } from 'pinia';
import { ref } from 'vue';
import { shiftApi } from '../api/shiftApi';
import type { 
  MasterShift, 
  CashierShift, 
  ForceClosePayload 
} from '../types/shift';

export const useShiftStore = defineStore('shift', () => {
  const shiftHistory = ref<CashierShift[]>([]);
  const masterShifts = ref<MasterShift[]>([]);
  const activeMasterShifts = ref<MasterShift[]>([]);

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
    } else if (status === 403 || status === 404 || status === 409) {
      errorMessage.value = error.response?.data?.message || defaultMessage;
      validationErrors.value = {}; 
    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage.value = 'Slow network connection. Please check your internet and try again.';
    } else {
      errorMessage.value = error.response?.data?.message || defaultMessage;
    }
  };

  const fetchCashierShifts = async (params: Record<string, any> = {}): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const queryParams = { per_page: pagination.value.per_page, ...params };
      const response = await shiftApi.getCashierShifts(queryParams);
      
      const laravelResponse = response.data;
      shiftHistory.value = laravelResponse.data || [];
      
      pagination.value = {
        current_page: laravelResponse.meta?.current_page || 1,
        last_page: laravelResponse.meta?.last_page || 1,
        per_page: laravelResponse.meta?.per_page || 15,
        total: laravelResponse.meta?.total || 0
      };

      return true;
    } catch (error: any) {
      handleError(error, 'Failed to fetch cashier shifts history.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const forceCloseShift = async (id: number, payload: ForceClosePayload): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {};

    try {
      await shiftApi.forceCloseShift(id, payload);
      await fetchCashierShifts({ page: pagination.value.current_page });
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to force close shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchMasterShifts = async (): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await shiftApi.getShifts();
      const payload = response.data?.data ?? response.data;

      masterShifts.value = Array.isArray(payload) ? payload : [];

      return true;
    } catch (error: any) {
      handleError(error, 'Failed to fetch master shifts.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchActiveMasterShifts = async (): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const response = await shiftApi.getActiveShifts();
      activeMasterShifts.value = response.data?.data || response.data || [];
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to fetch active master shifts.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const createMasterShift = async (payload: Partial<MasterShift>): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {};

    try {
      await shiftApi.createShift(payload);
      await fetchMasterShifts();
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to create master shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const updateMasterShift = async (id: number, payload: Partial<MasterShift>): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;
    validationErrors.value = {};

    try {
      await shiftApi.updateShift(id, payload);
      await fetchMasterShifts();
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to update master shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteMasterShift = async (id: number): Promise<boolean> => {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      await shiftApi.deleteShift(id);
      await fetchMasterShifts();
      return true;
    } catch (error: any) {
      handleError(error, 'Failed to delete master shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    shiftHistory,
    masterShifts,
    activeMasterShifts,
    pagination,
    isLoading,
    errorMessage,
    validationErrors,
    clearError,
    fetchCashierShifts,
    forceCloseShift,
    fetchMasterShifts,
    fetchActiveMasterShifts,
    createMasterShift,
    updateMasterShift,
    deleteMasterShift
  };
});