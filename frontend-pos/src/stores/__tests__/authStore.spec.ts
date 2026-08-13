// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore'; // Sesuaikan path dengan lokasi authStore.ts
import { authApi } from '../../api/authApi';
import router from '@/router';

// =====================================================================
// SETUP & MOCKING
// Mengisolasi dependensi eksternal agar murni menguji logika Store
// =====================================================================
vi.mock('@/api/authApi', () => ({
  authApi: {
    getUser: vi.fn(),
    ensureCsrfCookie: vi.fn(),
    refreshCsrfCookie: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock('@/router', () => ({
  default: {
    replace: vi.fn(),
  },
}));

describe('Authentication Store (useAuthStore)', () => {
  let store: ReturnType<typeof useAuthStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAuthStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH (Fokus Alur Normal)
  // =====================================================================
  describe('Happy & Negative Path (fetchUser & login)', () => {
    it('Happy Path (fetchUser): Mengembalikan true dan menyimpan state user jika sukses', async () => {
      const mockUser = { id: 1, name: 'Kasir 1' };
      vi.mocked(authApi.getUser).mockResolvedValueOnce({ data: { data: { user: mockUser } } });

      const result = await store.fetchUser();

      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.isSessionChecked).toBe(true);
    });

    it('Negative Path (fetchUser): Mengembalikan false dan mengosongkan user jika API error', async () => {
      vi.mocked(authApi.getUser).mockRejectedValueOnce(new Error('Network Error'));

      const result = await store.fetchUser();

      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isSessionChecked).toBe(true);
    });

    it('Happy Path (login): Sukses login, reset pesan error, dan simpan user', async () => {
      const credentials = { username: 'cashier', password: '123' };
      const mockUser = { id: 2, name: 'Kasir 2' };
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValueOnce();
      vi.mocked(authApi.login).mockResolvedValueOnce({ data: { data: { user: mockUser } } });

      const result = await store.login(credentials);

      expect(authApi.ensureCsrfCookie).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
      expect(store.isLoading).toBe(false);
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING (Pengelompokan Status HTTP Error)
  // =====================================================================
  describe('Equivalence Partitioning (Error Handling di login)', () => {
    it('Group 422: Mengisi validationErrors dan mengosongkan errorMessage', async () => {
      const mock422Error = {
        response: { status: 422, data: { errors: { email: ['Email invalid'] } } }
      };
      vi.mocked(authApi.login).mockRejectedValueOnce(mock422Error);

      const result = await store.login({});

      expect(result).toBe(false);
      expect(store.validationErrors).toEqual({ email: ['Email invalid'] });
      expect(store.errorMessage).toBeNull();
    });

    it('Group 401/403: Mengisi errorMessage dan mengosongkan validationErrors', async () => {
      const mock401Error = {
        response: { status: 401, data: { message: 'Wrong password' } }
      };
      vi.mocked(authApi.login).mockRejectedValueOnce(mock401Error);

      await store.login({});

      expect(store.errorMessage).toBe('Wrong password');
      expect(store.validationErrors).toEqual({});
    });

    it('Group Timeout/Network: Menangani error "ECONNABORTED" atau "timeout"', async () => {
      const mockTimeoutError = { code: 'ECONNABORTED' };
      vi.mocked(authApi.login).mockRejectedValueOnce(mockTimeoutError);

      await store.login({});

      expect(store.errorMessage).toBe('Slow network connection. Please check your internet and try again.');
    });

    it('Group Generic (Selain di atas): Menampilkan generic server error', async () => {
      const mock500Error = { response: { status: 500 } };
      vi.mocked(authApi.login).mockRejectedValueOnce(mock500Error);

      await store.login({});

      expect(store.errorMessage).toBe('An error occurred on the server.');
    });
  });

  // =====================================================================
  // 3. EDGE CASES & CORNER CASES (Kondisi Langka & Pengecualian)
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('Edge Case (BVA Logika isRetry): Otomatis retry 1 KALI saja jika terkena error 419', async () => {
      // Tembakan pertama: Gagal karena 419 (Token Expired)
      const mock419Error = { response: { status: 419 } };
      // Tembakan kedua: Sukses
      const mockUser = { id: 3, name: 'Kasir 3' };

      vi.mocked(authApi.login)
        .mockRejectedValueOnce(mock419Error)
        .mockResolvedValueOnce({ data: { data: { user: mockUser } } });
      
      vi.mocked(authApi.refreshCsrfCookie).mockResolvedValueOnce();

      const result = await store.login({});

      // Ekspektasi: Harus me-refresh cookie lalu mencoba login lagi secara otomatis
      expect(authApi.refreshCsrfCookie).toHaveBeenCalledTimes(1);
      expect(authApi.login).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
    });

    it('Edge Case: Gagal total jika percobaan kedua (retry 419) juga gagal', async () => {
      const mock419Error = { response: { status: 419 } };
      
      // Gagal di login pertama, dan gagal lagi saat me-refresh cookie
      vi.mocked(authApi.login).mockRejectedValueOnce(mock419Error);
      vi.mocked(authApi.refreshCsrfCookie).mockRejectedValueOnce(new Error('Refresh Failed'));

      const result = await store.login({});

      expect(result).toBe(false);
      expect(store.errorMessage).toBe('Security session expired. Please try logging in again.');
    });

    it('Corner Case (clearError): Menghapus pesan error dari field spesifik dengan benar', () => {
      store.validationErrors = { email: ['Salah'], password: ['Kosong'] };
      store.errorMessage = 'Login gagal';

      store.clearError('email');

      expect(store.validationErrors).toEqual({ password: ['Kosong'] });
      expect(store.errorMessage).toBeNull(); // Memastikan errorMessage juga ikut direset
    });

    it('Corner Case (Logout Offline): Tetap redirect dan hapus session lokal meskipun API gagal/timeout', async () => {
      // Logout dilempar error (karena misal WiFi putus saat menekan tombol logout)
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network Offline'));

      await store.logout();

      // Memastikan user di sisi client tetap logout dan dipaksa pindah ke halaman login
      expect(store.user).toBeNull();
      expect(router.replace).toHaveBeenCalledWith({ name: 'Login' });
    });
  });
});