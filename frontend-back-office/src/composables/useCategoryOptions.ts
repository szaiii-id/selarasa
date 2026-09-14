// src/composables/useCategoryOptions.ts
import { computed, ref } from 'vue';
import { useRawMaterialCategoryStore } from '@/stores/rawMaterialCategoryStore';

export interface CategoryOption {
  value: number;
  label: string;
}

/**
 * Module-level cache — shared across all instances of this composable.
 * Set true setelah fetch pertama sukses.
 */
let hasFetchedOnce = false;

/**
 * Composable untuk load category options untuk dropdown.
 *
 * Fitur:
 * - Auto-cache: fetch hanya sekali, panggilan berikutnya instant
 * - Force refresh: `load(true)` untuk paksa fetch ulang
 * - Invalidate: panggil `invalidate()` setelah create/update/delete kategori
 *
 * @example
 * ```vue
 * const { options, isLoading, load, invalidate } = useCategoryOptions();
 * onMounted(() => load());
 * ```
 */
export function useCategoryOptions() {
  const store = useRawMaterialCategoryStore();

  const isLoading = ref<boolean>(false);
  const localError = ref<string | null>(null);

  const options = computed<CategoryOption[]>(() =>
    store.allCategories.map((cat) => ({
      value: cat.id,
      label: cat.name,
    }))
  );

  /**
   * Load kategori dari server.
   * @param force - Paksa fetch ulang meski cache sudah ada
   */
  const load = async (force = false): Promise<void> => {
    if (hasFetchedOnce && !force) return;

    isLoading.value = true;
    localError.value = null;
    try {
      await store.fetchCategories({ all: 'true' });
      hasFetchedOnce = true;
    } catch (error: any) {
      localError.value =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load categories.';
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Invalidate cache — panggil setelah create/update/delete kategori,
   * supaya dropdown fetch data terbaru di panggilan berikutnya.
   */
  const invalidate = (): void => {
    hasFetchedOnce = false;
  };

  return {
    options,
    isLoading,
    error: localError,
    load,
    invalidate,
  };
}