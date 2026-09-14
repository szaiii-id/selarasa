import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRawMaterialStore } from '../rawMaterialStore';
import { inventoryApi } from '@/api/inventoryApi';
import type { RawMaterialPayload } from '@/types/inventory';

// 1. Mock module inventoryApi
vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    getMaterials: vi.fn(),
    getMaterialById: vi.fn(),
    createMaterial: vi.fn(),
    updateMaterial: vi.fn(),
  },
}));

describe('useRawMaterialStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] fetchMaterials() berhasil mengambil data dan mengisi state materials + pagination', async () => {
      const store = useRawMaterialStore();
      const mockMaterials = [
        { id: 1, name: 'Gula Pasir', category_id: 1, unit: 'kg', minimum_stock: 10 },
      ];
      const mockMeta = { current_page: 2, last_page: 5, per_page: 15, total: 50 };

      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: mockMaterials, meta: mockMeta },
      } as any);

      await store.fetchMaterials({ page: 2 });

      expect(inventoryApi.getMaterials).toHaveBeenCalledWith({ page: 2 });
      expect(store.materials).toEqual(mockMaterials);
      expect(store.pagination.current_page).toBe(2);
      expect(store.pagination.last_page).toBe(5);
      expect(store.pagination.per_page).toBe(15);
      expect(store.pagination.total).toBe(50);
      expect(store.errorMessage).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] fetchMaterials() tanpa filter menggunakan default object kosong {}', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMaterials();

      expect(inventoryApi.getMaterials).toHaveBeenCalledWith({});
    });

    it('[Happy Path] fetchMaterialById() mengembalikan data material', async () => {
      const store = useRawMaterialStore();
      const mockMaterial = { id: 7, name: 'Tepung Terigu', unit: 'kg' };

      vi.mocked(inventoryApi.getMaterialById).mockResolvedValueOnce({
        data: { data: mockMaterial },
      } as any);

      const result = await store.fetchMaterialById(7);

      expect(inventoryApi.getMaterialById).toHaveBeenCalledWith(7);
      expect(result).toEqual(mockMaterial);
      expect(store.errorMessage).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] createMaterial() memanggil API dan mengembalikan data yang dibuat', async () => {
      const store = useRawMaterialStore();
      const payload: RawMaterialPayload = {
        name: 'Gula Merah',
        category_id: 1,
        unit: 'kg',
        minimum_stock: 5,
      };
      const responseData = { id: 10, ...payload };

      vi.mocked(inventoryApi.createMaterial).mockResolvedValueOnce({
        data: { data: responseData },
      } as any);

      const result = await store.createMaterial(payload);

      expect(inventoryApi.createMaterial).toHaveBeenCalledWith(payload);
      expect(result).toEqual(responseData);
      expect(store.validationErrors).toEqual({});
      expect(store.errorMessage).toBeNull();
    });

    it('[Happy Path] updateMaterial() memanggil API dan mengembalikan true saat sukses', async () => {
      const store = useRawMaterialStore();
      const payload: RawMaterialPayload = { name: 'Updated', minimum_stock: 20 };

      vi.mocked(inventoryApi.updateMaterial).mockResolvedValueOnce({} as any);

      const success = await store.updateMaterial(7, payload);

      expect(inventoryApi.updateMaterial).toHaveBeenCalledWith(7, payload);
      expect(success).toBe(true);
      expect(store.errorMessage).toBeNull();
    });

    it('[Happy Path] updateMaterial() dengan is_active=false (soft-deactivate) tetap sukses via PUT', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.updateMaterial).mockResolvedValueOnce({} as any);

      const success = await store.updateMaterial(7, { is_active: false } as RawMaterialPayload);

      expect(success).toBe(true);
      expect(inventoryApi.updateMaterial).toHaveBeenCalledWith(7, { is_active: false });
    });

    it('[Negative Path] fetchMaterials() mengisi errorMessage saat API gagal', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockRejectedValueOnce({
        response: { data: { message: 'Server Error' } },
      });

      await store.fetchMaterials();

      expect(store.errorMessage).toBe('Server Error');
      expect(store.isLoading).toBe(false);
    });

    it('[Negative Path] fetchMaterialById() mengembalikan null dan mengisi errorMessage saat 404', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterialById).mockRejectedValueOnce({
        response: { data: { message: 'Material Not Found' } },
      });

      const result = await store.fetchMaterialById(999);

      expect(result).toBeNull();
      expect(store.errorMessage).toBe('Material Not Found');
    });

    it('[Negative Path] updateMaterial() mengembalikan false dan mengisi errorMessage saat API gagal', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.updateMaterial).mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Internal Error' } },
      });

      const success = await store.updateMaterial(7, { name: 'X' });

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Internal Error');
    });

    it('[Negative Path] createMaterial() mengembalikan null dan mengisi errorMessage saat API gagal', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.createMaterial).mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Failed to insert' } },
      });

      const result = await store.createMaterial({ name: 'X' } as RawMaterialPayload);

      expect(result).toBeNull();
      expect(store.errorMessage).toBe('Failed to insert');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Error Handling)
  // =========================================================================
  describe('Equivalence Partitioning (Error Handling)', () => {
    it('[Invalid Input Partition - 422] createMaterial() memilah HTTP 422 ke validationErrors & mengosongkan errorMessage', async () => {
      const store = useRawMaterialStore();
      const mockErrors = {
        name: ['The name field is required.'],
        unit: ['The unit field is required.'],
      };

      vi.mocked(inventoryApi.createMaterial).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } },
      });

      const result = await store.createMaterial({} as RawMaterialPayload);

      expect(result).toBeNull();
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull();
    });

    it('[Invalid Input Partition - 422] updateMaterial() memilah HTTP 422 ke validationErrors & mengosongkan errorMessage', async () => {
      const store = useRawMaterialStore();
      const mockErrors = { minimum_stock: ['Must be a positive number.'] };

      vi.mocked(inventoryApi.updateMaterial).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } },
      });

      const success = await store.updateMaterial(7, { minimum_stock: -1 } as any);

      expect(success).toBe(false);
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull();
    });

    it('[Forbidden/Conflict Partition - 403] updateMaterial() mengisi errorMessage & mengosongkan validationErrors', async () => {
      const store = useRawMaterialStore();
      store.validationErrors = { old_error: ['test'] };

      vi.mocked(inventoryApi.updateMaterial).mockRejectedValueOnce({
        response: { status: 403, data: { message: 'Forbidden action.' } },
      });

      await store.updateMaterial(7, { name: 'Test' });

      expect(store.errorMessage).toBe('Forbidden action.');
      expect(store.validationErrors).toEqual({});
    });

    it('[Server Error Partition - 500] fetchMaterials() menggunakan default message saat body kosong', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.fetchMaterials();

      expect(store.errorMessage).toBe('Failed to fetch raw materials.');
    });

    it('[Server Error Partition - 500] fetchMaterialById() menggunakan default message saat body kosong', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterialById).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.fetchMaterialById(1);

      expect(store.errorMessage).toBe('Failed to fetch raw material details.');
    });

    it('[Server Error Partition - 500] createMaterial() menggunakan default message saat body kosong & status bukan 422', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.createMaterial).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.createMaterial({ name: 'Test' } as RawMaterialPayload);

      expect(store.errorMessage).toBe('Failed to create raw material.');
    });

    it('[Server Error Partition - 500] updateMaterial() menggunakan default message saat body kosong & status bukan 422', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.updateMaterial).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.updateMaterial(7, { name: 'Test' });

      expect(store.errorMessage).toBe('Failed to update raw material.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Fallback Pagination Kosong] fetchMaterials() pakai default jika meta hilang', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: [] }, // tanpa meta
      } as any);

      await store.fetchMaterials();

      expect(store.pagination.current_page).toBe(1);
      expect(store.pagination.last_page).toBe(1);
      expect(store.pagination.per_page).toBe(15);
      expect(store.pagination.total).toBe(0);
    });

    it('[BVA - Empty Materials] fetchMaterials() mengisi array kosong jika response.data.data kosong', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMaterials();

      expect(store.materials).toEqual([]);
    });

    it('[BVA - ID 0] fetchMaterialById() dengan ID 0 tetap memanggil API', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterialById).mockResolvedValueOnce({
        data: { data: { id: 0, name: 'Zero' } },
      } as any);

      await store.fetchMaterialById(0);

      expect(inventoryApi.getMaterialById).toHaveBeenCalledWith(0);
    });

    it('[BVA - ID 0] updateMaterial() dengan ID 0 tetap memanggil API', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.updateMaterial).mockResolvedValueOnce({} as any);

      await store.updateMaterial(0, { name: 'Zero Update' });

      expect(inventoryApi.updateMaterial).toHaveBeenCalledWith(0, { name: 'Zero Update' });
    });

    it('[BVA - Payload kosong] createMaterial() menerima object kosong {}', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.createMaterial).mockResolvedValueOnce({
        data: { data: { id: 1 } },
      } as any);

      await store.createMaterial({} as RawMaterialPayload);

      expect(inventoryApi.createMaterial).toHaveBeenCalledWith({});
    });

    it('[BVA - minimum_stock = 0] createMaterial() mengizinkan minimum_stock bernilai 0', async () => {
      const store = useRawMaterialStore();
      const payload: RawMaterialPayload = {
        name: 'Zero Stock',
        category_id: 1,
        unit: 'pcs',
        minimum_stock: 0,
      };

      vi.mocked(inventoryApi.createMaterial).mockResolvedValueOnce({
        data: { data: { id: 1, ...payload } },
      } as any);

      const result = await store.createMaterial(payload);

      expect(inventoryApi.createMaterial).toHaveBeenCalledWith(payload);
      expect(result).toMatchObject({ minimum_stock: 0 });
    });

    it('[BVA - ID besar] fetchMaterialById() dengan Number.MAX_SAFE_INTEGER', async () => {
      const store = useRawMaterialStore();
      const maxId = Number.MAX_SAFE_INTEGER;

      vi.mocked(inventoryApi.getMaterialById).mockResolvedValueOnce({
        data: { data: { id: maxId, name: 'Max' } },
      } as any);

      await store.fetchMaterialById(maxId);

      expect(inventoryApi.getMaterialById).toHaveBeenCalledWith(maxId);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - clearErrors()] mereset errorMessage & validationErrors sekaligus', () => {
      const store = useRawMaterialStore();
      store.errorMessage = 'Old error';
      store.validationErrors = { name: ['Err'] };

      store.clearErrors();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - Auto clearErrors] fetchMaterials() otomatis membersihkan error lama sebelum request', async () => {
      const store = useRawMaterialStore();
      store.errorMessage = 'Previous error';
      store.validationErrors = { name: ['Old'] };

      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMaterials();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - isLoading State] isLoading berubah true saat request & false setelah selesai', async () => {
      const store = useRawMaterialStore();

      let loadingDuringRequest = false;

      vi.mocked(inventoryApi.getMaterials).mockImplementationOnce(async () => {
        loadingDuringRequest = store.isLoading;
        return { data: { data: [], meta: {} } } as any;
      });

      await store.fetchMaterials();

      expect(loadingDuringRequest).toBe(true);
      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - isLoading reset saat error] isLoading kembali false meski API throw', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockRejectedValueOnce({
        response: { data: { message: 'Fail' } },
      });

      await store.fetchMaterials();

      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - Unknown Error Structure] fetchMaterialById() fallback ke default message saat error tanpa response', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterialById).mockRejectedValueOnce(
        new Error('Native error')
      );

      await store.fetchMaterialById(1);

      expect(store.errorMessage).toBe('Failed to fetch raw material details.');
    });

    it('[Edge Case - Unknown Error Structure] updateMaterial() fallback ke default message saat error tanpa response', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.updateMaterial).mockRejectedValueOnce(
        new Error('Native error')
      );

      await store.updateMaterial(1, { name: 'X' });

      expect(store.errorMessage).toBe('Failed to update raw material.');
    });

    it('[Edge Case - Unknown Error Structure] createMaterial() fallback ke default message saat error tanpa response', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.createMaterial).mockRejectedValueOnce(
        new Error('Native error')
      );

      await store.createMaterial({ name: 'X' } as RawMaterialPayload);

      expect(store.errorMessage).toBe('Failed to create raw material.');
    });

    it('[Corner Case - Validation Reset] createMaterial() sukses mengosongkan validationErrors sebelumnya', async () => {
      const store = useRawMaterialStore();
      store.validationErrors = { name: ['Old validation'] };

      vi.mocked(inventoryApi.createMaterial).mockResolvedValueOnce({
        data: { data: { id: 99, name: 'New' } },
      } as any);

      await store.createMaterial({ name: 'New' } as RawMaterialPayload);

      expect(store.validationErrors).toEqual({});
    });

    it('[Corner Case - Empty Response Data] createMaterial() mengembalikan undefined jika data tidak ada', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.createMaterial).mockResolvedValueOnce({
        data: {},
      } as any);

      const result = await store.createMaterial({ name: 'Test' } as RawMaterialPayload);

      expect(result).toBeUndefined();
    });

    it('[Corner Case - Concurrent fetch] memastikan isLoading sinkron dengan 2 fetch berurutan', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.getMaterials).mockResolvedValue({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMaterials();
      expect(store.isLoading).toBe(false);

      await store.fetchMaterials();
      expect(store.isLoading).toBe(false);
    });

    it('[Corner Case - Error propagation] API error asli diteruskan ke errorMessage (tanpa ditelan)', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.updateMaterial).mockRejectedValueOnce({
        response: { data: { message: 'Material is locked by another process.' } },
      });

      await store.updateMaterial(1, { name: 'X' });

      expect(store.errorMessage).toBe('Material is locked by another process.');
    });

    it('[Corner Case - filter diteruskan apa adanya] fetchMaterials() meneruskan filter kompleks ke API', async () => {
      const store = useRawMaterialStore();
      const filters = {
        search: 'gula',
        category_id: 1,
        is_active: true,
        page: 3,
        per_page: 25,
      };

      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMaterials(filters);

      expect(inventoryApi.getMaterials).toHaveBeenCalledWith(filters);
    });

    it('[Corner Case - validationErrors persistence] validationErrors dari create tetap ada sampai action berikutnya', async () => {
      const store = useRawMaterialStore();

      vi.mocked(inventoryApi.createMaterial).mockRejectedValueOnce({
        response: { status: 422, data: { errors: { name: ['Required'] } } },
      });

      await store.createMaterial({} as RawMaterialPayload);
      expect(store.validationErrors).toEqual({ name: ['Required'] });

      // Action berikutnya yang sukses harus clear
      vi.mocked(inventoryApi.getMaterials).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMaterials();
      expect(store.validationErrors).toEqual({});
    });
  });
});