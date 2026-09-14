import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useStockMovementStore } from '../stockMovementStore';
import { inventoryApi } from '@/api/inventoryApi';
import type { StockMovementPayload } from '@/types/inventory';

// 1. Mock module inventoryApi
vi.mock('../../api/inventoryApi', () => ({
  inventoryApi: {
    getMovements: vi.fn(),
    createMovement: vi.fn(),
  },
}));

describe('useStockMovementStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] fetchMovements() berhasil mengambil data dan mengisi state movements + pagination', async () => {
      const store = useStockMovementStore();
      const mockMovements = [
        {
          id: 1,
          material_id: 3,
          type: 'in' as const,
          quantity: 100,
          notes: 'Restock dari supplier',
        },
        {
          id: 2,
          material_id: 3,
          type: 'out' as const,
          quantity: 20,
          notes: 'Pemakaian produksi',
        },
      ];
      const mockMeta = { current_page: 2, last_page: 5, per_page: 15, total: 50 };

      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: mockMovements, meta: mockMeta },
      } as any);

      await store.fetchMovements({ page: 2 });

      expect(inventoryApi.getMovements).toHaveBeenCalledWith({ page: 2 });
      expect(store.movements).toEqual(mockMovements);
      expect(store.pagination.current_page).toBe(2);
      expect(store.pagination.last_page).toBe(5);
      expect(store.pagination.per_page).toBe(15);
      expect(store.pagination.total).toBe(50);
      expect(store.errorMessage).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] fetchMovements() tanpa filter menggunakan default object kosong {}', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMovements();

      expect(inventoryApi.getMovements).toHaveBeenCalledWith({});
    });

    it('[Happy Path] createMovement() memanggil API dan mengembalikan true saat sukses', async () => {
      const store = useStockMovementStore();
      const payload: StockMovementPayload = {
        material_id: 3,
        type: 'in',
        quantity: 100,
        notes: 'Restock dari supplier',
      };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({
        data: { data: { id: 1, ...payload } },
      } as any);

      const success = await store.createMovement(payload);

      expect(inventoryApi.createMovement).toHaveBeenCalledWith(payload);
      expect(success).toBe(true);
      expect(store.validationErrors).toEqual({});
      expect(store.errorMessage).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] createMovement() dengan tipe "out" tetap berhasil', async () => {
      const store = useStockMovementStore();
      const payload: StockMovementPayload = {
        material_id: 3,
        type: 'out',
        quantity: 20,
      };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      const success = await store.createMovement(payload);

      expect(success).toBe(true);
      expect(inventoryApi.createMovement).toHaveBeenCalledWith(payload);
    });

    it('[Negative Path] fetchMovements() mengisi errorMessage saat API gagal', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockRejectedValueOnce({
        response: { data: { message: 'Server Error' } },
      });

      await store.fetchMovements();

      expect(store.errorMessage).toBe('Server Error');
      expect(store.isLoading).toBe(false);
    });

    it('[Negative Path] createMovement() mengembalikan false dan mengisi errorMessage saat stok tidak cukup', async () => {
      const store = useStockMovementStore();
      const payload: StockMovementPayload = {
        material_id: 3,
        type: 'out',
        quantity: 9999,
      };

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Insufficient stock' } },
      });

      const success = await store.createMovement(payload);

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Insufficient stock');
      expect(store.validationErrors).toEqual({});
    });

    it('[Negative Path] createMovement() mengembalikan false saat material tidak ditemukan', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { status: 404, data: { message: 'Material not found' } },
      });

      const success = await store.createMovement({
        material_id: 999,
        type: 'in',
        quantity: 10,
      });

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Material not found');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Error Handling)
  // =========================================================================
  describe('Equivalence Partitioning (Error Handling)', () => {
    it('[Invalid Input Partition - 422] createMovement() memilah HTTP 422 ke validationErrors & mengosongkan errorMessage', async () => {
      const store = useStockMovementStore();
      const mockErrors = {
        quantity: ['The quantity must be greater than 0.'],
        material_id: ['The material is required.'],
      };

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } },
      });

      const success = await store.createMovement({
        material_id: 0,
        type: 'in',
        quantity: -1,
      } as any);

      expect(success).toBe(false);
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull();
    });

    it('[Forbidden/Conflict Partition - 403] createMovement() mengisi errorMessage & mengosongkan validationErrors', async () => {
      const store = useStockMovementStore();
      store.validationErrors = { old_error: ['test'] };

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { status: 403, data: { message: 'You do not have permission.' } },
      });

      await store.createMovement({ material_id: 1, type: 'in', quantity: 10 });

      expect(store.errorMessage).toBe('You do not have permission.');
      expect(store.validationErrors).toEqual({});
    });

    it('[Server Error Partition - 500] fetchMovements() menggunakan default message saat body kosong', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.fetchMovements();

      expect(store.errorMessage).toBe('Failed to fetch stock movements.');
    });

    it('[Server Error Partition - 500] createMovement() menggunakan default message saat body kosong & status bukan 422', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { status: 500, data: {} },
      });

      await store.createMovement({ material_id: 1, type: 'in', quantity: 10 });

      expect(store.errorMessage).toBe('Failed to record stock movement.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Fallback Pagination Kosong] fetchMovements() pakai default jika meta hilang', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: [] }, // tanpa meta
      } as any);

      await store.fetchMovements();

      expect(store.pagination.current_page).toBe(1);
      expect(store.pagination.last_page).toBe(1);
      expect(store.pagination.per_page).toBe(15);
      expect(store.pagination.total).toBe(0);
    });

    it('[BVA - Empty Movements] fetchMovements() mengisi array kosong jika response.data.data kosong', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMovements();

      expect(store.movements).toEqual([]);
    });

    it('[BVA - quantity = 0] createMovement() tetap meneruskan quantity 0 ke API (falsy value)', async () => {
      const store = useStockMovementStore();
      const payload: StockMovementPayload = {
        material_id: 1,
        type: 'in',
        quantity: 0,
        notes: 'Zero quantity test',
      };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      await store.createMovement(payload);

      expect(inventoryApi.createMovement).toHaveBeenCalledWith(payload);
    });

    it('[BVA - material_id = 0] createMovement() tetap memanggil API dengan ID 0', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      await store.createMovement({ material_id: 0, type: 'in', quantity: 10 });

      expect(inventoryApi.createMovement).toHaveBeenCalledWith({
        material_id: 0,
        type: 'in',
        quantity: 10,
      });
    });

    it('[BVA - quantity besar] createMovement() menerima quantity besar', async () => {
      const store = useStockMovementStore();
      const payload: StockMovementPayload = {
        material_id: 1,
        type: 'in',
        quantity: 1_000_000,
      };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      await store.createMovement(payload);

      expect(inventoryApi.createMovement).toHaveBeenCalledWith(payload);
    });

    it('[BVA - Payload minimal] createMovement() menerima payload hanya field wajib (notes opsional)', async () => {
      const store = useStockMovementStore();
      const minimalPayload: StockMovementPayload = {
        material_id: 1,
        type: 'in',
        quantity: 50,
      };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      await store.createMovement(minimalPayload);

      expect(inventoryApi.createMovement).toHaveBeenCalledWith(minimalPayload);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - clearErrors()] mereset errorMessage & validationErrors sekaligus', () => {
      const store = useStockMovementStore();
      store.errorMessage = 'Old error';
      store.validationErrors = { quantity: ['Err'] };

      store.clearErrors();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - Auto clearErrors] fetchMovements() otomatis membersihkan error lama sebelum request', async () => {
      const store = useStockMovementStore();
      store.errorMessage = 'Previous error';
      store.validationErrors = { quantity: ['Old'] };

      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMovements();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - isLoading State] isLoading berubah true saat request & false setelah selesai', async () => {
      const store = useStockMovementStore();

      let loadingDuringRequest = false;

      vi.mocked(inventoryApi.getMovements).mockImplementationOnce(async () => {
        loadingDuringRequest = store.isLoading;
        return { data: { data: [], meta: {} } } as any;
      });

      await store.fetchMovements();

      expect(loadingDuringRequest).toBe(true);
      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - isLoading reset saat error] isLoading kembali false meski API throw', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockRejectedValueOnce({
        response: { data: { message: 'Fail' } },
      });

      await store.fetchMovements();

      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - isLoading di createMovement] isLoading true saat request & false setelah error', async () => {
      const store = useStockMovementStore();

      let loadingDuringRequest = false;

      vi.mocked(inventoryApi.createMovement).mockImplementationOnce(async () => {
        loadingDuringRequest = store.isLoading;
        throw new Error('Native error');
      });

      await store.createMovement({ material_id: 1, type: 'in', quantity: 10 });

      expect(loadingDuringRequest).toBe(true);
      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - Unknown Error Structure] fetchMovements() fallback ke default message saat error tanpa response', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockRejectedValueOnce(
        new Error('Native error')
      );

      await store.fetchMovements();

      expect(store.errorMessage).toBe('Failed to fetch stock movements.');
    });

    it('[Edge Case - Unknown Error Structure] createMovement() fallback ke default message saat error tanpa response', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce(
        new Error('Native error')
      );

      await store.createMovement({ material_id: 1, type: 'in', quantity: 10 });

      expect(store.errorMessage).toBe('Failed to record stock movement.');
    });

    it('[Corner Case - Validation Reset] createMovement() sukses mengosongkan validationErrors sebelumnya', async () => {
      const store = useStockMovementStore();
      store.validationErrors = { quantity: ['Old validation'] };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      await store.createMovement({ material_id: 1, type: 'in', quantity: 10 });

      expect(store.validationErrors).toEqual({});
    });

    it('[Corner Case - Concurrent fetch] isLoading sinkron dengan 2 fetch berurutan', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.getMovements).mockResolvedValue({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMovements();
      expect(store.isLoading).toBe(false);

      await store.fetchMovements();
      expect(store.isLoading).toBe(false);
    });

    it('[Corner Case - filter diteruskan apa adanya] fetchMovements() meneruskan filter kompleks ke API', async () => {
      const store = useStockMovementStore();
      const filters = {
        material_id: 5,
        type: 'out' as const,
        date_from: '2024-01-01',
        date_to: '2024-01-31',
        page: 3,
        per_page: 25,
      };

      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMovements(filters);

      expect(inventoryApi.getMovements).toHaveBeenCalledWith(filters);
    });

    it('[Corner Case - validationErrors persistence] validationErrors dari create tetap ada sampai action berikutnya', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { status: 422, data: { errors: { quantity: ['Required'] } } },
      });

      await store.createMovement({ material_id: 1, type: 'in', quantity: -1 } as any);
      expect(store.validationErrors).toEqual({ quantity: ['Required'] });

      // Action berikutnya yang sukses harus clear
      vi.mocked(inventoryApi.getMovements).mockResolvedValueOnce({
        data: { data: [], meta: {} },
      } as any);

      await store.fetchMovements();
      expect(store.validationErrors).toEqual({});
    });

    it('[Edge Case - notes opsional] createMovement() sukses tanpa notes', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      const success = await store.createMovement({
        material_id: 1,
        type: 'in',
        quantity: 10,
      });

      expect(success).toBe(true);
      expect(inventoryApi.createMovement).toHaveBeenCalledWith({
        material_id: 1,
        type: 'in',
        quantity: 10,
      });
    });

    it('[Edge Case - notes string kosong] createMovement() meneruskan notes kosong apa adanya', async () => {
      const store = useStockMovementStore();
      const payload: StockMovementPayload = {
        material_id: 1,
        type: 'out',
        quantity: 5,
        notes: '',
      };

      vi.mocked(inventoryApi.createMovement).mockResolvedValueOnce({} as any);

      await store.createMovement(payload);

      expect(inventoryApi.createMovement).toHaveBeenCalledWith(payload);
    });

    it('[Edge Case - Error propagation] API error asli diteruskan ke errorMessage (tanpa ditelan)', async () => {
      const store = useStockMovementStore();

      vi.mocked(inventoryApi.createMovement).mockRejectedValueOnce({
        response: { data: { message: 'Movement locked: audit trail in progress' } },
      });

      await store.createMovement({ material_id: 1, type: 'in', quantity: 10 });

      expect(store.errorMessage).toBe('Movement locked: audit trail in progress');
    });
  });
});