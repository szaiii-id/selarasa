import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryApi } from '../api/inventoryApi';
import type {
  StockMovement,
  StockMovementPayload,
  StockMovementFilters,
} from '../types/inventory';

/**
 * Pagination metadata shape (dipakai internal).
 */
interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const useStockMovementStore = defineStore('stockMovement', () => {
  // ==========================================
  // STATE
  // ==========================================
  const movements = ref<StockMovement[]>([]);
  const isLoading = ref<boolean>(false);

  const errorMessage = ref<string | null>(null);
  const validationErrors = ref<Record<string, string[]>>({});

  const pagination = ref<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // ==========================================
  // HELPERS
  // ==========================================
  const clearErrors = (): void => {
    errorMessage.value = null;
    validationErrors.value = {};
  };

  // ==========================================
  // ACTIONS
  // ==========================================

  const fetchMovements = async (
    filters: StockMovementFilters = {}
  ): Promise<void> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.getMovements(filters);
      movements.value = response.data.data;

      if (response.data.meta) {
        pagination.value = {
          current_page: response.data.meta.current_page,
          last_page: response.data.meta.last_page,
          per_page: response.data.meta.per_page,
          total: response.data.meta.total,
        };
      }
    } catch (error: any) {
      errorMessage.value =
        error.response?.data?.message || 'Failed to fetch stock movements.';
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Records a new stock movement.
   * Note: Update and Delete actions are omitted strictly by design (Audit Trail).
   */
  const createMovement = async (
    payload: StockMovementPayload
  ): Promise<boolean> => {
    isLoading.value = true;
    clearErrors();

    try {
      await inventoryApi.createMovement(payload);
      return true;
    } catch (error: any) {
      if (error.response?.status === 422) {
        validationErrors.value = error.response.data.errors;
      } else {
        errorMessage.value =
          error.response?.data?.message || 'Failed to record stock movement.';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    movements,
    isLoading,
    errorMessage,
    validationErrors,
    pagination,
    // Actions
    clearErrors,
    fetchMovements,
    createMovement,
  };
});