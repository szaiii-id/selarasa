import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore';
import { authApi } from '../../api/authApi';
import router from '../../router';

// 1. Mock module authApi
vi.mock('../../api/authApi', () => ({
  authApi: {
    ensureCsrfCookie: vi.fn(),
    refreshCsrfCookie: vi.fn(),
    login: vi.fn(),
    getUser: vi.fn(),
    logout: vi.fn(),
  },
}));

// 2. Mock vue-router agar fungsi logout() tidak crash saat memanggil router.replace
vi.mock('@/router', () => ({
  default: {
    replace: vi.fn(),
  },
}));

describe('useAuthStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH (Testing Jalur Normal vs Gagal Akibat Auth)
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] login() mengembalikan true & mengisi state user saat kredensial valid', async () => {
      const store = useAuthStore();
      const mockUser = { id: 'uuid-1', name: 'Admin', username: 'admin', role: 'admin' };

      vi.mocked(authApi.login).mockResolvedValueOnce({
        data: { data: { user: mockUser } },
      } as any);

      const success = await store.login({ username: 'admin', password: 'password123' });

      expect(success).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.errorMessage).toBeNull();
      expect(authApi.ensureCsrfCookie).toHaveBeenCalledTimes(1);
    });

    it('[Negative Path] login() mengembalikan false & mengisi errorMessage saat 401 Unauthorized', async () => {
      const store = useAuthStore();
      
      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: {
          status: 401,
          data: { message: 'Username atau password salah.' },
        },
      });

      const success = await store.login({ username: 'admin', password: 'wrongpassword' });

      expect(success).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.errorMessage).toBe('Username atau password salah.');
    });

    it('[Happy Path] logout() membersihkan state dan melakukan redirect ke halaman Login', async () => {
      const store = useAuthStore();
      store.user = { id: 'uuid-1', username: 'admin', name: 'Admin', role: 'admin' };

      await store.logout();

      expect(authApi.logout).toHaveBeenCalledTimes(1);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(router.replace).toHaveBeenCalledWith({ name: 'Login' });
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Testing Partisi Response: 422 & 500)
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Invalid Input Partition] memilah respon HTTP 422 ke dalam validationErrors state', async () => {
      const store = useAuthStore();
      const mockValidationErrors = {
        username: ['Username wajib diisi.'],
      };

      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: {
          status: 422,
          data: { errors: mockValidationErrors },
        },
      });

      const success = await store.login({ username: '', password: '123' });

      expect(success).toBe(false);
      expect(store.validationErrors).toEqual(mockValidationErrors);
      expect(store.errorMessage).toBeNull(); 
    });

    it('[Server Error Partition] menangkap HTTP 500 dan mengisi errorMessage fallback', async () => {
      const store = useAuthStore();

      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: { status: 500 }, // Tanpa data.message spesifik
      });

      const success = await store.login({ username: 'admin', password: '123' });

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('An error occurred on the server.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS / BVA (Testing Batas Penghapusan Error State)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - 1 to 0 boundary] clearError() menghapus tepat 1 field & mengosongkan errorMessage saat batas habis', () => {
      const store = useAuthStore();

      store.validationErrors = { username: ['Username salah'] };
      store.errorMessage = 'Terjadi kesalahan validasi';

      store.clearError('username');

      expect(Object.keys(store.validationErrors).length).toBe(0);
      expect(store.validationErrors.username).toBeUndefined();
      expect(store.errorMessage).toBeNull();
    });

    it('[BVA - Invalid Boundary] clearError() tidak crash jika mencoba menghapus field yang tidak ada', () => {
      const store = useAuthStore();
      
      store.validationErrors = { username: ['Username salah'] };
      
      store.clearError('password'); // Field 'password' tidak ada

      // Panjang kunci harus tetap 1 (tidak ada yang terhapus)
      expect(Object.keys(store.validationErrors).length).toBe(1);
    });
  });

  // =========================================================================
  // 4. EDGE & CORNER CASES (Testing Kondisi Ekstrem / Langka di Level Fungsi)
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    
    it('[Corner Case - 419 Auto Retry] login() memanggil refreshCsrfCookie & mencoba login ulang jika HTTP 419', async () => {
      const store = useAuthStore();
      
      // Panggilan API login PERTAMA gagal dengan 419
      vi.mocked(authApi.login).mockRejectedValueOnce({
        response: { status: 419 }
      });
      // Mock agar refresh CSRF sukses
      vi.mocked(authApi.refreshCsrfCookie).mockResolvedValueOnce();
      // Panggilan API login KEDUA (hasil retry) berhasil
      vi.mocked(authApi.login).mockResolvedValueOnce({
        data: { data: { user: { id: 'uuid-1', username: 'admin', name: 'Admin', role: 'admin' } } },
      } as any);

      const success = await store.login({ username: 'admin', password: '123' });

      // Validasi bahwa mekanisme retry bekerja
      expect(success).toBe(true);
      expect(store.isAuthenticated).toBe(true);
      expect(authApi.refreshCsrfCookie).toHaveBeenCalledTimes(1);
      expect(authApi.login).toHaveBeenCalledTimes(2); // Dipanggil 2x
    });

    it('[Edge Case - Network Timeout] login() mendeteksi kode jaringan ECONNABORTED', async () => {
      const store = useAuthStore();

      vi.mocked(authApi.login).mockRejectedValueOnce({
        code: 'ECONNABORTED' 
      });

      const success = await store.login({ username: 'admin', password: '123' });

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Slow network connection. Please check your internet and try again.');
    });

    it('[Edge Case - Malformed JSON] login() menolak HTTP 200 yang struktur JSON-nya rusak/hilang properti user', async () => {
      const store = useAuthStore();

      vi.mocked(authApi.login).mockResolvedValueOnce({
        data: { data: {} }, 
      } as any);

      const success = await store.login({ username: 'admin', password: 'password123' });

      expect(success).toBe(false);
      expect(store.user).toBeNull();
      expect(store.errorMessage).toBe('Invalid response structure from server.');
    });

    it('[Corner Case - Silent Failure] logout() tetap membersihkan state lokal & redirect meskipun API throw error (RTO)', async () => {
      const store = useAuthStore();
      store.user = { id: 'uuid-1', username: 'admin', name: 'Admin', role: 'admin' };

      // Simulasi API server meledak atau Request Timeout saat proses logout
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network Error'));

      await store.logout();

      // Secara teori, aplikasi tidak boleh membeku. Harus tetap membuang state & redirect.
      expect(store.user).toBeNull();
      expect(router.replace).toHaveBeenCalledWith({ name: 'Login' });
    });
  });
});