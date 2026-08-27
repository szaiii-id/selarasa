import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShiftStore } from '../shiftStore';
import { shiftApi } from '@/api/shiftApi';
import type { MasterShift, ForceClosePayload } from '@/types/shift';

vi.mock('../../api/shiftApi', () => ({
  shiftApi: {
    getCashierShifts: vi.fn(),
    forceCloseShift: vi.fn(),
    getShifts: vi.fn(),
    getActiveShifts: vi.fn(),
    createShift: vi.fn(),
    updateShift: vi.fn(),
    deleteShift: vi.fn(),
  },
}));

describe('useShiftStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] fetchMasterShifts() berhasil mengambil data dan mengisi state masterShifts', async () => {
      const store = useShiftStore();
      const mockShifts: MasterShift[] = [
        { id: 1, name: 'Morning Shift', start_time: '08:00:00', end_time: '16:00:00', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' }
      ];

      vi.mocked(shiftApi.getShifts).mockResolvedValueOnce({
        data: { data: mockShifts }
      } as any);

      const success = await store.fetchMasterShifts();

      expect(success).toBe(true);
      expect(store.masterShifts).toEqual(mockShifts);
      expect(store.errorMessage).toBeNull();
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] fetchCashierShifts() berhasil mengambil data, mengisi state shiftHistory, dan set pagination', async () => {
      const store = useShiftStore();
      const mockShifts = [{ id: 1, user_id: 'uuid-1', shift_id: 1, opening_balance: 500000, status: 'open' }];
      const mockMeta = { current_page: 2, last_page: 5, per_page: 15, total: 50 };

      vi.mocked(shiftApi.getCashierShifts).mockResolvedValueOnce({
        data: { data: mockShifts, meta: mockMeta }
      } as any);

      const success = await store.fetchCashierShifts({ page: 2 });

      expect(success).toBe(true);
      expect(store.shiftHistory).toEqual(mockShifts);
      expect(store.pagination.current_page).toBe(2);
      expect(store.pagination.total).toBe(50);
      expect(store.errorMessage).toBeNull();
    });

    it('[Happy Path] forceCloseShift() memanggil API dan melakukan refetch pada halaman aktif', async () => {
      const store = useShiftStore();
      const payload: ForceClosePayload = {
        expected_balance: 500000,
        closing_balance: 480000,
        notes: 'Force close test'
      };

      store.pagination.current_page = 3;

      vi.mocked(shiftApi.forceCloseShift).mockResolvedValueOnce({} as any);
      vi.mocked(shiftApi.getCashierShifts).mockResolvedValueOnce({
        data: { data: [], meta: {} }
      } as any);

      const success = await store.forceCloseShift(123, payload);

      expect(success).toBe(true);
      expect(shiftApi.forceCloseShift).toHaveBeenCalledWith(123, payload);
      expect(shiftApi.getCashierShifts).toHaveBeenCalledWith({ per_page: 15, page: 3 });
    });

    it('[Negative Path] deleteMasterShift() mengembalikan false dan mengisi errorMessage saat API gagal', async () => {
      const store = useShiftStore();
      
      vi.mocked(shiftApi.deleteShift).mockRejectedValueOnce({
        response: { data: { message: 'Cannot delete this shift schedule because it is associated with existing cashier session records.' } }
      });

      const success = await store.deleteMasterShift(1);

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Cannot delete this shift schedule because it is associated with existing cashier session records.');
      expect(shiftApi.getShifts).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Error Handling)
  // =========================================================================
  describe('Equivalence Partitioning (Error Handling)', () => {
    it('[Invalid Input Partition - 422] memilah HTTP 422 ke validationErrors dan mengosongkan errorMessage', async () => {
      const store = useShiftStore();
      const mockErrors = { name: ['The name has already been taken.'] };

      vi.mocked(shiftApi.createShift).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } }
      });

      const success = await store.createMasterShift({ name: 'Morning Shift' });

      expect(success).toBe(false);
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull();
    });

    it('[Forbidden/Conflict Partition - 409] memilah HTTP 409, mengosongkan validationErrors, dan mengisi errorMessage', async () => {
      const store = useShiftStore();
      store.validationErrors = { old_error: ['test'] };

      vi.mocked(shiftApi.forceCloseShift).mockRejectedValueOnce({
        response: { status: 409, data: { message: 'Shift session is already closed or not found.' } }
      });

      await store.forceCloseShift(1, { expected_balance: 500000, notes: 'Test' });

      expect(store.errorMessage).toBe('Shift session is already closed or not found.');
      expect(store.validationErrors).toEqual({});
    });

    it('[Network Issue Partition] mendeteksi timeout (ECONNABORTED) dan menampilkan pesan fallback jaringan', async () => {
      const store = useShiftStore();

      vi.mocked(shiftApi.getShifts).mockRejectedValueOnce({
        code: 'ECONNABORTED'
      });

      await store.fetchMasterShifts();

      expect(store.errorMessage).toBe('Slow network connection. Please check your internet and try again.');
    });

    it('[Error with Message] menggunakan pesan dari response body jika tersedia', async () => {
      const store = useShiftStore();

      vi.mocked(shiftApi.getShifts).mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Internal Server Error' } }
      });

      await store.fetchMasterShifts();

      expect(store.errorMessage).toBe('Internal Server Error');
    });

    it('[Error without Message] menggunakan default message jika response body kosong', async () => {
      const store = useShiftStore();

      vi.mocked(shiftApi.deleteShift).mockRejectedValueOnce({
        response: { status: 500, data: {} }
      });

      await store.deleteMasterShift(1);

      expect(store.errorMessage).toBe('Failed to delete master shift.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Clear Error One by One] clearError() menghapus kunci objek satu per satu hingga habis', () => {
      const store = useShiftStore();
      store.validationErrors = { name: ['Err1'], start_time: ['Err2'] };

      store.clearError('name');
      expect(store.validationErrors.name).toBeUndefined();
      expect(store.validationErrors.start_time).toBeDefined();
      expect(Object.keys(store.validationErrors).length).toBe(1);

      store.clearError('start_time');
      expect(Object.keys(store.validationErrors).length).toBe(0);
    });

    it('[BVA - Invalid Field] clearError() tidak mengubah state jika field yang dihapus tidak ada', () => {
      const store = useShiftStore();
      store.validationErrors = { name: ['Required'] };
      
      store.clearError('end_time');

      expect(Object.keys(store.validationErrors).length).toBe(1);
      expect(store.validationErrors.name).toBeDefined();
    });

    it('[BVA - Fallback Pagination Kosong] fetchCashierShifts() menggunakan nilai default jika meta kosong', async () => {
      const store = useShiftStore();
      
      vi.mocked(shiftApi.getCashierShifts).mockResolvedValueOnce({
        data: { data: [] }
      } as any);

      await store.fetchCashierShifts();

      expect(store.pagination.current_page).toBe(1);
      expect(store.pagination.last_page).toBe(1);
      expect(store.pagination.total).toBe(0);
    });

    it('[BVA - Fallback Response Data Kosong] fetchMasterShifts() mengisi array kosong jika response.data kosong', async () => {
      const store = useShiftStore();
      
      vi.mocked(shiftApi.getShifts).mockResolvedValueOnce({
        data: {}
      } as any);

      await store.fetchMasterShifts();

      expect(store.masterShifts).toEqual([]);
    });

    it('[BVA - Response Format Alternatif] fetchMasterShifts() mendukung response langsung tanpa wrapper data', async () => {
      const store = useShiftStore();
      const mockShifts = [{ id: 1, name: 'Morning', start_time: '08:00:00', end_time: '16:00:00', is_active: true }];
      
      vi.mocked(shiftApi.getShifts).mockResolvedValueOnce({
        data: mockShifts
      } as any);

      await store.fetchMasterShifts();

      expect(store.masterShifts).toEqual(mockShifts);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Corner Case - Pagination Memory] forceCloseShift() refetch pada current_page aktif, BUKAN page 1', async () => {
      const store = useShiftStore();
      
      store.pagination.current_page = 4;
      store.pagination.per_page = 15;

      vi.mocked(shiftApi.forceCloseShift).mockResolvedValueOnce({} as any);
      vi.mocked(shiftApi.getCashierShifts).mockResolvedValueOnce({ data: { data: [] } } as any);

      await store.forceCloseShift(1, { expected_balance: 500000, notes: 'Test' });

      expect(shiftApi.getCashierShifts).toHaveBeenCalledWith({ per_page: 15, page: 4 });
    });

    it('[Corner Case - Fetch with Custom Per Page] fetchCashierShifts() menggunakan per_page dari state', async () => {
      const store = useShiftStore();
      store.pagination.per_page = 25;

      vi.mocked(shiftApi.getCashierShifts).mockResolvedValueOnce({
        data: { data: [], meta: { per_page: 25 } }
      } as any);

      await store.fetchCashierShifts();

      expect(shiftApi.getCashierShifts).toHaveBeenCalledWith({ per_page: 25 });
      expect(store.pagination.per_page).toBe(25);
    });

    it('[Edge Case - Params Override] fetchCashierShifts() params user override per_page default', async () => {
      const store = useShiftStore();
      store.pagination.per_page = 15;

      vi.mocked(shiftApi.getCashierShifts).mockResolvedValueOnce({
        data: { data: [], meta: {} }
      } as any);

      await store.fetchCashierShifts({ per_page: 50, status: 'open' });

      expect(shiftApi.getCashierShifts).toHaveBeenCalledWith({ per_page: 50, status: 'open' });
    });

    it('[Edge Case - isLoading State] isLoading berubah true saat request dan false setelah selesai', async () => {
      const store = useShiftStore();
      
      let loadingDuringRequest = false;
      
      vi.mocked(shiftApi.getShifts).mockImplementationOnce(async () => {
        loadingDuringRequest = store.isLoading;
        return { data: { data: [] } } as any;
      });

      await store.fetchMasterShifts();

      expect(loadingDuringRequest).toBe(true);
      expect(store.isLoading).toBe(false);
    });

    it('[Edge Case - Error State Reset] errorMessage di-reset ke null saat request baru dimulai', async () => {
      const store = useShiftStore();
      store.errorMessage = 'Previous error';

      vi.mocked(shiftApi.getShifts).mockResolvedValueOnce({
        data: { data: [] }
      } as any);

      await store.fetchMasterShifts();

      expect(store.errorMessage).toBeNull();
    });

    it('[Edge Case - Validation Error Reset] validationErrors di-reset saat createMasterShift dipanggil', async () => {
      const store = useShiftStore();
      store.validationErrors = { name: ['Old error'] };

      vi.mocked(shiftApi.createShift).mockResolvedValueOnce({} as any);
      vi.mocked(shiftApi.getShifts).mockResolvedValueOnce({ data: { data: [] } } as any);

      await store.createMasterShift({ name: 'New Shift' });

      expect(store.validationErrors).toEqual({});
    });
  });
});