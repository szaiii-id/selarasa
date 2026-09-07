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
    // Bersihkan semua cookies
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
    it('[Edge Case - Trap] Tetap menembak request jika ada cookie tiruan yang mengandung substring (NOT-XSRF-TOKEN)', async () => {
      document.cookie = 'my_session=123';
      document.cookie = 'FAKE-XSRF-TOKEN=abc';
      document.cookie = 'OTHER_COOKIE=xyz';
      
      await authApi.ensureCsrfCookie();
      
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('http://selarasa:8001/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Happy Path] Tidak menembak API jika XSRF-TOKEN cookie sudah benar-benar ada', async () => {
      document.cookie = 'user_pref=dark';
      document.cookie = 'XSRF-TOKEN=valid_token_here';
      document.cookie = 'analytics=1';
      
      await authApi.ensureCsrfCookie();
      
      expect(api.get).not.toHaveBeenCalled();
    });

    it('[Negative Path] Menembak API jika browser belum memiliki cookie sama sekali', async () => {
      document.cookie = '';
      
      await authApi.ensureCsrfCookie();
      
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('http://selarasa:8001/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Edge Case] Cookie dengan nama mirip tapi tidak persis sama tetap dianggap tidak ada', async () => {
      document.cookie = 'XSRF-TOKEN-BACKUP=old_token';
      document.cookie = 'MY-XSRF-TOKEN=fake';
      
      await authApi.ensureCsrfCookie();
      
      expect(api.get).toHaveBeenCalledTimes(1);
    });

    it('[Edge Case] Cookie XSRF-TOKEN dengan nilai kosong tetap dianggap ada', async () => {
      document.cookie = 'XSRF-TOKEN=';
      
      await authApi.ensureCsrfCookie();
      
      // startsWith('XSRF-TOKEN=') akan true meskipun nilainya kosong
      expect(api.get).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING & FALLBACK (getSanctumUrl Logic)
  // =====================================================================
  describe('Sanctum URL Resolver (refreshCsrfCookie)', () => {
    it('[Equivalence Partition 1] Memotong string "/api/v1" dari URL environment dengan benar', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.selarasa.id/api/v1');
      
      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('https://api.selarasa.id/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Equivalence Partition 2 - Fallback] Menggunakan localhost:8000 jika env VITE_API_BASE_URL kosong', async () => {
      vi.stubEnv('VITE_API_BASE_URL', ''); 
      
      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('http://selarasa:8000/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Equivalence Partition 3] URL tanpa "/api/v1" tidak berubah', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://selarasa.id');
      
      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('https://selarasa.id/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Boundary Case] URL dengan "/api/v1" di tengah string - hanya yang pertama diganti', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://selarasa.id/api/v1/extra');
      
      await authApi.refreshCsrfCookie();

      // replace() hanya mengganti kemunculan pertama "/api/v1"
      // Hasilnya: "https://selarasa.id/extra/sanctum/csrf-cookie"
      expect(api.get).toHaveBeenCalledWith('https://selarasa.id/extra/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Corner Case] URL dengan "/api/v1" muncul dua kali - hanya yang pertama diganti', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://selarasa.id/api/v1/api/v1');
      
      await authApi.refreshCsrfCookie();

      // replace() hanya mengganti kemunculan pertama "/api/v1"
      // Hasilnya: "https://selarasa.id/api/v1/sanctum/csrf-cookie"
      expect(api.get).toHaveBeenCalledWith('https://selarasa.id/api/v1/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Edge Case] URL dengan trailing slash', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://selarasa.id/api/v1/');
      
      await authApi.refreshCsrfCookie();

      // Trailing slash tetap ada setelah replace
      // Hasilnya: "https://selarasa.id//sanctum/csrf-cookie"
      expect(api.get).toHaveBeenCalledWith('https://selarasa.id//sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Edge Case] URL dengan uppercase "/API/V1" tidak diganti', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://selarasa.id/API/V1');
      
      await authApi.refreshCsrfCookie();

      // replace() case-sensitive, jadi tidak diganti
      expect(api.get).toHaveBeenCalledWith('https://selarasa.id/API/V1/sanctum/csrf-cookie', { timeout: 15000 });
    });
  });

  // =====================================================================
  // 3. HAPPY PATH (API Endpoints & Payloads)
  // =====================================================================
  describe('Authentication Endpoints (login, getUser, logout)', () => {
    it('[Happy Path - Login] Menembak endpoint khusus POS (/pos/auth/login) dengan payload yang benar', async () => {
      const credentials = { username: 'cashier', password: 'password123' };
      
      await authApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/pos/auth/login', credentials, { timeout: 20000 });
    });

    it('[Happy Path - Login] Mengirimkan payload credentials dengan benar', async () => {
      const credentials = { 
        username: 'admin', 
        password: 'secret123',
        remember: true 
      };
      
      await authApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith(
        '/pos/auth/login', 
        expect.objectContaining({
          username: 'admin',
          password: 'secret123',
          remember: true
        }), 
        { timeout: 20000 }
      );
    });

    it('[Happy Path - GetUser] Menembak endpoint /auth/me', async () => {
      await authApi.getUser();

      expect(api.get).toHaveBeenCalledWith('/auth/me', { timeout: 8000 });
    });

    it('[Happy Path - VerifyPin] Menembak endpoint /pos/auth/verify-pin dengan payload PIN', async () => {
      const payload = { pin_code: '123456' };
      
      await authApi.verifyPin(payload);

      expect(api.post).toHaveBeenCalledWith('/pos/auth/verify-pin', payload, { timeout: 8000 });
    });

    it('[Boundary / Edge Case - Logout] Berhasil menggabungkan config custom (seperti AbortController)', async () => {
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

    it('[Happy Path - Logout] Menggunakan config default jika tidak ada config custom', async () => {
      await authApi.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {}, { timeout: 4000 });
    });

    it('[Edge Case - Logout] Config custom menimpa timeout default', async () => {
      const customConfig = { timeout: 10000 };
      
      await authApi.logout(customConfig);

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {}, { timeout: 10000 });
    });
  });

  // =====================================================================
  // 4. RETURN VALUE TESTS
  // =====================================================================
  describe('Return Values', () => {
    it('[Happy Path] login() mengembalikan promise dari api.post', async () => {
      const mockResponse = { data: { token: 'abc123' } };
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await authApi.login({ username: 'test', password: 'pass' });
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] getUser() mengembalikan promise dari api.get', async () => {
      const mockUser = { data: { id: 1, name: 'John' } };
      (api.get as any).mockResolvedValue(mockUser);
      
      const result = await authApi.getUser();
      
      expect(result).toEqual(mockUser);
    });

    it('[Happy Path] verifyPin() mengembalikan promise dari api.post', async () => {
      const mockResponse = { data: { success: true } };
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await authApi.verifyPin({ pin_code: '123456' });
      
      expect(result).toEqual(mockResponse);
    });

    it('[Happy Path] logout() mengembalikan promise dari api.post', async () => {
      const mockResponse = { data: { success: true } };
      (api.post as any).mockResolvedValue(mockResponse);
      
      const result = await authApi.logout();
      
      expect(result).toEqual(mockResponse);
    });
  });

  // =====================================================================
  // 5. CSRF COOKIE EDGE CASES
  // =====================================================================
  describe('CSRF Cookie Edge Cases', () => {
    it('[Edge Case] ensureCsrfCookie() dipanggil dua kali berturut-turut hanya menembak API sekali', async () => {
      document.cookie = 'XSRF-TOKEN=valid_token';
      
      await authApi.ensureCsrfCookie();
      await authApi.ensureCsrfCookie();
      
      expect(api.get).not.toHaveBeenCalled();
    });

    it('[Edge Case] refreshCsrfCookie() selalu menembak API meskipun cookie sudah ada', async () => {
      document.cookie = 'XSRF-TOKEN=valid_token';
      
      await authApi.refreshCsrfCookie();
      
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('http://selarasa:8001/sanctum/csrf-cookie', { timeout: 15000 });
    });

    it('[Corner Case] ensureCsrfCookie() menembak API jika cookie dihapus setelah pertama kali dicek', async () => {
      // Pertama kali cookie ada
      document.cookie = 'XSRF-TOKEN=valid_token';
      await authApi.ensureCsrfCookie();
      expect(api.get).not.toHaveBeenCalled();
      
      // Hapus cookie
      document.cookie = 'XSRF-TOKEN=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
      
      // Kedua kali cookie tidak ada
      await authApi.ensureCsrfCookie();
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });
});