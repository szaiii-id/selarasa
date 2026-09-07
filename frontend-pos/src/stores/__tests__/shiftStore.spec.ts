// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import { useShiftStore } from '../shiftStore';
import { shiftApi } from '../../api/shiftApi';
import { useAuthStore } from '../authStore';
import type { CashierShift, MasterShift, User } from '../../types/shift';

// =====================================================================
// SETUP & MOCKING
// =====================================================================
vi.mock('../../api/shiftApi', () => ({
  shiftApi: {
    getCurrentPosShift: vi.fn(),
    startPosShift: vi.fn(),
    closePosShift: vi.fn(),
    handoverPosShift: vi.fn(),
    getActiveMasterShifts: vi.fn(),
    getActiveCashiers: vi.fn(),
  },
}));

vi.mock('../authStore', () => ({
  useAuthStore: vi.fn(() => ({
    logout: vi.fn(),
  })),
}));

// ✅ MOCK useNow dari @vueuse/core
vi.mock('@vueuse/core', () => ({
  useNow: vi.fn(() => {
    // Return ref dengan waktu yang fixed (jam 10:00)
    return ref(new Date('2026-09-07T10:00:00'));
  }),
}));

// Mock alert
global.alert = vi.fn();

// Helper untuk membuat mock data
const createMockCashierShift = (overrides: Partial<CashierShift> = {}): CashierShift => ({
  id: 1,
  user_id: 'uuid-1',
  shift_id: 1,
  opening_balance: 500000,
  closing_balance: null,
  expected_balance: null,
  variance: null,
  status: 'open',
  notes: null,
  started_at: '2026-09-07T08:00:00+00:00',
  ended_at: null,
  ...overrides,
});

const createMockMasterShift = (overrides: Partial<MasterShift> = {}): MasterShift => ({
  id: 1,
  name: 'Morning Shift',
  start_time: '08:00:00',
  end_time: '16:00:00',
  is_active: true,
  ...overrides,
});

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  name: 'John Doe',
  username: 'johndoe',
  role: 'cashier',
  is_active: true,
  ...overrides,
});

