import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRawMaterialCategoryStore } from '../rawMaterialCategoryStore';
import { inventoryApi } from '@/api/inventoryApi';
import type { RawMaterialCategoryPayload } from '@/types/inventory';

// 1. Mock module inventoryApi
vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    getCategories: vi.fn(),
    getCategoryById: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  },
}));

describe('useRawMaterialCategoryStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] fetchCategories() berhasil mengambil data dan mengisi state categories + pagination', async () => {
      const store = useRawMaterialCategoryStore();
      const mockCategories = [
        { id: 1, name: 'Bahan Kering', description: 'Kategori kering', is_active: true },
      ];
      const mockMeta = { current_page: 2, last_page: 5, per_page: 15, total: 50 };

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: mockCategories, meta: mockMeta },
      } as any);

      await store.fetchCategories({ page: 2 });

      expect(store.categories).toEqual(mockCategories);
      expect(store.pagination.current_page).toBe(2);
      expect(store.pagination.last_page).toBe(5);
      expect(store.pagination.per_page).toBe(15);
      expect(store.pagination.total).toBe(50);
      expect(store.errorMessage).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] fetchCategories() dengan filter all="true" mengisi allCategories dan TIDAK menyentuh pagination', async () => {
      const store = useRawMaterialCategoryStore();
      const mockAll = [{ id: 1, name: 'Cat A' }, { id: 2, name: 'Cat B' }];

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: mockAll },
      } as any);

      await store.fetchCategories({ all: 'true' });

      expect(store.allCategories).toEqual(mockAll);
      // Pagination harus tetap default karena filter `all` tidak mengisi meta
      expect(store.pagination.current_page).toBe(1);
      expect(store.pagination.total).toBe(0);
    });

    it('[Happy Path] fetchCategoryById() mengembalikan data kategori', async () => {
      const store = useRawMaterialCategoryStore();
      const mockCategory = { id: 7, name: 'Bahan Basah', is_active: true };

      vi.mocked(inventoryApi.getCategoryById).mockResolvedValueOnce({
        data: { data: mockCategory },
      } as any);

      const result = await store.fetchCategoryById(7);

      expect(inventoryApi.getCategoryById).toHaveBeenCalledWith(7);
      expect(result).toEqual(mockCategory);
      expect(store.errorMessage).toBeNull();
    });

    it('[Happy Path] createCategory() memanggil API dan mengembalikan data yang dibuat', async () => {
      const store = useRawMaterialCategoryStore();
      const payload: RawMaterialCategoryPayload = { name: 'Kategori Baru', is_active: true };
      const responseData = { id: 10, ...payload };

      vi.mocked(inventoryApi.createCategory).mockResolvedValueOnce({
        data: { data: responseData },
      } as any);

      const result = await store.createCategory(payload);

      expect(inventoryApi.createCategory).toHaveBeenCalledWith(payload);
      expect(result).toEqual(responseData);
      expect(store.validationErrors).toEqual({});
    });

    it('[Happy Path] updateCategory() memanggil API dan mengembalikan true saat sukses', async () => {
      const store = useRawMaterialCategoryStore();
      const payload: RawMaterialCategoryPayload = { name: 'Updated', is_active: false };

      vi.mocked(inventoryApi.updateCategory).mockResolvedValueOnce({} as any);

      const success = await store.updateCategory(7, payload);

      expect(inventoryApi.updateCategory).toHaveBeenCalledWith(7, payload);
      expect(success).toBe(true);
      expect(store.errorMessage).toBeNull();
    });

    it('[Happy Path] deleteCategory() memanggil API dan mengembalikan true saat sukses', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.deleteCategory).mockResolvedValueOnce({} as any);

      const success = await store.deleteCategory(7);

      expect(inventoryApi.deleteCategory).toHaveBeenCalledWith(7);
      expect(success).toBe(true);
    });

    it('[Negative Path] fetchCategories() mengisi errorMessage saat API gagal', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockRejectedValueOnce({
        response: { data: { message: 'Server Error' } },
      });

      await store.fetchCategories();

      expect(store.errorMessage).toBe('Server Error');
      expect(store.isLoading).toBe(false);
    });

    it('[Negative Path] deleteCategory() mengembalikan false dan mengisi errorMessage saat kategori sedang dipakai', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.deleteCategory).mockRejectedValueOnce({
        response: { data: { message: 'Category is in use.' } },
      });

      const success = await store.deleteCategory(7);

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Category is in use.');
    });

    it('[Negative Path] fetchCategoryById() mengembalikan null dan mengisi errorMessage saat 404', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategoryById).mockRejectedValueOnce({
        response: { data: { message: 'Not Found' } },
      });

      const result = await store.fetchCategoryById(999);

      expect(result).toBeNull();
      expect(store.errorMessage).toBe('Not Found');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Error Handling)
  // =========================================================================
  describe('Equivalence Partitioning (Error Handling)', () => {
    it('[Invalid Input Partition - 422] createCategory() memilah HTTP 422 ke validationErrors & mengosongkan errorMessage', async () => {
      const store = useRawMaterialCategoryStore();
      const mockErrors = { name: ['The name has already been taken.'] };

      vi.mocked(inventoryApi.createCategory).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } },
      });

      const result = await store.createCategory({ name: 'Existing' });

      expect(result).toBeNull();
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull();
    });

    it('[Invalid Input Partition - 422] updateCategory() memilah HTTP 422 ke validationErrors', async () => {
      const store = useRawMaterialCategoryStore();
      const mockErrors = { name: ['The name field is required.'] };

      vi.mocked(inventoryApi.updateCategory).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } },
      });

      const success = await store.updateCategory(7, { name: '' });

      expect(success).toBe(false);
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull();
    });

    it('[Forbidden/Conflict Partition - 403] updateCategory() mengisi errorMessage dari response body', async () => {
      const store = useRawMaterialCategoryStore();
      store.validationErrors = { old_error: ['test'] };

      vi.mocked(inventoryApi.updateCategory).mockRejectedValueOnce({
        response: { status: 403, data: { message: 'You do not have permission.' } },
      });

      await store.updateCategory(7, { name: 'Test' });

      expect(store.errorMessage).toBe('You do not have permission.');
      expect(store.validationErrors).toEqual({});
    });

    it('[Server Error Partition - 500] deleteCategory() menggunakan default message saat body kosong', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.deleteCategory).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      const success = await store.deleteCategory(7);

      expect(success).toBe(false);
      expect(store.errorMessage).toBe(
        'Failed to delete category. It might be in use.'
      );
    });

    it('[Server Error Partition - 500] fetchCategories() menggunakan default message saat body kosong', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.fetchCategories();

      expect(store.errorMessage).toBe('Failed to fetch categories.');
    });

    it('[Server Error Partition - 500] fetchCategoryById() menggunakan default message saat body kosong', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategoryById).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.fetchCategoryById(1);

      expect(store.errorMessage).toBe('Failed to fetch category details.');
    });

    it('[Server Error Partition - 500] createCategory() menggunakan default message saat body kosong & status bukan 422', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.createCategory).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.createCategory({ name: 'Test' });

      expect(store.errorMessage).toBe('Failed to create category.');
    });

    it('[Server Error Partition - 500] updateCategory() menggunakan default message saat body kosong & status bukan 422', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.updateCategory).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.updateCategory(7, { name: 'Test' });

      expect(store.errorMessage).toBe('Failed to update category.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Fallback Pagination Kosong] fetchCategories() pakai default jika meta hilang', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: [] }, // tanpa meta
      } as any);

      await store.fetchCategories();

      expect(store.pagination.current_page).toBe(1);
      expect(store.pagination.last_page).toBe(1);
      expect(store.pagination.per_page).toBe(15);
      expect(store.pagination.total).toBe(0);
    });

    it('[BVA - Empty Categories] fetchCategories() mengisi array kosong jika response.data.data kosong', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchCategories();

      expect(store.categories).toEqual([]);
    });

    it('[BVA - Batas filter all] fetchCategories() dengan all="false" TIDAK mengisi allCategories', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchCategories({ all: 'false' });

      expect(store.allCategories).toEqual([]);
    });

    it('[BVA - ID 0] fetchCategoryById() dengan ID 0 tetap memanggil API', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategoryById).mockResolvedValueOnce({
        data: { data: { id: 0, name: 'Zero' } },
      } as any);

      await store.fetchCategoryById(0);

      expect(inventoryApi.getCategoryById).toHaveBeenCalledWith(0);
    });

    it('[BVA - Payload kosong] createCategory() menerima object kosong {}', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.createCategory).mockResolvedValueOnce({
        data: { data: { id: 1 } },
      } as any);

      await store.createCategory({} as RawMaterialCategoryPayload);

      expect(inventoryApi.createCategory).toHaveBeenCalledWith({});
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - clearErrors()] mereset errorMessage & validationErrors sekaligus', () => {
      const store = useRawMaterialCategoryStore();
      store.errorMessage = 'Old error';
      store.validationErrors = { name: ['Err'] };

      store.clearErrors();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - Auto clearErrors] fetchCategories() otomatis membersihkan error lama sebelum request', async () => {
      const store = useRawMaterialCategoryStore();
      store.errorMessage = 'Previous error';
      store.validationErrors = { name: ['Old'] };

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchCategories();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - isLoading State] isLoading berubah true saat request & false setelah selesai', async () => {
      const store = useRawMaterialCategoryStore();

      let loadingDuringRequest = false;

      vi.mocked(inventoryApi.getCategories).mockImplementationOnce(async () => {
        loadingDuringRequest = store.isLoading;
        return { data: { data: [], meta: {} } } as any;
      });

      await store.fetchCategories();

      expect(loadingDuringRequest).toBe(true);
      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - isLoading reset saat error] isLoading kembali false meski API throw', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockRejectedValueOnce({
        response: { data: { message: 'Fail' } },
      });

      await store.fetchCategories();

      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - Unknown Error Structure] fetchCategoryById() fallback ke default message saat error tanpa response', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategoryById).mockRejectedValueOnce(
        new Error('Native error')
      );

      await store.fetchCategoryById(1);

      expect(store.errorMessage).toBe('Failed to fetch category details.');
    });

    it('[Corner Case - Validation Reset] createCategory() sukses mengosongkan validationErrors sebelumnya', async () => {
      const store = useRawMaterialCategoryStore();
      store.validationErrors = { name: ['Old validation'] };

      vi.mocked(inventoryApi.createCategory).mockResolvedValueOnce({
        data: { data: { id: 99, name: 'New' } },
      } as any);

      await store.createCategory({ name: 'New' });

      expect(store.validationErrors).toEqual({});
    });

    it('[Corner Case - Empty Response Data] createCategory() mengembalikan null jika data tidak ada', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.createCategory).mockResolvedValueOnce({
        data: {},
      } as any);

      const result = await store.createCategory({ name: 'Test' });

      expect(result).toBeUndefined(); // response.data.data === undefined
    });

    it('[Corner Case - Concurrent fetch] memastikan isLoading sinkron dengan 2 fetch berurutan', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.getCategories).mockResolvedValue({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchCategories();
      expect(store.isLoading).toBe(false);

      await store.fetchCategories();
      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - All flag independence] fetchCategories({all:"true"}) tidak menimpa categories (list terpisah)', async () => {
      const store = useRawMaterialCategoryStore();
      const paginatedData = [{ id: 1, name: 'Paginated' }];
      const allData = [{ id: 1, name: 'All A' }, { id: 2, name: 'All B' }];

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: paginatedData, meta: {} },
      } as any);
      await store.fetchCategories();
      expect(store.categories).toEqual(paginatedData);

      vi.mocked(inventoryApi.getCategories).mockResolvedValueOnce({
        data: { data: allData },
      } as any);
      await store.fetchCategories({ all: 'true' });

      // categories TIDAK berubah, allCategories terisi
      expect(store.categories).toEqual(paginatedData);
      expect(store.allCategories).toEqual(allData);
    });

    it('[Corner Case - Error propagation] API error asli diteruskan ke errorMessage (tanpa ditelan)', async () => {
      const store = useRawMaterialCategoryStore();

      vi.mocked(inventoryApi.deleteCategory).mockRejectedValueOnce({
        response: { data: { message: 'Constraint violation: FK referenced' } },
      });

      await store.deleteCategory(1);

      expect(store.errorMessage).toBe('Constraint violation: FK referenced');
    });
  });
});