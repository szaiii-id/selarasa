// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../authStore';
import { authApi } from '../../api/authApi';
import router from '@/router';
import type { AxiosResponse } from 'axios';
import type { User } from '../../types/auth';

// =====================================================================
// SETUP & MOCKING
// =====================================================================
vi.mock('../../api/authApi', () => ({
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

// Helper untuk membuat mock User yang lengkap
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  name: 'Kasir 1',
  username: 'kasir1',
  role: 'cashier',
  is_active: true,
  joined_at: '2024-01-01T00:00:00+00:00',
  ...overrides,
});

// Helper untuk membuat mock AxiosResponse
const createMockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {
    headers: {}
  } as any,
});

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
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path (fetchUser & login)', () => {
    it('[Happy Path - fetchUser] Mengembalikan true dan menyimpan state user jika sukses', async () => {
      const mockUser = createMockUser();
      const mockResponse = createMockAxiosResponse({ 
        data: { 
          user: mockUser 
        } 
      });
      
      vi.mocked(authApi.getUser).mockResolvedValueOnce(mockResponse);

      const result = await store.fetchUser();

      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.isSessionChecked).toBe(true);
    });

    it('[Happy Path - fetchUser] Mendukung struktur response alternatif (data.data langsung)', async () => {
      const mockUser = createMockUser();
      const mockResponse = createMockAxiosResponse({ 
        data: mockUser 
      });
      
      vi.mocked(authApi.getUser).mockResolvedValueOnce(mockResponse);

      const result = await store.fetchUser();

      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
    });

    it('[Negative Path - fetchUser] Mengembalikan false dan mengosongkan user jika API error', async () => {
      vi.mocked(authApi.getUser).mockRejectedValueOnce(new Error('Network Error'));

      const result = await store.fetchUser();

      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(store.isSessionChecked).toBe(true);
    });

    it('[Negative Path - fetchUser] Mengembalikan false jika response tidak memiliki user data', async () => {
      const mockResponse = createMockAxiosResponse({ data: null });
      
      vi.mocked(authApi.getUser).mockResolvedValueOnce(mockResponse);

      const result = await store.fetchUser();

      expect(result).toBe(false);
      expect(store.user).toBeNull();
    });

    it('[Happy Path - login] Sukses login, reset pesan error, dan simpan user', async () => {
      const credentials = { username: 'cashier', password: '123' };
      const mockUser = createMockUser({ id: 'uuid-2', name: 'Kasir 2', username: 'kasir2' });
      const mockLoginResponse = createMockAxiosResponse({ 
        data: { 
          user: mockUser 
        } 
      });
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse);

      const result = await store.login(credentials);

      expect(authApi.ensureCsrfCookie).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
      expect(store.isAuthenticated).toBe(true);
      expect(store.errorMessage).toBeNull();
      expect(store.validationErrors).toEqual({});
      expect(store.isLoading).toBe(false);
    });

    it('[Negative Path - login] Gagal jika response tidak memiliki user data', async () => {
      const mockLoginResponse = createMockAxiosResponse({ data: null });
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse);

      const result = await store.login({});

      expect(result).toBe(false);
      expect(store.user).toBeNull();
      expect(store.errorMessage).toBe('Invalid response structure from server.');
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =====================================================================
  describe('Equivalence Partitioning (Error Handling di login)', () => {
    it('[Partisi 1 - 422 Validation Error] Mengisi validationErrors dan mengosongkan errorMessage', async () => {
      const mock422Error = {
        response: { 
          status: 422, 
          data: { 
            errors: { 
              email: ['Email invalid'],
              password: ['Password required']
            } 
          } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mock422Error);

      const result = await store.login({});

      expect(result).toBe(false);
      expect(store.validationErrors).toEqual({ 
        email: ['Email invalid'],
        password: ['Password required']
      });
      expect(store.errorMessage).toBeNull();
    });

    it('[Partisi 2 - 401 Unauthorized] Mengisi errorMessage dan mengosongkan validationErrors', async () => {
      const mock401Error = {
        response: { 
          status: 401, 
          data: { 
            message: 'Wrong password' 
          } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mock401Error);

      await store.login({});

      expect(store.errorMessage).toBe('Wrong password');
      expect(store.validationErrors).toEqual({});
    });

    it('[Partisi 3 - 403 Forbidden] Mengisi errorMessage dengan pesan spesifik', async () => {
      const mock403Error = {
        response: { 
          status: 403, 
          data: { 
            message: 'Your account is deactivated' 
          } 
        }
      };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mock403Error);

      await store.login({});

      expect(store.errorMessage).toBe('Your account is deactivated');
    });

    it('[Partisi 4 - Timeout Error] Menangani error "ECONNABORTED"', async () => {
      const mockTimeoutError = { code: 'ECONNABORTED' };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mockTimeoutError);

      await store.login({});

      expect(store.errorMessage).toBe('Slow network connection. Please check your internet and try again.');
    });

    it('[Partisi 5 - Network Error tanpa response] Menampilkan pesan error dari error.message', async () => {
      const mockNetworkError = new Error('Network Error');
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mockNetworkError);

      await store.login({});

      expect(store.errorMessage).toBe('Network Error');
    });

    it('[Partisi 6 - Generic Server Error] Menampilkan generic server error', async () => {
      const mock500Error = { response: { status: 500 } };
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mock500Error);

      await store.login({});

      expect(store.errorMessage).toBe('An error occurred on the server.');
    });
  });

  // =====================================================================
  // 3. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Retry 419] Otomatis retry 1 KALI saja jika terkena error 419', async () => {
      const mock419Error = { response: { status: 419 } };
      const mockUser = createMockUser({ id: 'uuid-3', name: 'Kasir 3', username: 'kasir3' });
      const mockLoginResponse = createMockAxiosResponse({ 
        data: { 
          user: mockUser 
        } 
      });

      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login)
        .mockRejectedValueOnce(mock419Error)
        .mockResolvedValueOnce(mockLoginResponse);
      
      vi.mocked(authApi.refreshCsrfCookie).mockResolvedValue(undefined as any);

      const result = await store.login({});

      expect(authApi.refreshCsrfCookie).toHaveBeenCalledTimes(1);
      expect(authApi.login).toHaveBeenCalledTimes(2);
      expect(result).toBe(true);
      expect(store.user).toEqual(mockUser);
    });

    it('[Edge Case - Retry 419 Gagal] Gagal total jika refresh CSRF juga gagal', async () => {
      const mock419Error = { response: { status: 419 } };
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(mock419Error);
      vi.mocked(authApi.refreshCsrfCookie).mockRejectedValueOnce(new Error('Refresh Failed'));

      const result = await store.login({});

      expect(result).toBe(false);
      expect(store.errorMessage).toBe('Security session expired. Please try logging in again.');
    });

    it('[Corner Case - clearError] Menghapus pesan error dari field spesifik', () => {
      store.validationErrors = { email: ['Salah'], password: ['Kosong'] };
      store.errorMessage = 'Login gagal';

      store.clearError('email');

      expect(store.validationErrors).toEqual({ password: ['Kosong'] });
      expect(store.errorMessage).toBeNull();
    });

    it('[Corner Case - clearError] Menangani field yang tidak ada', () => {
      store.validationErrors = { email: ['Salah'] };
      store.errorMessage = 'Error';

      store.clearError('nonexistent');

      expect(store.validationErrors).toEqual({ email: ['Salah'] });
      expect(store.errorMessage).toBeNull();
    });

    it('[Corner Case - Logout Offline] Tetap redirect dan hapus session lokal', async () => {
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network Offline'));

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(router.replace).toHaveBeenCalledWith({ name: 'Login' });
    });

    it('[Happy Path - Logout] Sukses logout dan redirect', async () => {
      store.user = createMockUser();
      
      vi.mocked(authApi.logout).mockResolvedValue({} as any);

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isAuthenticated).toBe(false);
      expect(router.replace).toHaveBeenCalledWith({ name: 'Login' });
    });
  });

  // =====================================================================
  // 4. STATE TRANSITION TESTS
  // =====================================================================
  describe('State Transition Tests', () => {
    it('isLoading berubah true saat login dimulai dan false setelah selesai', async () => {
      const mockUser = createMockUser();
      const mockLoginResponse = createMockAxiosResponse({ 
        data: { 
          user: mockUser 
        } 
      });
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockImplementationOnce(async () => {
        expect(store.isLoading).toBe(true);
        return mockLoginResponse;
      });

      await store.login({});

      expect(store.isLoading).toBe(false);
    });

    it('isSessionChecked berubah true setelah fetchUser selesai', async () => {
      expect(store.isSessionChecked).toBe(false);

      const mockResponse = createMockAxiosResponse({ 
        data: { 
          user: createMockUser()
        } 
      });
      vi.mocked(authApi.getUser).mockResolvedValueOnce(mockResponse);

      await store.fetchUser();

      expect(store.isSessionChecked).toBe(true);
    });

    it('isSessionChecked berubah true setelah login sukses', async () => {
      const mockUser = createMockUser();
      const mockLoginResponse = createMockAxiosResponse({ 
        data: { 
          user: mockUser 
        } 
      });
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockResolvedValueOnce(mockLoginResponse);

      await store.login({});

      expect(store.isSessionChecked).toBe(true);
    });

    it('errorMessage direset saat login dimulai', async () => {
      store.errorMessage = 'Previous error';
      
      vi.mocked(authApi.ensureCsrfCookie).mockResolvedValue(undefined as any);
      vi.mocked(authApi.login).mockRejectedValueOnce(new Error('New error'));

      await store.login({});

      expect(store.errorMessage).not.toBe('Previous error');
    });
  });
});