describe('Shift Store (useShiftStore)', () => {
  let store: ReturnType<typeof useShiftStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useShiftStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path (fetchCurrentShift)', () => {
    it('[Happy Path] Berhasil fetch current shift', async () => {
      const mockShift = createMockCashierShift();
      vi.mocked(shiftApi.getCurrentPosShift).mockResolvedValue({
        data: { data: mockShift }
      } as any);

      const result = await store.fetchCurrentShift();

      expect(result).toBe(true);
      expect(store.currentShift).toEqual(mockShift);
      expect(store.isCheckingSession).toBe(false);
      expect(store.errorMessage).toBeNull();
    });

    it('[Negative Path] Gagal fetch current shift dengan 404', async () => {
      const mock404Error = { response: { status: 404 } };
      vi.mocked(shiftApi.getCurrentPosShift).mockRejectedValueOnce(mock404Error);

      const result = await store.fetchCurrentShift();

      expect(result).toBe(false);
      expect(store.currentShift).toBeNull();
      expect(store.isCheckingSession).toBe(false);
    });

    it('[Edge Case - Force Closed] Menampilkan alert dan logout jika shift di-force close', async () => {
      store.currentShift = createMockCashierShift();
      
      const mock404Error = { response: { status: 404 } };
      vi.mocked(shiftApi.getCurrentPosShift).mockRejectedValueOnce(mock404Error);

      const mockLogout = vi.fn();
      vi.mocked(useAuthStore).mockReturnValue({ logout: mockLogout } as any);

      await store.fetchCurrentShift();

      expect(global.alert).toHaveBeenCalled();
      expect(mockLogout).toHaveBeenCalled();
      expect(store.currentShift).toBeNull();
    });

    it('[Negative Path] Gagal fetch dengan error selain 404', async () => {
      const mock500Error = { response: { status: 500, data: { message: 'Server error' } } };
      vi.mocked(shiftApi.getCurrentPosShift).mockRejectedValueOnce(mock500Error);

      const result = await store.fetchCurrentShift();

      expect(result).toBe(false);
      expect(store.errorMessage).toBe('Server error');
    });
  });

  // =====================================================================
  // 2. HAPPY & NEGATIVE PATH (Master Shifts & Cashiers)
  // =====================================================================
  describe('Happy & Negative Path (fetchMasterShifts & fetchActiveCashiers)', () => {
    it('[Happy Path] Berhasil fetch master shifts', async () => {
      const mockShifts = [createMockMasterShift()];
      vi.mocked(shiftApi.getActiveMasterShifts).mockResolvedValue({
        data: { data: mockShifts }
      } as any);

      const result = await store.fetchMasterShifts();

      expect(result).toBe(true);
      expect(store.masterShifts).toEqual(mockShifts);
    });

    it('[Negative Path] Gagal fetch master shifts', async () => {
      const mockError = { response: { status: 500, data: { message: 'Failed' } } };
      vi.mocked(shiftApi.getActiveMasterShifts).mockRejectedValueOnce(mockError);

      const result = await store.fetchMasterShifts();

      expect(result).toBe(false);
      expect(store.errorMessage).toBe('Failed');
    });

    it('[Happy Path] Berhasil fetch active cashiers', async () => {
      const mockUsers = [createMockUser()];
      vi.mocked(shiftApi.getActiveCashiers).mockResolvedValue({
        data: { data: mockUsers }
      } as any);

      const result = await store.fetchActiveCashiers();

      expect(result).toBe(true);
      expect(store.activeCashiers).toEqual(mockUsers);
    });

    it('[Negative Path] Gagal fetch active cashiers', async () => {
      const mockError = { response: { status: 422, data: { errors: { field: ['Error'] } } } };
      vi.mocked(shiftApi.getActiveCashiers).mockRejectedValueOnce(mockError);

      const result = await store.fetchActiveCashiers();

      expect(result).toBe(false);
      expect(store.validationErrors).toEqual({ field: ['Error'] });
    });
  });

  // =====================================================================
  // 3. HAPPY & NEGATIVE PATH (Start, Close, Handover, End)
  // =====================================================================
  describe('Happy & Negative Path (Shift Operations)', () => {
    it('[Happy Path] Berhasil start shift', async () => {
      const mockShift = createMockCashierShift();
      const payload = { shift_id: 1, opening_balance: 500000, pin_code: '123456' };
      
      vi.mocked(shiftApi.startPosShift).mockResolvedValue({
        data: { data: mockShift }
      } as any);

      const result = await store.startShift(payload);

      expect(result).toBe(true);
      expect(store.currentShift).toEqual(mockShift);
      expect(store.isLoading).toBe(false);
      expect(store.hasUsedGracePeriod).toBe(false);
      expect(store.isFinishingOvertimeTransaction).toBe(false);
    });

    it('[Negative Path] Gagal start shift', async () => {
      const payload = { shift_id: 1, opening_balance: 500000, pin_code: '123456' };
      const mockError = { response: { status: 500, data: { message: 'Failed to start' } } };
      
      vi.mocked(shiftApi.startPosShift).mockRejectedValueOnce(mockError);

      const result = await store.startShift(payload);

      expect(result).toBe(false);
      expect(store.errorMessage).toBe('Failed to start');
      expect(store.isLoading).toBe(false);
    });

    it('[Happy Path] Berhasil close shift', async () => {
      store.currentShift = createMockCashierShift();
      const payload = { expected_balance: 1000000, closing_balance: 1000000, pin_code: '123456' };
      
      vi.mocked(shiftApi.closePosShift).mockResolvedValue({} as any);

      const result = await store.closeShift(payload);

      expect(result).toBe(true);
      expect(store.currentShift).toBeNull();
    });

    it('[Negative Path] Gagal close shift jika tidak ada current shift', async () => {
      const payload = { expected_balance: 1000000, closing_balance: 1000000, pin_code: '123456' };

      const result = await store.closeShift(payload);

      expect(result).toBe(false);
      expect(shiftApi.closePosShift).not.toHaveBeenCalled();
    });

    it('[Happy Path] Berhasil handover shift', async () => {
      store.currentShift = createMockCashierShift();
      const mockNewShift = createMockCashierShift({ id: 2, user_id: 'uuid-2' });
      const payload = { 
        to_user_id: 'uuid-2', 
        to_user_pin: '654321', 
        pin_code: '123456', 
        amount_counted: 750000 
      };
      
      vi.mocked(shiftApi.handoverPosShift).mockResolvedValue({
        data: { data: mockNewShift }
      } as any);

      const result = await store.handoverShift(payload);

      expect(result).toBe(true);
      expect(store.currentShift).toEqual(mockNewShift);
      expect(store.hasUsedGracePeriod).toBe(false);
    });

    it('[Negative Path] Gagal handover shift jika tidak ada current shift', async () => {
      const payload = { 
        to_user_id: 'uuid-2', 
        to_user_pin: '654321', 
        pin_code: '123456', 
        amount_counted: 750000 
      };

      const result = await store.handoverShift(payload);

      expect(result).toBe(false);
      expect(shiftApi.handoverPosShift).not.toHaveBeenCalled();
    });

    it('[Happy Path] Berhasil end shift', async () => {
      store.currentShift = createMockCashierShift();

      const result = await store.endShift();

      expect(result).toBe(true);
      expect(store.currentShift).toBeNull();
      expect(store.isLoading).toBe(false);
    });
  });

  // =====================================================================
  // 4. COMPUTED PROPERTIES
  // =====================================================================
  describe('Computed Properties', () => {
    it('activeMasterShift mengembalikan shift yang sesuai', () => {
      const mockShift = createMockMasterShift();
      store.masterShifts = [mockShift];
      store.currentShift = createMockCashierShift({ shift_id: 1 });

      expect(store.activeMasterShift).toEqual(mockShift);
    });

    it('activeMasterShift mengembalikan null jika tidak ada current shift', () => {
      store.masterShifts = [createMockMasterShift()];
      store.currentShift = null;

      expect(store.activeMasterShift).toBeNull();
    });

    it('activeMasterShift menggunakan shift dari currentShift jika masterShifts kosong', () => {
      const mockShift = createMockMasterShift();
      store.masterShifts = [];
      store.currentShift = createMockCashierShift({ shift: mockShift });

      expect(store.activeMasterShift).toEqual(mockShift);
    });

    it('shiftStatus mengembalikan safe jika tidak ada shift', () => {
      store.masterShifts = [];
      store.currentShift = null;

      expect(store.shiftStatus).toBe('safe');
    });

    it('shiftStatus mengembalikan overtime jika shift sudah berakhir', () => {
      // useNow di-mock ke jam 10:00
      // Shift end_time 08:00, jadi sudah lewat 2 jam
      const mockShift = createMockMasterShift({ 
        start_time: '06:00:00',
        end_time: '08:00:00'
      });
      
      store.masterShifts = [mockShift];
      store.currentShift = createMockCashierShift({ 
        shift_id: 1,
        started_at: '2026-09-07T06:00:00+00:00'
      });
      store.isFinishingOvertimeTransaction = false;

      expect(store.shiftStatus).toBe('overtime');
      expect(store.timeRemainingText).toBe('Shift Ended');
    });

    it('shiftStatus mengembalikan grace_period saat finishing overtime', () => {
      const mockShift = createMockMasterShift({ 
        start_time: '06:00:00',
        end_time: '08:00:00'
      });
      
      store.masterShifts = [mockShift];
      store.currentShift = createMockCashierShift({ shift_id: 1 });
      store.isFinishingOvertimeTransaction = true;

      expect(store.shiftStatus).toBe('grace_period');
    });

    it('shiftStatus mengembalikan warning jika remainingMinutes <= 15', () => {
      // useNow di-mock ke jam 10:00
      // Shift end_time 10:15, sisa 15 menit
      const mockShift = createMockMasterShift({ 
        start_time: '08:00:00',
        end_time: '10:15:00'
      });
      
      store.masterShifts = [mockShift];
      store.currentShift = createMockCashierShift({ shift_id: 1 });
      store.isFinishingOvertimeTransaction = false;

      expect(store.shiftStatus).toBe('warning');
    });

    it('timeRemainingText menampilkan format jam dan menit', () => {
      const mockShift = createMockMasterShift({ 
        start_time: '08:00:00',
        end_time: '12:00:00'
      });
      store.masterShifts = [mockShift];
      store.currentShift = createMockCashierShift({ shift_id: 1 });

      expect(store.timeRemainingText).toContain('left');
    });
  });

  // =====================================================================
  // 5. ERROR HANDLING
  // =====================================================================
  describe('Error Handling', () => {
    it('handleApiError menangani 422 validation errors', async () => {
      const mockError = { 
        response: { 
          status: 422, 
          data: { errors: { pin_code: ['PIN is required'] } } 
        } 
      };
      vi.mocked(shiftApi.getActiveMasterShifts).mockRejectedValueOnce(mockError);

      await store.fetchMasterShifts();

      expect(store.validationErrors).toEqual({ pin_code: ['PIN is required'] });
      expect(store.errorMessage).toBeNull();
    });

    it('handleApiError menangani error dengan message', async () => {
      const mockError = { 
        response: { 
          status: 500, 
          data: { message: 'Server error' } 
        } 
      };
      vi.mocked(shiftApi.getActiveMasterShifts).mockRejectedValueOnce(mockError);

      await store.fetchMasterShifts();

      expect(store.errorMessage).toBe('Server error');
    });

    it('handleApiError menangani error tanpa response', async () => {
      const mockError = new Error('Network Error');
      vi.mocked(shiftApi.getActiveMasterShifts).mockRejectedValueOnce(mockError);

      await store.fetchMasterShifts();

      expect(store.errorMessage).toBe('Failed to fetch master shifts.');
    });

    it('clearErrors mereset error state', () => {
      store.errorMessage = 'Error';
      store.validationErrors = { field: ['Error'] };

      store.clearErrors();

      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
    });
  });

  // =====================================================================
  // 6. STATE TRANSITION TESTS
  // =====================================================================
  describe('State Transition Tests', () => {
    it('isLoading berubah true selama operasi dan false setelah selesai', async () => {
      const mockShift = createMockCashierShift();
      const payload = { shift_id: 1, opening_balance: 500000, pin_code: '123456' };
      
      vi.mocked(shiftApi.startPosShift).mockImplementationOnce(async () => {
        expect(store.isLoading).toBe(true);
        return { data: { data: mockShift } } as any;
      });

      await store.startShift(payload);

      expect(store.isLoading).toBe(false);
    });

    it('isCheckingSession berubah true selama fetchCurrentShift', async () => {
      const mockShift = createMockCashierShift();
      
      vi.mocked(shiftApi.getCurrentPosShift).mockImplementationOnce(async () => {
        expect(store.isCheckingSession).toBe(true);
        return { data: { data: mockShift } } as any;
      });

      await store.fetchCurrentShift();

      expect(store.isCheckingSession).toBe(false);
    });

    it('hasUsedGracePeriod direset saat start shift', async () => {
      store.hasUsedGracePeriod = true;
      store.isFinishingOvertimeTransaction = true;

      const mockShift = createMockCashierShift();
      const payload = { shift_id: 1, opening_balance: 500000, pin_code: '123456' };
      
      vi.mocked(shiftApi.startPosShift).mockResolvedValue({
        data: { data: mockShift }
      } as any);

      await store.startShift(payload);

      expect(store.hasUsedGracePeriod).toBe(false);
      expect(store.isFinishingOvertimeTransaction).toBe(false);
    });
  });
});