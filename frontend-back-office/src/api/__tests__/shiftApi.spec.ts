import { describe, it, expect, beforeEach, vi } from 'vitest';
import { shiftApi } from '../shiftApi';
import api from '../axios';
import type { MasterShift, ForceClosePayload } from '@/types/shift';

vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('shiftApi Service (Fokus Logika Parameter & API Wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('Happy Path: getCashierShifts() memanggil endpoint GET dengan params lengkap', () => {
      const params = { status: 'open', per_page: 15, page: 1 };
      
      shiftApi.getCashierShifts(params);

      expect(api.get).toHaveBeenCalledWith('/backoffice/cashier-shifts', { params });
    });

    it('Happy Path: getCashierShifts() tanpa params otomatis menggunakan object kosong default {}', () => {
      shiftApi.getCashierShifts();

      expect(api.get).toHaveBeenCalledWith('/backoffice/cashier-shifts', { params: {} });
    });

    it('Happy Path: forceCloseShift() memanggil endpoint POST dengan ID dan payload yang benar', () => {
      const id = 123;
      const payload: ForceClosePayload = {
        expected_balance: 500000,
        closing_balance: 480000,
        notes: 'Cashier left without closing'
      };
      
      shiftApi.forceCloseShift(id, payload);

      expect(api.post).toHaveBeenCalledWith(`/backoffice/cashier-shifts/${id}/force-close`, payload);
    });

    it('Happy Path: getShifts() memanggil endpoint GET tanpa params', () => {
      shiftApi.getShifts();

      expect(api.get).toHaveBeenCalledWith('/backoffice/shifts');
    });

    it('Happy Path: getActiveShifts() memanggil endpoint GET untuk active shifts', () => {
      shiftApi.getActiveShifts();

      expect(api.get).toHaveBeenCalledWith('/backoffice/shifts/active');
    });

    it('Happy Path: createShift() memanggil endpoint POST dengan payload yang benar', () => {
      const payload: Partial<MasterShift> = {
        name: 'Morning Shift',
        start_time: '08:00',
        end_time: '16:00',
        is_active: true
      };
      
      shiftApi.createShift(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/shifts', payload);
    });

    it('Happy Path: updateShift() memanggil endpoint PUT dengan ID dan payload', () => {
      const id = 1;
      const payload: Partial<MasterShift> = {
        name: 'Updated Shift',
        is_active: false
      };
      
      shiftApi.updateShift(id, payload);

      expect(api.put).toHaveBeenCalledWith(`/backoffice/shifts/${id}`, payload);
    });

    it('Happy Path: deleteShift() memanggil endpoint DELETE dengan ID', () => {
      const id = 1;
      
      shiftApi.deleteShift(id);

      expect(api.delete).toHaveBeenCalledWith(`/backoffice/shifts/${id}`);
    });

    it('Negative Path: Error dari axios langsung diteruskan (rejection tidak ditelan oleh service)', async () => {
      const mockError = new Error('Network Error');
      vi.mocked(api.delete).mockRejectedValueOnce(mockError);

      await expect(shiftApi.deleteShift(1)).rejects.toThrow('Network Error');
    });

    it('Negative Path: forceCloseShift() meneruskan error dari axios', async () => {
      const mockError = new Error('Conflict: Shift already closed');
      vi.mocked(api.post).mockRejectedValueOnce(mockError);

      const payload: ForceClosePayload = {
        expected_balance: 500000,
        notes: 'Test force close'
      };

      await expect(shiftApi.forceCloseShift(123, payload)).rejects.toThrow('Conflict: Shift already closed');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('Partisi 1 (Tanpa Parameter): getCashierShifts() otomatis menggunakan object kosong default {}', () => {
      shiftApi.getCashierShifts();

      expect(api.get).toHaveBeenCalledWith('/backoffice/cashier-shifts', { params: {} });
    });

    it('Partisi 2 (Dengan Parameter Penuh): getCashierShifts() meneruskan semua filter yang diberikan', () => {
      const filters = { 
        status: 'closed', 
        user_id: 'uuid-123', 
        date_from: '2024-01-01', 
        date_to: '2024-01-15',
        per_page: 20 
      };
      
      shiftApi.getCashierShifts(filters);

      expect(api.get).toHaveBeenCalledWith('/backoffice/cashier-shifts', { params: filters });
    });

    it('Partisi 3 (Payload Lengkap): createShift() menerima semua field MasterShift', () => {
      const fullPayload: Partial<MasterShift> = {
        name: 'Full Shift',
        start_time: '08:00',
        end_time: '16:00',
        is_active: true
      };
      
      shiftApi.createShift(fullPayload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/shifts', fullPayload);
    });

    it('Partisi 4 (Payload Parsial): updateShift() berhasil menerima hanya sebagian field (Partial)', () => {
      const partialPayload = { is_active: false };
      
      shiftApi.updateShift(1, partialPayload);

      expect(api.put).toHaveBeenCalledWith('/backoffice/shifts/1', partialPayload);
    });

    it('Partisi 5 (ForceClose Payload Minimal): forceCloseShift() menerima payload hanya dengan field wajib', () => {
      const minimalPayload: ForceClosePayload = {
        expected_balance: 500000,
        notes: 'Emergency force close'
      };
      
      shiftApi.forceCloseShift(123, minimalPayload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/cashier-shifts/123/force-close', minimalPayload);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('Batas Bawah ID (0): forceCloseShift() dengan ID 0', () => {
      const payload: ForceClosePayload = {
        expected_balance: 0,
        notes: 'Test with ID 0'
      };
      
      shiftApi.forceCloseShift(0, payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/cashier-shifts/0/force-close', payload);
    });

    it('Batas Bawah ID (0): updateShift() dengan ID 0', () => {
      shiftApi.updateShift(0, { name: 'Test' });

      expect(api.put).toHaveBeenCalledWith('/backoffice/shifts/0', { name: 'Test' });
    });

    it('Batas Bawah ID (0): deleteShift() dengan ID 0', () => {
      shiftApi.deleteShift(0);

      expect(api.delete).toHaveBeenCalledWith('/backoffice/shifts/0');
    });

    it('Batas Bawah Payload: createShift() dengan object payload kosong {}', () => {
      shiftApi.createShift({});

      expect(api.post).toHaveBeenCalledWith('/backoffice/shifts', {});
    });

    it('Batas Atas ID (Number.MAX_SAFE_INTEGER): getCashierShifts() dengan ID besar', () => {
      const maxId = Number.MAX_SAFE_INTEGER;
      
      shiftApi.forceCloseShift(maxId, { expected_balance: 999999, notes: 'Max ID test' });

      expect(api.post).toHaveBeenCalledWith(
        `/backoffice/cashier-shifts/${maxId}/force-close`, 
        { expected_balance: 999999, notes: 'Max ID test' }
      );
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('Edge Case: URL terangkai dengan benar meskipun ID mengandung karakter aneh', () => {
      const weirdId = 123; // Backend expects integer, test with number
      
      shiftApi.deleteShift(weirdId);

      expect(api.delete).toHaveBeenCalledWith('/backoffice/shifts/123');
    });

    it('Corner Case: getCashierShifts() menerima nilai undefined pada properti filternya', () => {
      const cornerFilters = { status: undefined, date: '2024-01-15' };
      
      shiftApi.getCashierShifts(cornerFilters as any);

      expect(api.get).toHaveBeenCalledWith('/backoffice/cashier-shifts', { params: cornerFilters });
    });

    it('Corner Case: createShift() dengan payload yang mengandung null', () => {
      const payload = { name: null, start_time: '08:00' } as any;
      
      shiftApi.createShift(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/shifts', payload);
    });

    it('Corner Case: forceCloseShift() dengan closing_balance sama dengan expected_balance', () => {
      const payload: ForceClosePayload = {
        expected_balance: 500000,
        closing_balance: 500000,
        notes: 'Balance match'
      };
      
      shiftApi.forceCloseShift(123, payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/cashier-shifts/123/force-close', payload);
    });

    it('Corner Case: forceCloseShift() dengan closing_balance 0 (falsy value)', () => {
      const payload: ForceClosePayload = {
        expected_balance: 500000,
        closing_balance: 0,
        notes: 'Zero closing balance'
      };
      
      shiftApi.forceCloseShift(123, payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/cashier-shifts/123/force-close', payload);
    });

    it('Corner Case: getCashierShifts() dengan params empty string', () => {
      const emptyParams = { status: '', date: '' };
      
      shiftApi.getCashierShifts(emptyParams);

      expect(api.get).toHaveBeenCalledWith('/backoffice/cashier-shifts', { params: emptyParams });
    });
  });
});