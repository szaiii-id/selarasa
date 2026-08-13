// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authApi } from '../authApi';
import api from '../axios';

vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Authentication API Service (authApi.ts)', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie.split(';').forEach((c) => {
      document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    });
    vi.stubEnv('VITE_API_BASE_URL', 'http://selarasa:8001/api/v1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // =====================================================================
  // 1. EDGE CASES & SUBSTRING TRAPS (hasCsrfCookie Logic)
  // =====================================================================
  describe('CSRF Cookie Logic (ensureCsrfCookie)', () => {
    it('Edge Case (Trap): Tetap menembak request jika ada cookie tiruan yang mengandung substring (NOT-XSRF-TOKEN)', async () => {
      // Set cookie harus SATU PER SATU agar dibaca benar oleh JSDOM
      document.cookie = 'my_session=123';
      document.cookie = 'FAKE-XSRF-TOKEN=abc';
      document.cookie = 'OTHER_COOKIE=xyz';
      
      await authApi.ensureCsrfCookie();
      
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('Happy Path: Tidak menembak API jika XSRF-TOKEN cookie sudah benar-benar ada', async () => {
      // Set cookie harus SATU PER SATU
      document.cookie = 'user_pref=dark';
      document.cookie = 'XSRF-TOKEN=valid_token_here';
      document.cookie = 'analytics=1';
      
      await authApi.ensureCsrfCookie();
      
      // Sekarang baru benar-benar tidak akan menembak API
      expect(api.get).not.toHaveBeenCalled();
    });

    it('Negative Path: Menembak API jika browser belum memiliki cookie sama sekali', async () => {
      document.cookie = '';
      
      await authApi.ensureCsrfCookie();
      
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('http://selarasa:8001/sanctum/csrf-cookie', { timeout: 15000 });
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING & FALLBACK (getSanctumUrl Logic)
  // =====================================================================
  describe('Sanctum URL Resolver (refreshCsrfCookie)', () => {
    it('Equivalence Partition 1: Memotong string "/api/v1" dari URL environment dengan benar', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.selarasa.id/api/v1');
      
      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('https://api.selarasa.id/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('Equivalence Partition 2 (Fallback): Menggunakan localhost:8000 jika env VITE_API_BASE_URL kosong', async () => {
      vi.stubEnv('VITE_API_BASE_URL', ''); 
      
      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('http://selarasa:8000/sanctum/csrf-cookie', { timeout: 15000 });
    });
  });

  // =====================================================================
  // 3. HAPPY PATH (API Endpoints & Payloads)
  // =====================================================================
  describe('Authentication Endpoints (login, getUser, logout)', () => {
    it('Happy Path (Login): Menembak endpoint khusus POS (/pos/auth/login) dengan payload yang benar', async () => {
      const credentials = { username: 'cashier', password: 'password123' };
      
      await authApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/pos/auth/login', credentials, { timeout: 20000 });
    });

    it('Happy Path (GetUser): Menembak endpoint /auth/me', async () => {
      await authApi.getUser();

      expect(api.get).toHaveBeenCalledWith('/auth/me', { timeout: 8000 });
    });

    it('Boundary / Edge Case (Logout): Berhasil menggabungkan config custom (seperti AbortController)', async () => {
      const mockAbortSignal = { aborted: true } as unknown as AbortSignal;
      const customConfig = { signal: mockAbortSignal, headers: { 'X-Custom': '1' } };

      await authApi.logout(customConfig);

      expect(api.post).toHaveBeenCalledWith(
        '/auth/logout', 
        {}, 
        { 
          timeout: 4000, 
          signal: mockAbortSignal,
          headers: { 'X-Custom': '1' }
        }
      );
    });
  });
});