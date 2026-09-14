import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import type { Ref } from 'vue';
import { useMaterialOptions } from '../useMaterialOptions';
import { useRawMaterialStore } from '@/stores/rawMaterialStore';

// ============================================================
// 1. MOCK STORE
// ============================================================
vi.mock('@/stores/rawMaterialStore', () => ({
  useRawMaterialStore: vi.fn(),
}));

// ============================================================
// 2. TIPE UNTUK TEST DATA
// ============================================================
interface TestMaterial {
  id: number;
  name: string;
  sku: string;
  unit: string;
  current_stock: number | string | null | undefined;
  minimum_stock: number | string | null | undefined;
  is_low_stock: boolean;
  is_active: boolean;
}

describe('useMaterialOptions Composable (Function-Level Unit Testing)', () => {
  // ==========================================================
  // SHARED MOCKS
  // ==========================================================
  const mockFetchMaterials = vi.fn();

  // ⚠️ PENTING: Deklarasi di scope `describe`, TAPI inisialisasi FRESH
  // di `beforeEach` untuk mencegah Vue Dep "bocor" antar test.
  let materialsRef: Ref<TestMaterial[]>;
  let storeMock: {
    materials: TestMaterial[];
    fetchMaterials: typeof mockFetchMaterials;
  };

  /**
   * Factory untuk material test dengan tipe eksplisit.
   * Spread `...overrides` di akhir memastikan override menimpa default.
   */
  const createMaterial = (overrides: Partial<TestMaterial> = {}): TestMaterial => ({
    id: 1,
    name: 'Gula Pasir',
    sku: 'GUL-001',
    unit: 'kg',
    current_stock: 25,
    minimum_stock: 10,
    is_low_stock: false,
    is_active: true,
    ...overrides,
  });

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // ✅ Buat ref & store mock BARU setiap test
    materialsRef = ref<TestMaterial[]>([]);

    storeMock = {
      get materials() {
        return materialsRef.value;
      },
      fetchMaterials: mockFetchMaterials,
    };

    vi.mocked(useRawMaterialStore).mockReturnValue(storeMock as any);
  });

  // =========================================================================
  // 0. SANITY CHECK
  // =========================================================================
  describe('Sanity Check (Test Helper)', () => {
    it('[Sanity] createMaterial() dengan id besar TIDAK menimpa default', () => {
      const bigId = 2147483647;
      const mat = createMaterial({ id: bigId, name: 'Big' });

      expect(mat.id).toBe(bigId);
      expect(mat.id).not.toBe(1);
      expect(typeof mat.id).toBe('number');
      expect(mat.name).toBe('Big');
    });
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] load() memanggil fetchMaterials dengan filter default { is_active: true, per_page: 100, page: 1 }', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load, isLoading } = useMaterialOptions();

      expect(isLoading.value).toBe(false);

      const promise = load();
      expect(isLoading.value).toBe(true);

      await promise;
      expect(isLoading.value).toBe(false);

      expect(mockFetchMaterials).toHaveBeenCalledTimes(1);
      expect(mockFetchMaterials).toHaveBeenCalledWith({
        is_active: true,
        per_page: 100,
        page: 1,
      });
    });

    it('[Happy Path] options adalah computed yang memetakan store.materials → MaterialOption[]', () => {
      materialsRef.value = [
        createMaterial({ id: 1, name: 'Gula Pasir', sku: 'GUL-001' }),
        createMaterial({ id: 2, name: 'Tepung Terigu', sku: 'TPG-001', unit: 'kg' }),
      ];

      const { options } = useMaterialOptions();

      expect(options.value).toEqual([
        {
          value: 1,
          label: 'Gula Pasir',
          sku: 'GUL-001',
          unit: 'kg',
          currentStock: 25,
          minimumStock: 10,
          isLowStock: false,
          isActive: true,
        },
        {
          value: 2,
          label: 'Tepung Terigu',
          sku: 'TPG-001',
          unit: 'kg',
          currentStock: 25,
          minimumStock: 10,
          isLowStock: false,
          isActive: true,
        },
      ]);
    });

    it('[Happy Path] options reaktif terhadap perubahan store.materials', () => {
      const { options } = useMaterialOptions();
      expect(options.value).toEqual([]);

      materialsRef.value = [createMaterial({ id: 5, name: 'Baru' })];

      expect(options.value).toHaveLength(1);
      expect(options.value[0]!.value).toBe(5);
      expect(options.value[0]!.label).toBe('Baru');
    });

    it('[Happy Path] findById() mengembalikan option yang cocok', () => {
      materialsRef.value = [
        createMaterial({ id: 1, name: 'Gula' }),
        createMaterial({ id: 2, name: 'Tepung' }),
      ];

      const { findById } = useMaterialOptions();

      const result = findById(2);
      expect(result).toBeDefined();
      expect(result!.value).toBe(2);
      expect(result!.label).toBe('Tepung');
    });

    it('[Negative Path] findById() mengembalikan undefined untuk ID yang tidak ada', () => {
      materialsRef.value = [createMaterial({ id: 1 })];

      const { findById } = useMaterialOptions();

      expect(findById(999)).toBeUndefined();
    });

    it('[Negative Path] load() mengisi localError saat fetch gagal (response.data.message)', async () => {
      mockFetchMaterials.mockRejectedValueOnce({
        response: { data: { message: 'Server Error' } },
      });

      const { load, error, isLoading } = useMaterialOptions();
      await load();

      expect(error.value).toBe('Server Error');
      expect(isLoading.value).toBe(false);
    });

    it('[Negative Path] load() fallback ke error.message jika response.data.message tidak ada', async () => {
      mockFetchMaterials.mockRejectedValueOnce(new Error('Network down'));

      const { load, error } = useMaterialOptions();
      await load();

      expect(error.value).toBe('Network down');
    });

    it('[Negative Path] load() fallback ke default message jika error benar-benar kosong', async () => {
      mockFetchMaterials.mockRejectedValueOnce({});

      const { load, error } = useMaterialOptions();
      await load();

      expect(error.value).toBe('Failed to load materials.');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Default config] load() pertama kali akan fetch dengan is_active: true', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load } = useMaterialOptions();
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledWith({
        is_active: true,
        per_page: 100,
        page: 1,
      });
    });

    it('[Partisi 2 - perPage kustom] perPage mengganti default 100', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load } = useMaterialOptions({ perPage: 25 });
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledWith({
        is_active: true,
        per_page: 25,
        page: 1,
      });
    });

    it('[Partisi 3 - extraFilters] filter tambahan di-merge dengan default', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load } = useMaterialOptions({
        filters: { category_id: 3, is_low_stock: true },
      });
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledWith({
        is_active: true,
        category_id: 3,
        is_low_stock: true,
        per_page: 100,
        page: 1,
      });
    });

    it('[Partisi 4 - extraFilters override is_active] filter tambahan menang atas default', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load } = useMaterialOptions({
        filters: { is_active: false },
      });
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledWith({
        is_active: false,
        per_page: 100,
        page: 1,
      });
    });

    it('[Partisi 5 - Cache] load() kedua kali TIDAK fetch (per-instance cache)', async () => {
      mockFetchMaterials.mockResolvedValue(undefined);

      const { load } = useMaterialOptions();
      await load();
      await load();
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(1);
    });

    it('[Partisi 6 - Force] load(true) tetap fetch meski cache terisi', async () => {
      mockFetchMaterials.mockResolvedValue(undefined);

      const { load } = useMaterialOptions();
      await load();
      await load(true);
      await load(true);
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(3);
    });

    it('[Partisi 7 - Invalidate] load() setelah invalidate() akan fetch ulang', async () => {
      mockFetchMaterials.mockResolvedValue(undefined);

      const { load, invalidate } = useMaterialOptions();
      await load();
      await load();

      invalidate();
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(2);
    });

    it('[Partisi 8 - Error tidak mengisi cache] setelah error, load() berikutnya tetap fetch', async () => {
      mockFetchMaterials.mockRejectedValueOnce(new Error('Fail'));

      const { load } = useMaterialOptions();
      await load();

      mockFetchMaterials.mockResolvedValueOnce(undefined);
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Cache per instance] dua instance TIDAK berbagi cache', async () => {
      mockFetchMaterials.mockResolvedValue(undefined);

      const instance1 = useMaterialOptions();
      const instance2 = useMaterialOptions();

      await instance1.load();
      await instance2.load();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(2);
    });

    it('[BVA - Invalidate lintas instance] invalidate() instance1 TIDAK mempengaruhi instance2', async () => {
      mockFetchMaterials.mockResolvedValue(undefined);

      const instance1 = useMaterialOptions();
      const instance2 = useMaterialOptions();

      await instance1.load();
      await instance2.load();

      instance1.invalidate();
      await instance1.load();
      await instance2.load();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(3);
    });

    it('[BVA - Options Kosong] options mengembalikan array kosong', () => {
      materialsRef.value = [];

      const { options } = useMaterialOptions();
      expect(options.value).toEqual([]);
    });

    it('[BVA - Satu Elemen] options mapping benar untuk 1 elemen', () => {
      materialsRef.value = [createMaterial({ id: 42, name: 'Solo' })];

      const { options } = useMaterialOptions();
      expect(options.value).toHaveLength(1);
      expect(options.value[0]!.value).toBe(42);
      expect(options.value[0]!.label).toBe('Solo');
    });

    it('[BVA - findById(0)] ID 0 tetap dicari, return undefined jika tidak ada', () => {
      materialsRef.value = [createMaterial({ id: 1 })];

      const { findById } = useMaterialOptions();
      expect(findById(0)).toBeUndefined();
    });

    it('[BVA - findById ID terbesar] ID besar (INT32_MAX) tetap dicari dengan benar', () => {
      const bigId = 2147483647;
      materialsRef.value = [createMaterial({ id: bigId, name: 'Big' })];

      const { options, findById } = useMaterialOptions();

      expect(options.value).toHaveLength(1);
      expect(options.value[0]!.value).toBe(bigId);
      expect(options.value[0]!.label).toBe('Big');

      const result = findById(bigId);
      expect(result).toBeDefined();
      expect(result!.label).toBe('Big');     // ✅ label, bukan name
      expect(result!.value).toBe(bigId);
    });

    it('[BVA - findById ID jutaan] ID jutaan tetap dicari dengan benar', () => {
      const bigId = 9_999_999;
      materialsRef.value = [createMaterial({ id: bigId, name: 'Millions' })];

      const { options, findById } = useMaterialOptions();

      expect(options.value[0]!.value).toBe(bigId);
      expect(findById(bigId)).toBeDefined();
      expect(findById(bigId)!.label).toBe('Millions');  // ✅ label, bukan name
    });

    it('[BVA - findById Number.MAX_SAFE_INTEGER] ID sangat besar tetap dicari', () => {
      const maxId = Number.MAX_SAFE_INTEGER;
      materialsRef.value = [createMaterial({ id: maxId, name: 'MaxSafe' })];

      const { options, findById } = useMaterialOptions();

      expect(options.value[0]!.value).toBe(maxId);
      expect(findById(maxId)).toBeDefined();
      expect(findById(maxId)!.label).toBe('MaxSafe');   // ✅ label, bukan name
    });

    it('[BVA - perPage 0] tetap diteruskan ke API apa adanya', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load } = useMaterialOptions({ perPage: 0 });
      await load();

      expect(mockFetchMaterials).toHaveBeenCalledWith({
        is_active: true,
        per_page: 0,
        page: 1,
      });
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - current_stock string] Number() konversi string ke number', () => {
      materialsRef.value = [
        createMaterial({ id: 1, current_stock: '25.5', minimum_stock: '10' }),
      ];

      const { options } = useMaterialOptions();
      expect(options.value[0]!.currentStock).toBe(25.5);
      expect(options.value[0]!.minimumStock).toBe(10);
    });

    it('[Edge Case - current_stock null] Number(null) = 0', () => {
      materialsRef.value = [
        createMaterial({ id: 1, current_stock: null, minimum_stock: null }),
      ];

      const { options } = useMaterialOptions();
      expect(options.value[0]!.currentStock).toBe(0);
      expect(options.value[0]!.minimumStock).toBe(0);
    });

    it('[Edge Case - current_stock undefined] Number(undefined) = NaN', () => {
      materialsRef.value = [
        createMaterial({ id: 1, current_stock: undefined, minimum_stock: undefined }),
      ];

      const { options } = useMaterialOptions();
      expect(Number.isNaN(options.value[0]!.currentStock)).toBe(true);
      expect(Number.isNaN(options.value[0]!.minimumStock)).toBe(true);
    });

    it('[Edge Case - is_low_stock true] dipetakan dengan benar', () => {
      materialsRef.value = [createMaterial({ id: 1, is_low_stock: true })];

      const { options } = useMaterialOptions();
      expect(options.value[0]!.isLowStock).toBe(true);
    });

    it('[Edge Case - is_active false] dipetakan dengan benar', () => {
      materialsRef.value = [createMaterial({ id: 1, is_active: false })];

      const { options } = useMaterialOptions();
      expect(options.value[0]!.isActive).toBe(false);
    });

    it('[Edge Case - error Reset] error di-null-kan di awal setiap load()', async () => {
      mockFetchMaterials.mockRejectedValueOnce(new Error('First Fail'));
      const { load, error } = useMaterialOptions();
      await load();
      expect(error.value).toBe('First Fail');

      mockFetchMaterials.mockResolvedValueOnce(undefined);
      await load(true);
      expect(error.value).toBeNull();
    });

    it('[Edge Case - isLoading Reset saat error] isLoading false setelah error', async () => {
      mockFetchMaterials.mockRejectedValueOnce(new Error('Fail'));

      const { load, isLoading } = useMaterialOptions();
      await load();

      expect(isLoading.value).toBe(false);
    });

    it('[Corner Case - Empty error object] fallback ke default message', async () => {
      mockFetchMaterials.mockRejectedValueOnce({});

      const { load, error } = useMaterialOptions();
      await load();

      expect(error.value).toBe('Failed to load materials.');
    });

    it('[Corner Case - error.message kosong] fallback ke default message', async () => {
      mockFetchMaterials.mockRejectedValueOnce({
        response: { data: { message: '' } },
        message: '',
      });

      const { load, error } = useMaterialOptions();
      await load();

      expect(error.value).toBe('Failed to load materials.');
    });

    it('[Corner Case - Concurrent load] dua load paralel → fetch 2x (per-instance cache race)', async () => {
      let resolveFetch: () => void = () => {};
      const pending = new Promise<void>((res) => {
        resolveFetch = res;
      });
      mockFetchMaterials.mockReturnValueOnce(pending);

      const { load } = useMaterialOptions();

      const p1 = load();
      const p2 = load();

      resolveFetch();
      await Promise.all([p1, p2]);

      expect(mockFetchMaterials).toHaveBeenCalledTimes(2);
    });

    it('[Corner Case - findById referensi object] return object yang sama dengan di options', () => {
      materialsRef.value = [createMaterial({ id: 1, name: 'Gula' })];

      const { options, findById } = useMaterialOptions();

      expect(findById(1)).toBe(options.value[0]);
    });

    it('[Corner Case - Return Shape] composable mengembalikan props yang benar', () => {
      const result = useMaterialOptions();

      expect(result).toHaveProperty('options');
      expect(result).toHaveProperty('isLoading');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('load');
      expect(result).toHaveProperty('invalidate');
      expect(result).toHaveProperty('findById');

      expect(typeof result.load).toBe('function');
      expect(typeof result.invalidate).toBe('function');
      expect(typeof result.findById).toBe('function');
    });

    it('[Corner Case - Options mapping lengkap] semua field MaterialOption terisi', () => {
      materialsRef.value = [
        createMaterial({
          id: 99,
          name: 'Full Material',
          sku: 'FULL-001',
          unit: 'liter',
          current_stock: 150,
          minimum_stock: 20,
          is_low_stock: true,
          is_active: true,
        }),
      ];

      const { options } = useMaterialOptions();

      expect(options.value[0]).toEqual({
        value: 99,
        label: 'Full Material',
        sku: 'FULL-001',
        unit: 'liter',
        currentStock: 150,
        minimumStock: 20,
        isLowStock: true,
        isActive: true,
      });
    });

    it('[Edge Case - load() mengembalikan Promise<void>] await resolve tanpa value', async () => {
      mockFetchMaterials.mockResolvedValueOnce(undefined);

      const { load } = useMaterialOptions();
      const result = await load();

      expect(result).toBeUndefined();
    });
  });
});