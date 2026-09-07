// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from '../sessionStore';
import { authApi } from '../../api/authApi';

// =====================================================================
// SETUP & MOCKING
// =====================================================================
vi.mock('../../api/authApi', () => ({
  authApi: {
    ensureCsrfCookie: vi.fn(),
    refreshCsrfCookie: vi.fn(),
    verifyPin: vi.fn(),
  },
}));

describe('Session Store (useSessionStore)', () => {
  let store: ReturnType<typeof useSessionStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSessionStore();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path (unlockScreen)', () => {
    it('[Happy Path] Berhasil unlock dengan PIN yang benar', async () => {
      store.lockScreen();
      expect(store.isLocked).toBe(true);

      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockResolvedValue({
        data: { success: true, message: 'PIN verified successfully.' }
      } as any);

      const result = await store.unlockScreen('123456');

      expect(result).toBe(true);
      expect(store.isLocked).toBe(false);
      expect(store.isUnlocking).toBe(false);
      expect(store.unlockError).toBe(false);
      expect(store.unlockErrorMessage).toBe('');
    });

    it('[Negative Path] Gagal unlock dengan PIN yang salah (success: false)', async () => {
      store.lockScreen();

      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockResolvedValue({
        data: { 
          success: false, 
          message: 'Incorrect PIN.' 
        }
      } as any);

      const result = await store.unlockScreen('999999');

      expect(result).toBe(false);
      expect(store.isLocked).toBe(true);
      expect(store.unlockError).toBe(true);
      expect(store.unlockErrorMessage).toBe('Incorrect PIN.');
    });

    it('[Negative Path] Response success:false tanpa message menggunakan default', async () => {
      store.lockScreen();

      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockResolvedValue({
        data: { success: false }
      } as any);

      const result = await store.unlockScreen('999999');

      expect(result).toBe(false);
      expect(store.unlockErrorMessage).toBe('Incorrect PIN. Please try again.');
    });

    it('[Negative Path] Gagal unlock jika sudah rate limited', async () => {
      store.lockScreen();
      store.isRateLimited = true;

      const result = await store.unlockScreen('123456');

      expect(result).toBe(false);
      expect(authApi.verifyPin).not.toHaveBeenCalled();
    });

    it('[Negative Path] Gagal unlock jika sedang proses unlock', async () => {
      store.lockScreen();
      store.isUnlocking = true;

      const result = await store.unlockScreen('123456');

      expect(result).toBe(false);
      expect(authApi.verifyPin).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING (Error Handling)
  // =====================================================================
  describe('Equivalence Partitioning (Error Handling di unlockScreen)', () => {
    it('[Partisi 1 - 400 Bad Request] Menampilkan pesan dari response', async () => {
      const mock400Error = {
        response: { 
          status: 400, 
          data: { message: 'Incorrect PIN.' } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock400Error);

      const result = await store.unlockScreen('999999');

      expect(result).toBe(false);
      expect(store.unlockError).toBe(true);
      expect(store.unlockErrorMessage).toBe('Incorrect PIN.');
    });

    it('[Partisi 2 - 403 Forbidden] Menampilkan pesan account tidak aktif', async () => {
      const mock403Error = {
        response: { 
          status: 403, 
          data: { message: 'Your account has been deactivated.' } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock403Error);

      await store.unlockScreen('123456');

      expect(store.unlockError).toBe(true);
      expect(store.unlockErrorMessage).toBe('Your account has been deactivated.');
    });

    it('[Partisi 3 - 403 Forbidden tanpa message] Menggunakan default message', async () => {
      const mock403Error = {
        response: { 
          status: 403, 
          data: {} 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock403Error);

      await store.unlockScreen('123456');

      expect(store.unlockErrorMessage).toBe('Account is not active.');
    });

    it('[Partisi 4 - 500 Server Error] Menampilkan pesan dari userMessage', async () => {
      const mock500Error = {
        response: { status: 500 },
        userMessage: 'Server is currently unavailable. Please try again later.'
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock500Error);

      await store.unlockScreen('123456');

      expect(store.unlockErrorMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('[Partisi 5 - 500 Server Error tanpa userMessage] Menggunakan default', async () => {
      const mock500Error = {
        response: { status: 500 }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock500Error);

      await store.unlockScreen('123456');

      expect(store.unlockErrorMessage).toBe('Server error. Please try again.');
    });

    it('[Partisi 6 - Generic Error] Menampilkan pesan system error', async () => {
      const mockGenericError = new Error('Network Error');
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mockGenericError);

      await store.unlockScreen('123456');

      expect(store.unlockErrorMessage).toBe('System error occurred. Please try again.');
    });
  });

  // =====================================================================
  // 3. RATE LIMITING
  // =====================================================================
  describe('Rate Limiting', () => {
    it('[Happy Path] Memulai timer rate limit saat mendapat 429 dengan retry-after', async () => {
      const mock429Error = {
        response: { 
          status: 429, 
          headers: { 'retry-after': '5' } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock429Error);

      await store.unlockScreen('000000');

      expect(store.isRateLimited).toBe(true);
      expect(store.rateLimitSeconds).toBe(5);
      expect(store.unlockError).toBe(true);
      expect(store.isUnlocking).toBe(false);
      expect(store.unlockErrorMessage).toBe('Too many attempts. Please try again in 5 seconds.');
    });

    it('[Edge Case] Menggunakan default 60 detik jika retry-after tidak ada', async () => {
      const mock429Error = {
        response: { 
          status: 429, 
          headers: {} 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock429Error);

      await store.unlockScreen('000000');

      expect(store.rateLimitSeconds).toBe(60);
    });

    it('[Edge Case] Menggunakan default 60 detik jika retry-after tidak valid', async () => {
      const mock429Error = {
        response: { 
          status: 429, 
          headers: { 'retry-after': 'invalid' } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock429Error);

      await store.unlockScreen('000000');

      expect(store.rateLimitSeconds).toBe(60);
    });

    it('[BVA - Countdown] Timer berkurang setiap detik dan clear saat habis', async () => {
      const mock429Error = {
        response: { 
          status: 429, 
          headers: { 'retry-after': '3' } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock429Error);

      await store.unlockScreen('000000');

      expect(store.rateLimitSeconds).toBe(3);

      // Advance 1 detik
      vi.advanceTimersByTime(1000);
      expect(store.rateLimitSeconds).toBe(2);
      expect(store.unlockErrorMessage).toBe('Too many attempts. Please try again in 2 seconds.');

      // Advance 1 detik lagi
      vi.advanceTimersByTime(1000);
      expect(store.rateLimitSeconds).toBe(1);
      expect(store.unlockErrorMessage).toBe('Too many attempts. Please try again in 1 seconds.');

      // Advance 1 detik lagi - harus clear
      vi.advanceTimersByTime(1000);
      expect(store.rateLimitSeconds).toBe(0);
      expect(store.isRateLimited).toBe(false);
      expect(store.unlockError).toBe(false);
      expect(store.unlockErrorMessage).toBe('');
    });

    it('[Corner Case] clearRateLimit mereset semua state', () => {
      store.isRateLimited = true;
      store.rateLimitSeconds = 30;
      store.unlockError = true;
      store.unlockErrorMessage = 'Error';

      store.clearRateLimit();

      expect(store.isRateLimited).toBe(false);
      expect(store.rateLimitSeconds).toBe(0);
      expect(store.unlockError).toBe(false);
      expect(store.unlockErrorMessage).toBe('');
    });
  });

  // =====================================================================
  // 4. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Retry 419] Otomatis retry jika CSRF expired', async () => {
      const mock419Error = { response: { status: 419 } };
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin)
        .mockRejectedValueOnce(mock419Error)
        .mockResolvedValueOnce({
          data: { success: true, message: 'PIN verified successfully.' }
        } as any);
      
      vi.mocked(authApi.refreshCsrfCookie).mockResolvedValue(undefined as any);

      const result = await store.unlockScreen('123456');

      expect(authApi.refreshCsrfCookie).toHaveBeenCalledTimes(1);
      expect(authApi.verifyPin).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
      expect(store.isLocked).toBe(false);
    });

    it('[Edge Case - Retry 419 Gagal] Gagal total jika refresh CSRF gagal', async () => {
      const mock419Error = { response: { status: 419 } };
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock419Error);
      vi.mocked(authApi.refreshCsrfCookie).mockRejectedValueOnce(new Error('Refresh Failed'));

      const result = await store.unlockScreen('123456');

      expect(result).toBe(false);
      expect(store.unlockError).toBe(true);
      expect(store.unlockErrorMessage).toBe('Security session expired. Please try again.');
    });

    it('[Corner Case - lockScreen] Mengunci dan mereset state', () => {
      store.isLocked = false;
      store.isUnlocking = true;
      store.unlockError = true;
      store.unlockErrorMessage = 'Error';
      store.isRateLimited = true;
      store.rateLimitSeconds = 10;

      store.lockScreen();

      expect(store.isLocked).toBe(true);
      expect(store.isUnlocking).toBe(false);
      expect(store.unlockError).toBe(false);
      expect(store.unlockErrorMessage).toBe('');
      expect(store.isRateLimited).toBe(false);
      expect(store.rateLimitSeconds).toBe(0);
    });
  });

  // =====================================================================
  // 5. STATE TRANSITION TESTS
  // =====================================================================
  describe('State Transition Tests', () => {
    it('isUnlocking berubah true saat proses dan false setelah selesai', async () => {
      store.lockScreen();
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockImplementationOnce(async () => {
        expect(store.isUnlocking).toBe(true);
        return { data: { success: true } } as any;
      });

      await store.unlockScreen('123456');

      expect(store.isUnlocking).toBe(false);
    });

    it('unlockError direset saat mulai unlock', async () => {
      store.lockScreen();
      store.unlockError = true;
      store.unlockErrorMessage = 'Previous error';

      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockResolvedValue({
        data: { success: true }
      } as any);

      await store.unlockScreen('123456');

      expect(store.unlockError).toBe(false);
      expect(store.unlockErrorMessage).toBe('');
    });

    it('isUnlocking direset saat rate limited', async () => {
      const mock429Error = {
        response: { 
          status: 429, 
          headers: { 'retry-after': '5' } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.verifyPin).mockRejectedValueOnce(mock429Error);

      await store.unlockScreen('000000');

      expect(store.isUnlocking).toBe(false);
      expect(store.isRateLimited).toBe(true);
    });
  });
});