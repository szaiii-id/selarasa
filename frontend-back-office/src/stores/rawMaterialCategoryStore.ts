import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryApi } from '../api/inventoryApi';
import type {
  RawMaterialCategory,
  RawMaterialCategoryPayload,
  RawMaterialCategoryFilters,
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

export const useRawMaterialCategoryStore = defineStore('rawMaterialCategory', () => {
  // ==========================================
  // STATE
  // ==========================================
  const categories = ref<RawMaterialCategory[]>([]);
  const allCategories = ref<RawMaterialCategory[]>([]);
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

  const fetchCategories = async (
    filters: RawMaterialCategoryFilters = {}
  ): Promise<void> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.getCategories(filters);

      if (filters.all === 'true') {
        allCategories.value = response.data.data;
      } else {
        categories.value = response.data.data;
        if (response.data.meta) {
          pagination.value = {
            current_page: response.data.meta.current_page,
            last_page: response.data.meta.last_page,
            per_page: response.data.meta.per_page,
            total: response.data.meta.total,
          };
        }
      }
    } catch (error: any) {
      errorMessage.value =
        error.response?.data?.message || 'Failed to fetch categories.';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchCategoryById = async (
    id: number
  ): Promise<RawMaterialCategory | null> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.getCategoryById(id);
      return response.data.data;
    } catch (error: any) {
      errorMessage.value =
        error.response?.data?.message || 'Failed to fetch category details.';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const createCategory = async (
    payload: RawMaterialCategoryPayload
  ): Promise<RawMaterialCategory | null> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.createCategory(payload);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 422) {
        validationErrors.value = error.response.data.errors;
      } else {
        errorMessage.value =
          error.response?.data?.message || 'Failed to create category.';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const updateCategory = async (
    id: number,
    payload: RawMaterialCategoryPayload
  ): Promise<boolean> => {
    isLoading.value = true;
    clearErrors();

    try {
      await inventoryApi.updateCategory(id, payload);
      return true;
    } catch (error: any) {
      if (error.response?.status === 422) {
        validationErrors.value = error.response.data.errors;
      } else {
        errorMessage.value =
          error.response?.data?.message || 'Failed to update category.';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteCategory = async (id: number): Promise<boolean> => {
    isLoading.value = true;
    clearErrors();

    try {
      await inventoryApi.deleteCategory(id);
      return true;
    } catch (error: any) {
      errorMessage.value =
        error.response?.data?.message ||
        'Failed to delete category. It might be in use.';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    categories,
    allCategories,
    isLoading,
    errorMessage,
    validationErrors,
    pagination,
    // Actions
    clearErrors,
    fetchCategories,
    fetchCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
  };
});