import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '../api/authApi';

export const useSessionStore = defineStore('session', () => {
  const isLocked = ref<boolean>(false);
  const isUnlocking = ref<boolean>(false);
  const unlockError = ref<boolean>(false);
  const unlockErrorMessage = ref<string>('');

  const isRateLimited = ref<boolean>(false);
  const rateLimitSeconds = ref<number>(0);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  const clearRateLimit = (): void => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    isRateLimited.value = false;
    rateLimitSeconds.value = 0;
    unlockError.value = false;
    unlockErrorMessage.value = '';
  };

  const lockScreen = (): void => {
    isLocked.value = true;
    isUnlocking.value = false;
    unlockError.value = false;
    unlockErrorMessage.value = '';
    clearRateLimit();
  };

  const startRateLimitTimer = (seconds: number) => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    isRateLimited.value = true;
    rateLimitSeconds.value = seconds;
    unlockError.value = true;
    isUnlocking.value = false;

    unlockErrorMessage.value = `Too many attempts. Please try again in ${rateLimitSeconds.value} seconds.`;

    countdownInterval = setInterval(() => {
      rateLimitSeconds.value--;

      if (rateLimitSeconds.value <= 0) {
        clearRateLimit();
      } else {
        unlockErrorMessage.value = `Too many attempts. Please try again in ${rateLimitSeconds.value} seconds.`;
      }
    }, 1000);
  };

  const unlockScreen = async (pinCode: string, isRetry: boolean = false): Promise<boolean> => {
    if (isRateLimited.value || isUnlocking.value) return false;

    isUnlocking.value = true;
    unlockError.value = false;
    unlockErrorMessage.value = '';

    try {
      await authApi.ensureCsrfCookie();

      const response = await authApi.verifyPin({ pin_code: pinCode });

      if (response.data && response.data.success === false) {
        unlockError.value = true;
        unlockErrorMessage.value = response.data.message || 'Incorrect PIN. Please try again.';
        isUnlocking.value = false;
        return false;
      }

      isLocked.value = false;
      isUnlocking.value = false;
      unlockError.value = false;
      unlockErrorMessage.value = '';
      return true;
    } catch (error: any) {
      const status = error.response?.status;

      if (status === 419 && !isRetry) {
        try {
          await authApi.refreshCsrfCookie();
          isUnlocking.value = false;
          return await unlockScreen(pinCode, true);
        } catch (retryError) {
          unlockError.value = true;
          unlockErrorMessage.value = 'Security session expired. Please try again.';
          isUnlocking.value = false;
          return false;
        }
      }

      unlockError.value = true;
      isUnlocking.value = false;

      if (status === 429) {
        const headerVal = error.response?.headers?.['retry-after'];
        const retryAfter = headerVal ? parseInt(headerVal, 10) : 60;
        startRateLimitTimer(isNaN(retryAfter) ? 60 : retryAfter);
      } else if (status >= 500) {
        unlockErrorMessage.value = error.userMessage || 'Server error. Please try again.';
      } else if (status === 400 && error.response?.data?.message) {
        unlockErrorMessage.value = error.response.data.message;
      } else if (status === 403) {
        unlockErrorMessage.value = error.response?.data?.message || 'Account is not active.';
      } else {
        unlockErrorMessage.value = 'System error occurred. Please try again.';
      }

      return false;
    }
  };

  return {
    isLocked,
    isUnlocking,
    unlockError,
    unlockErrorMessage,
    isRateLimited,
    rateLimitSeconds,
    lockScreen,
    unlockScreen,
    clearRateLimit
  };
}, {
  persist: {
    key: 'pos-session',
    storage: sessionStorage,
    pick: ['isLocked', 'isRateLimited', 'rateLimitSeconds']
  }
});