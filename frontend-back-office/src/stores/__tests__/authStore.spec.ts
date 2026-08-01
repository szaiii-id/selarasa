import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore';
import { authApi } from '../../api/authApi';

// 1. Mock module authApi agar tes murni menguji logika Store (Tanpa request network asli)
vi.mock('../../api/authApi', () => ({
  authApi: {
    getCsrfCookie: vi.fn(),
    login: vi.fn(),
    getUser: vi.fn(),
    logout: vi.fn(),
  },
}));

describe('useAuthStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    // Reset status Pinia & Mock API sebelum tiap skenario dijalankan
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
      expect(store.validationErrors).toEqual({});
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Testing Partisi Response: 422 Validation Error)
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Invalid Input Partition] memilah respon HTTP 422 ke dalam validationErrors state', async () => {
      const store = useAuthStore();
      const mockValidationErrors = {
        username: ['Username wajib diisi.'],
        password: ['Password minimal 8 karakter.'],
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
      expect(store.errorMessage).toBeNull(); // Error pesan umum harus bersih
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS / BVA (Testing Batas Penghapusan Error State)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - 1 to 0 boundary] clearError() menghapus tepat 1 field & mengosongkan errorMessage saat batas habis', () => {
      const store = useAuthStore();

      // Isi state awal dengan tepat 1 batas error field
      store.validationErrors = { username: ['Username salah'] };
      store.errorMessage = 'Terjadi kesalahan validasi';

      // Eksekusi fungsi penghapus batas error
      store.clearError('username');

      // Validasi batas setelah dikurangi 1 harus bernilai object kosong (0 keys)
      expect(Object.keys(store.validationErrors).length).toBe(0);
      expect(store.validationErrors.username).toBeUndefined();
      expect(store.errorMessage).toBeNull();
    });
  });

  // =========================================================================
  // 4. EDGE & CORNER CASES (Testing Kondisi Ekstrem / Langka di Level Fungsi)
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] login() menolak HTTP 200 yang struktur JSON-nya rusak/hilang properti user', async () => {
      const store = useAuthStore();

      // Kasus ekstrem: Server 200 OK tapi backend salah melempar response (tidak ada .user)
      vi.mocked(authApi.login).mockResolvedValueOnce({
        data: { data: {} }, 
      } as any);

      const success = await store.login({ username: 'admin', password: 'password123' });

      expect(success).toBe(false);
      expect(store.user).toBeNull();
      expect(store.errorMessage).toBe('Invalid response structure from server.');
    });

    it('[Corner Case] fetchUser() mengembalikan false dengan aman saat network offline / RTO', async () => {
      const store = useAuthStore();

      // Simulasi RTO (Request Timeout) tanpa standard HTTP status
      vi.mocked(authApi.getUser).mockRejectedValueOnce(new Error('Network Error'));

      const success = await store.fetchUser();

      expect(success).toBe(false);
      expect(store.user).toBeNull();
    });
  });
});