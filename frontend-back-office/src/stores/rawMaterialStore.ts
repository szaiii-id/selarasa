import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventoryApi } from '../api/inventoryApi';
import type {
  RawMaterial,
  RawMaterialPayload,
  RawMaterialFilters,
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

export const useRawMaterialStore = defineStore('rawMaterial', () => {
  // ==========================================
  // STATE
  // ==========================================
  const materials = ref<RawMaterial[]>([]);
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

  const fetchMaterials = async (
    filters: RawMaterialFilters = {}
  ): Promise<void> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.getMaterials(filters);
      materials.value = response.data.data;

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
        error.response?.data?.message || 'Failed to fetch raw materials.';
    } finally {
      isLoading.value = false;
    }
  };

  const fetchMaterialById = async (
    id: number
  ): Promise<RawMaterial | null> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.getMaterialById(id);
      return response.data.data;
    } catch (error: any) {
      errorMessage.value =
        error.response?.data?.message ||
        'Failed to fetch raw material details.';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const createMaterial = async (
    payload: RawMaterialPayload
  ): Promise<RawMaterial | null> => {
    isLoading.value = true;
    clearErrors();

    try {
      const response = await inventoryApi.createMaterial(payload);
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 422) {
        validationErrors.value = error.response.data.errors;
      } else {
        errorMessage.value =
          error.response?.data?.message || 'Failed to create raw material.';
      }
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const updateMaterial = async (
    id: number,
    payload: RawMaterialPayload
  ): Promise<boolean> => {
    isLoading.value = true;
    clearErrors();

    try {
      await inventoryApi.updateMaterial(id, payload);
      return true;
    } catch (error: any) {
      if (error.response?.status === 422) {
        validationErrors.value = error.response.data.errors;
      } else {
        errorMessage.value =
          error.response?.data?.message || 'Failed to update raw material.';
      }
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // State
    materials,
    isLoading,
    errorMessage,
    validationErrors,
    pagination,
    // Actions
    clearErrors,
    fetchMaterials,
    fetchMaterialById,
    createMaterial,
    updateMaterial,
  };
});