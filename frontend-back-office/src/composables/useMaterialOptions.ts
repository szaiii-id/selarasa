import { computed, ref } from 'vue';
import { useRawMaterialStore } from '@/stores/rawMaterialStore';
import type { RawMaterialFilters } from '@/types/inventory';

export interface MaterialOption {
  value: number;
  label: string;
  sku: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  isLowStock: boolean;
  isActive: boolean;
}

interface UseMaterialOptionsConfig {
  /** Additional filters (optional). Default: only active materials. */
  filters?: Partial<RawMaterialFilters>;
  /** Items per fetch. Default: 100 (enough for dropdown). */
  perPage?: number;
}

/**
 * Composable to load material options for dropdowns.
 *
 * Features:
 * - Auto-cache per instance: fetches only once unless forced
 * - Filter by category: usable for dependent dropdowns
 * - Helper `findById()`: find option by ID
 *
 * @example
 * ```vue
 * const { options, isLoading, load } = useMaterialOptions();
 * onMounted(() => load());
 * ```
 */
export function useMaterialOptions(config: UseMaterialOptionsConfig = {}) {
  const {
    filters: extraFilters = {},
    perPage = 100,
  } = config;

  const store = useRawMaterialStore();

  const isLoading = ref<boolean>(false);
  const localError = ref<string | null>(null);
  const hasFetched = ref<boolean>(false);

  const materialOptions = computed<MaterialOption[]>(() =>
    store.materials.map((mat): MaterialOption => ({
      value: mat.id,
      label: mat.name,
      sku: mat.sku,
      unit: mat.unit,
      currentStock: Number(mat.current_stock),
      minimumStock: Number(mat.minimum_stock),
      isLowStock: mat.is_low_stock,
      isActive: mat.is_active,
    }))
  );

  /**
   * Load materials from server.
   * @param force - Force refetch even if cache exists
   */
  const load = async (force = false): Promise<void> => {
    if (hasFetched.value && !force) return;

    isLoading.value = true;
    localError.value = null;
    try {
      await store.fetchMaterials({
        is_active: true,
        ...extraFilters,
        per_page: perPage,
        page: 1,
      });
      hasFetched.value = true;
    } catch (error: any) {
      localError.value =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load materials.';
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Invalidate cache — call after create/update/delete material.
   */
  const invalidate = (): void => {
    hasFetched.value = false;
  };

  /**
   * Find option by ID. Useful for pre-select during edit.
   */
  const findById = (id: number): MaterialOption | undefined => {
    return materialOptions.value.find((opt) => opt.value === id);
  };

  return {
    options: materialOptions,
    isLoading,
    error: localError,
    load,
    invalidate,
    findById,
  };
}