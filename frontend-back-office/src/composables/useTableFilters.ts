// src/composables/useTableFilters.ts
import { reactive, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

/**
 * Composable to manage table filters with URL sync and debounced fetching.
 *
 * Features:
 * - Reactive filters state (deep cloned from defaultFilters + hydrated from URL)
 * - Auto-sync to URL query string (skip values equal to default)
 * - Restore from URL on mount (persistent filters)
 * - Debounced apply (300ms) for text inputs
 * - Immediate apply for pagination
 * - Reset to default with URL sync
 *
 * @param defaultFilters - Initial filter values (also used as reset baseline)
 * @param fetchCallback - Function called when filters change (after debounce)
 */
export function useTableFilters<T extends Record<string, any>>(
  defaultFilters: T,
  fetchCallback: () => void
) {
  const router = useRouter();
  const route = useRoute();

  // Deep clone defaultFilters to avoid mutating the input
  const defaultSnapshot: T = JSON.parse(JSON.stringify(defaultFilters));

  // ==========================================
  // HYDRATE FROM URL
  // ==========================================

  /**
   * Restore filter state from URL query.
   * Type conversion is inferred from the default value's type:
   * - boolean default → parse 'true'/'false'
   * - number  default → parse Number
   * - string  default → keep as-is
   */
  const hydrateFromUrl = (): T => {
    const hydrated = JSON.parse(JSON.stringify(defaultSnapshot)) as T;

    for (const key in hydrated) {
      const rawValue = route.query[key];

      // Skip if URL doesn't have this key
      if (rawValue === undefined || rawValue === null || rawValue === '') continue;

      // Query values can be string | string[] | null
      const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      if (value === undefined) continue;

      const defaultValue = (defaultSnapshot as Record<string, any>)[key];

      if (typeof defaultValue === 'boolean') {
        // Only 'true' / 'false' are valid booleans
        if (value === 'true') (hydrated as Record<string, any>)[key] = true;
        else if (value === 'false') (hydrated as Record<string, any>)[key] = false;
        // else: keep default
      } else if (typeof defaultValue === 'number') {
        const parsed = Number(value);
        if (!isNaN(parsed)) (hydrated as Record<string, any>)[key] = parsed;
      } else {
        // string (or fallback)
        (hydrated as Record<string, any>)[key] = String(value);
      }
    }

    return hydrated;
  };

  const filtersState = reactive<T>(hydrateFromUrl());

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  // ==========================================
  // URL SYNC
  // ==========================================

  /**
   * Sync current filters to URL query string.
   *
   * Rules:
   * - Skip values that equal their default (no need to pollute URL)
   * - Skip null/undefined/empty string
   * - Keep `false` (important for boolean filters like `is_active=false`)
   * - Keep `0` (important for numeric filters)
   * - Keep `page` value if > 1
   */
  const syncToUrl = (): void => {
    const query: Record<string, string> = {};

    for (const key in filtersState) {
      const value = (filtersState as Record<string, any>)[key];
      const defaultValue = (defaultSnapshot as Record<string, any>)[key];

      // Skip if value equals default → no need to sync
      if (value === defaultValue) continue;

      // Skip null/undefined/empty string
      if (value === '' || value === null || value === undefined) continue;

      query[key] = String(value);
    }

    router.replace({ query }).catch(() => {
      // Silent catch — router may fail during navigation guards
    });
  };

  // ==========================================
  // APPLY / FETCH
  // ==========================================

  /**
   * Debounced apply filters.
   * Text inputs (search, etc.) use this to avoid spam fetching.
   * Reset page to 1 (new filter → start from first page).
   */
  const applyFilters = (): void => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // Reset to page 1 (new filter means new result set)
      if ('page' in filtersState) {
        (filtersState as Record<string, any>).page = 1;
      }

      syncToUrl();
      fetchCallback();
    }, 300);
  };

  /**
   * Change page (immediate, no debounce).
   * Used by pagination controls.
   */
  const changePage = (newPage: number): void => {
    if (!('page' in filtersState)) return;

    (filtersState as Record<string, any>).page = newPage;
    syncToUrl();
    fetchCallback();
  };

  // ==========================================
  // RESET
  // ==========================================

  /**
   * Reset all filters to their default values.
   *
   * @param silent - If true, skip URL sync & fetch (caller handles it manually)
   */
  const resetFilters = (silent = false): void => {
    const fresh = JSON.parse(JSON.stringify(defaultSnapshot));
    Object.assign(filtersState, fresh);

    if (!silent) {
      syncToUrl();
      fetchCallback();
    }
  };

  // ==========================================
  // CLEANUP
  // ==========================================

  onUnmounted(() => {
    clearTimeout(debounceTimer);
  });

  return {
    filters: filtersState,
    applyFilters,
    changePage,
    syncToUrl,
    resetFilters,
  };
}