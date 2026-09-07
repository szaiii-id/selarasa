import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { shiftApi } from '../api/shiftApi';
import { useNow } from '@vueuse/core';
import type { 
  CashierShift, 
  MasterShift, 
  StartShiftPayload, 
  CloseShiftPayload, 
  HandoverShiftPayload, 
  User
} from '../types/shift';
import { useAuthStore } from './authStore';

export const useShiftStore = defineStore('shift', () => {
  const currentShift = ref<CashierShift | null>(null);
  const masterShifts = ref<MasterShift[]>([]);
  const activeCashiers = ref<User[]>([]);
  
  const isLoading = ref<boolean>(false);
  const isCheckingSession = ref<boolean>(true);
  const errorMessage = ref<string | null>(null);
  const validationErrors = ref<Record<string, string[]>>({});

  const serverTimeOffset = ref<number>(0);
  const localNow = useNow({ interval: 1000 });
  
  const currentTime = computed(() => {
    return new Date(localNow.value.getTime() + serverTimeOffset.value);
  });

  const activeMasterShift = computed(() => {
    if (!currentShift.value) return null;
    return masterShifts.value.find(s => s.id === currentShift.value?.shift_id) 
           || currentShift.value?.shift; 
  });

  const shiftEndDate = computed(() => {
    const endTime = activeMasterShift.value?.end_time;
    const startTime = activeMasterShift.value?.start_time;
    if (!endTime || !startTime) return null;
    
    const [hours, minutes, seconds] = endTime.split(':');
    const date = new Date(currentTime.value.getTime());
    date.setHours(Number(hours), Number(minutes), Number(seconds || 0), 0);
    
    if (endTime <= startTime) {
      const nowTimeStr = currentTime.value.toTimeString().split(' ')[0] || '00:00:00';
      if (nowTimeStr >= startTime) {
        date.setDate(date.getDate() + 1);
      }
    }
    return date;
  });

  const remainingMinutes = computed(() => {
    if (!shiftEndDate.value) return 0;
    const diffMs = shiftEndDate.value.getTime() - currentTime.value.getTime();
    return Math.ceil(diffMs / (1000 * 60)); 
  });

  const isFinishingOvertimeTransaction = ref<boolean>(false);
  const hasUsedGracePeriod = ref<boolean>(false); 

  const shiftStatus = computed<'safe' | 'warning' | 'grace_period' | 'overtime'>(() => {
    if (masterShifts.value.length === 0 && !activeMasterShift.value) return 'safe'; 

    if (isFinishingOvertimeTransaction.value) return 'grace_period';
    if (!shiftEndDate.value || remainingMinutes.value <= 0) return 'overtime';
    if (remainingMinutes.value <= 15) return 'warning';
    
    return 'safe';
  });

  const timeRemainingText = computed(() => {
    if (shiftStatus.value === 'overtime') return 'Shift Ended';
    if (shiftStatus.value === 'grace_period') return 'Grace Period';
    
    if (remainingMinutes.value > 60) {
      const hrs = Math.floor(remainingMinutes.value / 60);
      const mins = remainingMinutes.value % 60;
      return `${hrs}h ${mins}m left`;
    }
    return `${remainingMinutes.value}m left`;
  });

  /**
   * Centralized API error handler to maintain DRY principle.
   */
  const handleApiError = (error: unknown, defaultMessage: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosError = error as { response?: { status?: number, data?: { errors?: Record<string, string[]>, message?: string } } };
      if (axiosError.response?.status === 422) {
        validationErrors.value = axiosError.response.data?.errors || {};
      } else {
        errorMessage.value = axiosError.response?.data?.message || defaultMessage;
      }
    } else {
      errorMessage.value = defaultMessage; 
    }
  };

  const clearErrors = () => {
    errorMessage.value = null;
    validationErrors.value = {};
  };

const fetchCurrentShift = async (): Promise<boolean> => {
  isCheckingSession.value = true;
  clearErrors();
  
  const hasActiveShiftPreviously = currentShift.value !== null;
  
  try {
    const response = await shiftApi.getCurrentPosShift();
    currentShift.value = response.data.data;
    return true;
  } catch (error: any) {
    currentShift.value = null;
    
    if (error.response?.status === 404) {
      if (hasActiveShiftPreviously) {
        const authStore = useAuthStore();
        alert('System Alert: Your shift has been force-closed by Management. You will be logged out securely.');
        await authStore.logout();
      }
    } else {
      handleApiError(error, 'Failed to verify active shift session.');
    }
    
    return false;
  } finally {
    isCheckingSession.value = false;
  }
};

  const fetchMasterShifts = async (): Promise<boolean> => {
    try {
      const response = await shiftApi.getActiveMasterShifts();
      masterShifts.value = response.data.data;
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to fetch master shifts.');
      return false;
    }
  };

  const fetchActiveCashiers = async (): Promise<boolean> => {
    try {
      const response = await shiftApi.getActiveCashiers();
      activeCashiers.value = response.data.data;
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to fetch active cashiers.');
      return false;
    }
  };

  const startShift = async (payload: StartShiftPayload): Promise<boolean> => {
    isLoading.value = true;
    clearErrors();
    try {
      const response = await shiftApi.startPosShift(payload);
      currentShift.value = response.data.data;
      hasUsedGracePeriod.value = false; 
      isFinishingOvertimeTransaction.value = false;
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to start shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const closeShift = async (payload: CloseShiftPayload): Promise<boolean> => {
    if (!currentShift.value) return false;
    isLoading.value = true;
    clearErrors();
    try {
      await shiftApi.closePosShift(currentShift.value.id, payload);
      currentShift.value = null;
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to close shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const handoverShift = async (payload: HandoverShiftPayload): Promise<boolean> => {
    if (!currentShift.value) return false;
    isLoading.value = true;
    clearErrors();
    try {
      const response = await shiftApi.handoverPosShift(currentShift.value.id, payload);
      currentShift.value = response.data.data;
      hasUsedGracePeriod.value = false; 
      isFinishingOvertimeTransaction.value = false;
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to handover shift.');
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const endShift = async (): Promise<boolean> => {
    isLoading.value = true;
    try {
      currentShift.value = null;
      return true;
    } catch (error) {
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    currentShift,
    masterShifts,
    activeCashiers,
    isLoading,
    isCheckingSession,
    errorMessage,
    validationErrors,
    activeMasterShift,
    remainingMinutes,
    shiftStatus,
    timeRemainingText,
    isFinishingOvertimeTransaction,
    hasUsedGracePeriod,
    clearErrors,
    fetchCurrentShift,
    fetchMasterShifts,
    fetchActiveCashiers,
    startShift,
    closeShift,
    handoverShift,
    endShift,
  };
});