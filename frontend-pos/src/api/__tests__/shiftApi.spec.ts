// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shiftApi } from '../shiftApi';
import api from '../axios';
import type { 
  CashierShift, 
  StartShiftPayload, 
  CloseShiftPayload, 
  HandoverShiftPayload,
  MasterShift,
  User,
} from '@/types/shift';

vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('POS Shift API Service (shiftApi.ts)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] getCurrentPosShift() menembak endpoint /pos/shifts/current', async () => {
      await shiftApi.getCurrentPosShift();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/pos/shifts/current');
    });

    it('[Happy Path] startPosShift() menembak endpoint /pos/shifts/start dengan payload lengkap', async () => {
      const payload: StartShiftPayload = {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '123456'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', payload);
    });

    it('[Happy Path] closePosShift() menembak endpoint dengan ID dan payload lengkap', async () => {
      const shiftId = 123;
      const payload: CloseShiftPayload = {
        expected_balance: 1250000,
        closing_balance: 1250000,
        pin_code: '123456',
        notes: 'Shift closed normally'
      };

      await shiftApi.closePosShift(shiftId, payload);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(`/pos/shifts/${shiftId}/close`, payload);
    });

    it('[Happy Path] handoverPosShift() menembak endpoint dengan ID dan payload lengkap', async () => {
      const shiftId = 456;
      const payload: HandoverShiftPayload = {
        to_user_id: 'uuid-123',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 750000,
        notes: 'Handover to afternoon shift'
      };

      await shiftApi.handoverPosShift(shiftId, payload);

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(`/pos/shifts/${shiftId}/handover`, payload);
    });

    it('[Happy Path] getActiveMasterShifts() menembak endpoint /pos/master-shifts', async () => {
      await shiftApi.getActiveMasterShifts();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/pos/master-shifts');
    });

    it('[Happy Path] getActiveCashiers() menembak endpoint /pos/active-cashiers', async () => {
      await shiftApi.getActiveCashiers();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/pos/active-cashiers');
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =====================================================================
  describe('Equivalence Partitioning (Payload Types)', () => {
    it('[Partisi 1 - StartShiftPayload lengkap] Mengirim semua field termasuk notes', async () => {
      const payload: StartShiftPayload = {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '123456',
        notes: 'Starting morning shift'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '123456',
        notes: 'Starting morning shift'
      });
    });

    it('[Partisi 2 - StartShiftPayload minimal] Mengirim field wajib saja tanpa notes', async () => {
      const payload: StartShiftPayload = {
        shift_id: 2,
        opening_balance: 100000,
        pin_code: '654321'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 2,
        opening_balance: 100000,
        pin_code: '654321'
      });
    });

    it('[Partisi 3 - CloseShiftPayload lengkap] Mengirim semua field termasuk notes', async () => {
      const payload: CloseShiftPayload = {
        expected_balance: 1250000,
        closing_balance: 1250000,
        pin_code: '123456',
        notes: 'Balanced shift'
      };

      await shiftApi.closePosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/close', {
        expected_balance: 1250000,
        closing_balance: 1250000,
        pin_code: '123456',
        notes: 'Balanced shift'
      });
    });

    it('[Partisi 4 - CloseShiftPayload minimal] Mengirim field wajib saja tanpa notes', async () => {
      const payload: CloseShiftPayload = {
        expected_balance: 1000000,
        closing_balance: 1000000,
        pin_code: '123456'
      };

      await shiftApi.closePosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/close', {
        expected_balance: 1000000,
        closing_balance: 1000000,
        pin_code: '123456'
      });
    });

    it('[Partisi 5 - HandoverShiftPayload lengkap] Mengirim semua field termasuk notes', async () => {
      const payload: HandoverShiftPayload = {
        to_user_id: 'uuid-123',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 750000,
        notes: 'Emergency handover'
      };

      await shiftApi.handoverPosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/handover', {
        to_user_id: 'uuid-123',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 750000,
        notes: 'Emergency handover'
      });
    });

    it('[Partisi 6 - HandoverShiftPayload minimal] Mengirim field wajib saja tanpa notes', async () => {
      const payload: HandoverShiftPayload = {
        to_user_id: 'uuid-456',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 500000
      };

      await shiftApi.handoverPosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/handover', {
        to_user_id: 'uuid-456',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 500000
      });
    });
  });

  // =====================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =====================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - ID minimum] closePosShift() dengan ID 1', async () => {
      const shiftId = 1;
      const payload: CloseShiftPayload = {
        expected_balance: 100000,
        closing_balance: 100000,
        pin_code: '123456'
      };

      await shiftApi.closePosShift(shiftId, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/close', payload);
    });

    it('[BVA - ID maximum] closePosShift() dengan ID Number.MAX_SAFE_INTEGER', async () => {
      const shiftId = Number.MAX_SAFE_INTEGER;
      const payload: CloseShiftPayload = {
        expected_balance: 100000,
        closing_balance: 100000,
        pin_code: '123456'
      };

      await shiftApi.closePosShift(shiftId, payload);

      expect(api.post).toHaveBeenCalledWith(`/pos/shifts/${shiftId}/close`, payload);
    });

    it('[BVA - Opening balance 0] startPosShift() dengan opening_balance 0', async () => {
      const payload: StartShiftPayload = {
        shift_id: 1,
        opening_balance: 0,
        pin_code: '123456'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 1,
        opening_balance: 0,
        pin_code: '123456'
      });
    });

    it('[BVA - Opening balance maksimum] startPosShift() dengan nilai besar', async () => {
      const payload: StartShiftPayload = {
        shift_id: 1,
        opening_balance: 999999999,
        pin_code: '123456'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 1,
        opening_balance: 999999999,
        pin_code: '123456'
      });
    });

    it('[BVA - Amount counted 0] handoverPosShift() dengan amount_counted 0', async () => {
      const payload: HandoverShiftPayload = {
        to_user_id: 'uuid-123',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 0
      };

      await shiftApi.handoverPosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/handover', {
        to_user_id: 'uuid-123',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 0
      });
    });
  });

  // =====================================================================
  // 4. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] startPosShift() dengan notes kosong', async () => {
      const payload: StartShiftPayload = {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '123456',
        notes: ''
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '123456',
        notes: ''
      });
    });

    it('[Edge Case] closePosShift() dengan notes panjang', async () => {
      const longNotes = 'A'.repeat(500);
      const payload: CloseShiftPayload = {
        expected_balance: 1000000,
        closing_balance: 1000000,
        pin_code: '123456',
        notes: longNotes
      };

      await shiftApi.closePosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/close', {
        expected_balance: 1000000,
        closing_balance: 1000000,
        pin_code: '123456',
        notes: longNotes
      });
    });

    it('[Edge Case] handoverPosShift() dengan user_id UUID format', async () => {
      const payload: HandoverShiftPayload = {
        to_user_id: '123e4567-e89b-12d3-a456-426614174000',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 750000
      };

      await shiftApi.handoverPosShift(1, payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/1/handover', {
        to_user_id: '123e4567-e89b-12d3-a456-426614174000',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 750000
      });
    });

    it('[Corner Case] startPosShift() dengan shift_id 0', async () => {
      const payload: StartShiftPayload = {
        shift_id: 0,
        opening_balance: 500000,
        pin_code: '123456'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 0,
        opening_balance: 500000,
        pin_code: '123456'
      });
    });

    it('[Edge Case] startPosShift() dengan PIN "000000"', async () => {
      const payload: StartShiftPayload = {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '000000'
      };

      await shiftApi.startPosShift(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/shifts/start', {
        shift_id: 1,
        opening_balance: 500000,
        pin_code: '000000'
      });
    });
  });

  // =====================================================================
  // 5. RETURN VALUE TESTS
  // =====================================================================
  describe('Return Values', () => {
    it('[Happy Path] getCurrentPosShift() mengembalikan promise dari api.get', async () => {
      const mockResponse = { data: { data: { id: 1, status: 'open' } as CashierShift } };
      (api.get as any).mockResolvedValue(mockResponse);
      
      const result = await shiftApi.getCurrentPosShift();
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] startPosShift() mengembalikan promise dari api.post', async () => {
      const mockResponse = { data: { data: { id: 1, status: 'open' } as CashierShift } };
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await shiftApi.startPosShift({ 
        shift_id: 1, 
        opening_balance: 500000,
        pin_code: '123456'
      });
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] closePosShift() mengembalikan promise dari api.post', async () => {
      const mockResponse = { data: { data: { id: 1, status: 'closed' } as CashierShift } };
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await shiftApi.closePosShift(1, { 
        expected_balance: 1000000,
        closing_balance: 1000000,
        pin_code: '123456'
      });
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] handoverPosShift() mengembalikan promise dari api.post', async () => {
      const mockResponse = { data: { data: { id: 1, status: 'open' } as CashierShift } };
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await shiftApi.handoverPosShift(1, { 
        to_user_id: 'uuid-123',
        to_user_pin: '654321',
        pin_code: '123456',
        amount_counted: 750000
      });
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] getActiveMasterShifts() mengembalikan promise dari api.get', async () => {
      const mockShifts: MasterShift[] = [
        { id: 1, name: 'Morning', start_time: '08:00', end_time: '16:00', is_active: true }
      ];
      const mockResponse = { data: { data: mockShifts } };
      (api.get as any).mockResolvedValue(mockResponse);
      
      const result = await shiftApi.getActiveMasterShifts();
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] getActiveCashiers() mengembalikan promise dari api.get', async () => {
      const mockUsers: User[] = [
        { id: 'uuid-1', name: 'John', username: 'john' }
      ];
      const mockResponse = { data: { data: mockUsers } };
      (api.get as any).mockResolvedValue(mockResponse);
      
      const result = await shiftApi.getActiveCashiers();
      
      expect(result).toEqual(mockResponse);
    });
  });

  // =====================================================================
  // 6. CONSISTENCY TESTS
  // =====================================================================
  describe('Consistency Tests', () => {
    it('Semua endpoint GET dipanggil dengan api.get', async () => {
      await shiftApi.getCurrentPosShift();
      await shiftApi.getActiveMasterShifts();
      await shiftApi.getActiveCashiers();

      expect(api.get).toHaveBeenCalledTimes(3);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('Semua endpoint POST dipanggil dengan api.post', async () => {
      await shiftApi.startPosShift({ shift_id: 1, opening_balance: 500000, pin_code: '123456' });
      await shiftApi.closePosShift(1, { expected_balance: 1000000, closing_balance: 1000000, pin_code: '123456' });
      await shiftApi.handoverPosShift(1, { to_user_id: 'uuid-123', to_user_pin: '654321', pin_code: '123456', amount_counted: 750000 });

      expect(api.post).toHaveBeenCalledTimes(3);
      expect(api.get).not.toHaveBeenCalled();
    });

    it('Semua endpoint menggunakan prefix /pos/', async () => {
      await shiftApi.getCurrentPosShift();
      await shiftApi.startPosShift({ shift_id: 1, opening_balance: 500000, pin_code: '123456' });
      await shiftApi.closePosShift(1, { expected_balance: 1000000, closing_balance: 1000000, pin_code: '123456' });
      await shiftApi.handoverPosShift(1, { to_user_id: 'uuid-123', to_user_pin: '654321', pin_code: '123456', amount_counted: 750000 });
      await shiftApi.getActiveMasterShifts();
      await shiftApi.getActiveCashiers();

      const getCalls = (api.get as any).mock.calls;
      const postCalls = (api.post as any).mock.calls;

      getCalls.forEach((call: any[]) => {
        expect(call[0]).toMatch(/^\/pos\//);
      });

      postCalls.forEach((call: any[]) => {
        expect(call[0]).toMatch(/^\/pos\//);
      });
    });
  });
});