import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authApi } from '../authApi'; 
import api from '../axios';

// Mocking instance axios agar tidak melakukan request HTTP sungguhan
vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('authApi Service (Fokus Logika & Algoritma)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = ''; // Bersihkan cookie sebelum tiap tes

    // CARA BENAR di Vitest: Gunakan vi.stubEnv untuk memanipulasi .env
    vi.stubEnv('VITE_API_BASE_URL', 'http://backend.test/api/v1');
  });

  afterEach(() => {
    // CARA BENAR di Vitest: Kembalikan .env ke kondisi aslinya
    vi.unstubAllEnvs();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('Happy Path: login() memanggil endpoint POST dengan payload dan timeout yang benar', () => {
      const credentials = { username: 'admin', password: 'password123' };
      
      authApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/backoffice/auth/login', credentials, {
        timeout: 20000,
      });
    });

    it('Happy Path: getUser() memanggil endpoint GET auth/me', () => {
      authApi.getUser();

      expect(api.get).toHaveBeenCalledWith('/auth/me', {
        timeout: 8000,
      });
    });

    it('Negative Path: ensureCsrfCookie() menahan request (tidak memanggil API) jika token sudah ada', async () => {
      document.cookie = 'XSRF-TOKEN=valid_token; path=/';

      await authApi.ensureCsrfCookie();

      expect(api.get).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('Partisi 1 (Tanpa Config): logout() menggunakan timeout default 4000ms', () => {
      authApi.logout();

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {}, {
        timeout: 4000,
      });
    });

    it('Partisi 2 (Dengan Config): logout() menggabungkan config kustom (seperti AbortController)', () => {
      const controller = new AbortController();
      const customConfig = { signal: controller.signal };

      authApi.logout(customConfig);

      expect(api.post).toHaveBeenCalledWith('/auth/logout', {}, {
        timeout: 4000,
        signal: controller.signal,
      });
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('Batas Bawah: getSanctumUrl() menggunakan fallback ketika VITE_API_BASE_URL kosong', async () => {
      // Stub env dengan string kosong untuk memicu fallback || 'http://selarasa:8000'
      vi.stubEnv('VITE_API_BASE_URL', '');

      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('http://selarasa:8000/sanctum/csrf-cookie', expect.any(Object));
    });

    it('Batas Tepat: getSanctumUrl() berhasil memotong "/api/v1" jika string sama persis', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://production.com/api/v1');

      await authApi.refreshCsrfCookie();

      expect(api.get).toHaveBeenCalledWith('http://production.com/sanctum/csrf-cookie', expect.any(Object));
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    
    it('Edge Case: hasCsrfCookie() tidak tertipu oleh nama cookie yang mengandung kata XSRF-TOKEN di tengah (Substring trap)', async () => {
      // PERBAIKAN: Mocking gettter document.cookie secara eksplisit agar formatnya
      // terjamin menggunakan format "key=value; key2=value2" dengan spasi.
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'SESSION_ID=abc; MY_XSRF-TOKEN=fake; ANOTHER_COOKIE=123',
      });

      await authApi.ensureCsrfCookie();

      // Sekarang string terpecah menjadi: ["SESSION_ID=abc", "MY_XSRF-TOKEN=fake"]
      // "MY_XSRF-TOKEN=fake".startsWith("XSRF-TOKEN=") akan bernilai FALSE.
      // Karena false, artinya Token tidak ada, maka API HARUS DIPANGGIL (API di-Hit).
      expect(api.get).toHaveBeenCalled();
    });

    it('Corner Case: hasCsrfCookie() tetap mendeteksi XSRF-TOKEN valid meskipun berada di urutan paling akhir dari puluhan cookie', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'COOKIE_1=a; COOKIE_2=b; COOKIE_3=c; XSRF-TOKEN=real_token',
      });

      await authApi.ensureCsrfCookie();

      expect(api.get).not.toHaveBeenCalled();
    });

  });
});