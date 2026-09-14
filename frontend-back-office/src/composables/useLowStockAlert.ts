import { ref, onMounted, onUnmounted, readonly } from 'vue';
import api from '@/api/axios';

interface UseLowStockAlertOptions {
  /** Polling interval in ms. Default: 60_000 (60 seconds). */
  pollInterval?: number;
  /** Auto-start polling on mount. Default: true. */
  immediate?: boolean;
}

/**
 * Composable to monitor the count of low-stock materials.
 * Automatically polls and cleans up on unmount.
 *
 * Uses a direct API call (not the shared materialStore) to avoid
 * interfering with pagination state on the Material page.
 *
 * @example
 * ```vue
 * const { count } = useLowStockAlert();
 * ```
 */
export function useLowStockAlert(options: UseLowStockAlertOptions = {}) {
  const { pollInterval = 60_000, immediate = true } = options;

  const count = ref<number>(0);
  const isRefreshing = ref<boolean>(false);
  const lastRefreshedAt = ref<Date | null>(null);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Refresh the low-stock count via direct API call.
   * Safe to call manually, e.g., after creating a movement.
   */
  const refresh = async (): Promise<void> => {
    if (isRefreshing.value) return;

    isRefreshing.value = true;
    try {
      const response = await api.get('/backoffice/inventory/materials', {
        params: {
          is_low_stock: true,
          is_active: true,
          per_page: 1,
          page: 1,
        },
      });
      count.value = response.data.meta?.total ?? 0;
      lastRefreshedAt.value = new Date();
    } catch {
      // Silent fail — badge won't show on error, no crash
    } finally {
      isRefreshing.value = false;
    }
  };

  const startPolling = (): void => {
    if (intervalId) return;
    refresh();
    intervalId = setInterval(refresh, pollInterval);
  };

  const stopPolling = (): void => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  onMounted(() => {
    if (immediate) startPolling();
  });

  onUnmounted(() => {
    stopPolling();
  });

  return {
    count: readonly(count),
    isRefreshing: readonly(isRefreshing),
    lastRefreshedAt: readonly(lastRefreshedAt),
    refresh,
    startPolling,
    stopPolling,
  };
}