import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useCategoryOptions } from '../useCategoryOptions';
import { useRawMaterialCategoryStore } from '@/stores/rawMaterialCategoryStore';

// ============================================================
// 1. MOCK STORE
// ============================================================
// Kita mock store karena kita HANYA menguji logic composable:
// - cache (hasFetchedOnce)
// - force refresh
// - invalidate
// - mapping allCategories → options
// - error handling
vi.mock('@/stores/rawMaterialCategoryStore', () => ({
  useRawMaterialCategoryStore: vi.fn(),
}));

describe('useCategoryOptions Composable (Function-Level Unit Testing)', () => {
  // ==========================================================
  // SHARED MOCKS
  // ==========================================================
  const mockFetchCategories = vi.fn();

  // ⚠️ PENTING: `allCategories` HARUS berupa ref (atau getter yang membaca ref)
  // supaya `computed` di composable benar-benar reaktif terhadap perubahan.
  // Kalau pakai plain array + reassign, computed tidak akan re-evaluate.
  const allCategoriesRef = ref<Array<{ id: number; name: string }>>([]);

  const storeMock = {
    get allCategories() {
      return allCategoriesRef.value;
    },
    fetchCategories: mockFetchCategories,
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Reset store state tiap test
    allCategoriesRef.value = [];

    vi.mocked(useRawMaterialCategoryStore).mockReturnValue(storeMock as any);

    // ⚠️ PENTING: `hasFetchedOnce` adalah module-level variable di composable.
    // Ia bertahan antar test dalam file yang sama. Kita reset dengan
    // memanggil `invalidate()` lewat instance composable baru.
    const { invalidate } = useCategoryOptions();
    invalidate();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] load() memanggil fetchCategories dengan { all: "true" } saat cache kosong', async () => {
      mockFetchCategories.mockResolvedValueOnce(undefined);

      const { load, isLoading } = useCategoryOptions();

      expect(isLoading.value).toBe(false);

      const promise = load();
      // Setelah load() dipanggil (sync bagian awal), isLoading true
      expect(isLoading.value).toBe(true);

      await promise;
      expect(isLoading.value).toBe(false);

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
      expect(mockFetchCategories).toHaveBeenCalledWith({ all: 'true' });
    });

    it('[Happy Path] options adalah computed yang memetakan allCategories → { value, label }', () => {
      allCategoriesRef.value = [
        { id: 1, name: 'Bahan Kering' },
        { id: 2, name: 'Bahan Basah' },
      ];

      const { options } = useCategoryOptions();

      expect(options.value).toEqual([
        { value: 1, label: 'Bahan Kering' },
        { value: 2, label: 'Bahan Basah' },
      ]);
    });

    it('[Happy Path] options reaktif terhadap perubahan allCategories di store', () => {
      const { options } = useCategoryOptions();
      expect(options.value).toEqual([]);

      // Reassign ref.value → computed otomatis re-evaluate
      allCategoriesRef.value = [{ id: 5, name: 'Baru' }];

      expect(options.value).toEqual([{ value: 5, label: 'Baru' }]);
    });

    it('[Negative Path] load() mengisi localError saat fetch gagal (dengan response.data.message)', async () => {
      mockFetchCategories.mockRejectedValueOnce({
        response: { data: { message: 'Server Error' } },
      });

      const { load, error, isLoading } = useCategoryOptions();

      await load();

      expect(error.value).toBe('Server Error');
      expect(isLoading.value).toBe(false);
    });

    it('[Negative Path] load() fallback ke error.message jika response.data.message tidak ada', async () => {
      mockFetchCategories.mockRejectedValueOnce(new Error('Network down'));

      const { load, error } = useCategoryOptions();

      await load();

      expect(error.value).toBe('Network down');
    });

    it('[Negative Path] load() fallback ke default message jika error benar-benar kosong', async () => {
      mockFetchCategories.mockRejectedValueOnce({});

      const { load, error } = useCategoryOptions();

      await load();

      expect(error.value).toBe('Failed to load categories.');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Cache Kosong] load() pertama kali akan fetch', async () => {
      mockFetchCategories.mockResolvedValueOnce(undefined);

      const { load } = useCategoryOptions();
      await load();

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });

    it('[Partisi 2 - Cache Terisi] load() kedua kali TIDAK fetch (cache hit)', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const { load } = useCategoryOptions();
      await load(); // fetch pertama
      await load(); // harus skip karena cache
      await load(); // skip lagi

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });

    it('[Partisi 3 - Force Refresh] load(true) tetap fetch meski cache terisi', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const { load } = useCategoryOptions();
      await load();               // fetch #1
      await load(true);           // force → fetch #2
      await load(true);           // force → fetch #3
      await load();               // cache hit → skip

      expect(mockFetchCategories).toHaveBeenCalledTimes(3);
    });

    it('[Partisi 4 - Setelah Invalidate] load() setelah invalidate() akan fetch ulang', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const { load, invalidate } = useCategoryOptions();
      await load();               // fetch #1
      await load();               // skip

      invalidate();               // reset cache
      await load();               // fetch #2

      expect(mockFetchCategories).toHaveBeenCalledTimes(2);
    });

    it('[Partisi 5 - Error Tidak Mengisi Cache] setelah error, load() berikutnya tetap fetch', async () => {
      mockFetchCategories.mockRejectedValueOnce(new Error('Fail'));

      const { load } = useCategoryOptions();
      await load();               // error → hasFetchedOnce tetap false

      mockFetchCategories.mockResolvedValueOnce(undefined);
      await load();               // harus fetch lagi

      expect(mockFetchCategories).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Cache Flag] load() dipanggil 10x berturut-turut hanya fetch 1x', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const { load } = useCategoryOptions();

      for (let i = 0; i < 10; i++) {
        await load();
      }

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });

    it('[BVA - Force + Cache] load(true) lalu load() → force jalan, cache tetap terisi', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const { load } = useCategoryOptions();
      await load(true);           // force → fetch #1 (cache jadi true)
      await load();               // cache hit → skip

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });

    it('[BVA - Multiple Invalidate] invalidate() 3x berturut-turut tetap aman (idempotent)', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const { load, invalidate } = useCategoryOptions();
      await load();               // fetch #1

      invalidate();
      invalidate();
      invalidate();

      await load();               // fetch #2

      expect(mockFetchCategories).toHaveBeenCalledTimes(2);
    });

    it('[BVA - Options Kosong] options mengembalikan array kosong jika allCategories kosong', () => {
      allCategoriesRef.value = [];

      const { options } = useCategoryOptions();
      expect(options.value).toEqual([]);
    });

    it('[BVA - Options Satu Elemen] options mengembalikan 1 elemen dengan mapping benar', () => {
      allCategoriesRef.value = [{ id: 42, name: 'Solo' }];

      const { options } = useCategoryOptions();
      expect(options.value).toEqual([{ value: 42, label: 'Solo' }]);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Shared Cache] Dua instance composable berbagi cache module-level', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const instance1 = useCategoryOptions();
      const instance2 = useCategoryOptions();

      await instance1.load();     // fetch #1
      await instance2.load();     // skip — cache dibagi antar instance

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });

    it('[Edge Case - Invalidate Lintas Instance] invalidate() dari satu instance mempengaruhi instance lain', async () => {
      mockFetchCategories.mockResolvedValue(undefined);

      const instance1 = useCategoryOptions();
      const instance2 = useCategoryOptions();

      await instance1.load();     // fetch #1
      await instance2.load();     // skip

      instance1.invalidate();     // reset cache global
      await instance2.load();     // fetch #2

      expect(mockFetchCategories).toHaveBeenCalledTimes(2);
    });

    it('[Edge Case - isLoading Reset] isLoading false meski fetch gagal', async () => {
      mockFetchCategories.mockRejectedValueOnce(new Error('Fail'));

      const { load, isLoading } = useCategoryOptions();
      await load();

      expect(isLoading.value).toBe(false);
    });

    it('[Edge Case - error Reset] error di-null-kan di awal setiap load()', async () => {
      mockFetchCategories.mockRejectedValueOnce(new Error('First Fail'));
      const { load, error } = useCategoryOptions();
      await load();
      expect(error.value).toBe('First Fail');

      mockFetchCategories.mockResolvedValueOnce(undefined);
      await load(true); // force agar benar-benar fetch
      expect(error.value).toBeNull();
    });

    it('[Corner Case - error Tanpa response] error.message dipakai sebagai fallback', async () => {
      mockFetchCategories.mockRejectedValueOnce(new Error('Native only'));

      const { load, error } = useCategoryOptions();
      await load();

      expect(error.value).toBe('Native only');
    });

    it('[Corner Case - error dengan response.data.message Kosong] fallback ke error.message', async () => {
      mockFetchCategories.mockRejectedValueOnce({
        response: { data: { message: '' } },
        message: 'Fallback message',
      });

      const { load, error } = useCategoryOptions();
      await load();

      // Karena '' falsy → jatuh ke error.message
      expect(error.value).toBe('Fallback message');
    });

    it('[Corner Case - error Object Kosong] fallback ke default hardcoded message', async () => {
      mockFetchCategories.mockRejectedValueOnce({});

      const { load, error } = useCategoryOptions();
      await load();

      expect(error.value).toBe('Failed to load categories.');
    });

    it('[Corner Case - Fetch Resolve dengan Data Kosong] options tetap []', async () => {
      mockFetchCategories.mockResolvedValueOnce(undefined);
      allCategoriesRef.value = [];

      const { load, options } = useCategoryOptions();
      await load();

      expect(options.value).toEqual([]);
    });

    it('[Corner Case - Concurrent load()] dua load() paralel sebelum cache terisi → fetch 2x (race condition by design)', async () => {
      // Karena hasFetchedOnce baru di-set SETELAH await, dua panggilan paralel
      // akan sama-sama lolos guard.
      let resolveFetch: () => void = () => {};
      const pending = new Promise<void>((res) => {
        resolveFetch = res;
      });
      mockFetchCategories.mockReturnValueOnce(pending);

      const { load } = useCategoryOptions();

      const p1 = load();          // belum cache
      const p2 = load();          // belum cache juga

      resolveFetch();
      await Promise.all([p1, p2]);

      // Ini adalah perilaku aktual: 2x fetch. Test ini mendokumentasikannya.
      expect(mockFetchCategories).toHaveBeenCalledTimes(2);
    });

    it('[Corner Case - Mapping allCategories] memetakan id → value dan name → label secara benar', () => {
      allCategoriesRef.value = [
        { id: 100, name: 'A' },
        { id: 200, name: 'B' },
        { id: 300, name: 'C' },
      ];

      const { options } = useCategoryOptions();

      expect(options.value).toEqual([
        { value: 100, label: 'A' },
        { value: 200, label: 'B' },
        { value: 300, label: 'C' },
      ]);
    });

    it('[Edge Case - Return Shape] composable mengembalikan { options, isLoading, error, load, invalidate }', () => {
      const result = useCategoryOptions();

      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('isLoading');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('load');
      expect(result).toHaveProperty('invalidate');
      expect(typeof result.load).toBe('function');
      expect(typeof result.invalidate).toBe('function');
    });

    it('[Edge Case - error bukan dari store.errorMessage] error local, bukan store global', async () => {
      mockFetchCategories.mockRejectedValueOnce(new Error('Local error'));

      const { load, error } = useCategoryOptions();
      await load();

      // `error` adalah localError ref, bukan store.errorMessage
      expect(error.value).toBe('Local error');
    });
  });
});