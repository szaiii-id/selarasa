// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import api from '../axios'; // Sesuaikan jika perlu

describe('Axios Global Interceptor Logic (axios.ts)', () => {
  let mock: AxiosMockAdapter;

  beforeEach(() => {
    // 1. Inisialisasi Mock Adapter
    mock = new AxiosMockAdapter(api);

    // 2. Cara paling aman dan bersih (Best Practice) untuk memanipulasi window di Vitest
    vi.stubGlobal('window', {
      location: {
        pathname: '/dashboard', // Asumsikan user sedang ada di dalam aplikasi
        replace: vi.fn(),       // Pantau fungsi replace
      }
    });
  });

  afterEach(() => {
    mock.reset();
    vi.unstubAllGlobals(); // Bersihkan semua mock global (termasuk window tiruan) setelah tiap tes
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('Happy Path: Mengembalikan respons utuh saat HTTP 200 (Success)', async () => {
      const mockData = { id: 1, name: 'Product A' };
      mock.onGet('/products').reply(200, mockData);

      const response = await api.get('/products');
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
    });

    it('Negative Path: HTTP 401 mengarahkan user ke halaman /login (Redirect)', async () => {
      mock.onGet('/protected-data').reply(401);

      await expect(api.get('/protected-data')).rejects.toThrow();
      expect(window.location.replace).toHaveBeenCalledWith('/login');
      expect(window.location.replace).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =====================================================================
  describe('Equivalence Partitioning (Error Code Grouping)', () => {
    it('Meneruskan error mentah untuk status HTTP Client Error spesifik (403, 404, 422)', async () => {
      mock.onGet('/data-403').reply(403, { message: 'Forbidden' });
      mock.onPost('/data-422').reply(422, { message: 'Validation Error' });

      await expect(api.get('/data-403')).rejects.toMatchObject({ response: { status: 403 } });
      await expect(api.post('/data-422')).rejects.toMatchObject({ response: { status: 422 } });
      
      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('Melempar custom error spesifik "Too many requests" saat status HTTP 429', async () => {
      mock.onGet('/spam-api').reply(429);

      await expect(api.get('/spam-api')).rejects.toThrowError('Too many requests. Please try again later.');
    });
  });

  // =====================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =====================================================================
  describe('Boundary Value Analysis (BVA) untuk logika "status >= 500"', () => {
    it('Tepat di bawah batas (HTTP 499): Diteruskan secara mentah', async () => {
      mock.onGet('/bva-499').reply(499);

      await expect(api.get('/bva-499')).rejects.toMatchObject({ response: { status: 499 } });
    });

    it('Tepat pada batas bawah (HTTP 500): Dilempar sebagai Custom Server Error', async () => {
      mock.onGet('/bva-500').reply(500);

      await expect(api.get('/bva-500')).rejects.toThrowError('Server is currently unavailable. Please try again later.');
    });

    it('Jauh di atas batas (HTTP 599): Dilempar sebagai Custom Server Error', async () => {
      mock.onGet('/bva-599').reply(599);

      await expect(api.get('/bva-599')).rejects.toThrowError('Server is currently unavailable. Please try again later.');
    });
  });

  // =====================================================================
  // 4. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('Edge Case: HTTP 401 saat URL request adalah "/auth/me" -> TIDAK boleh redirect', async () => {
      mock.onGet('/api/v1/auth/me').reply(401);

      await expect(api.get('/api/v1/auth/me')).rejects.toThrow();
      expect(window.location.replace).not.toHaveBeenCalled(); 
    });

    it('Edge Case: HTTP 401 saat user sudah berada di "/login" -> TIDAK boleh redirect berulang', async () => {
      window.location.pathname = '/login'; // Manipulasi state
      mock.onGet('/trigger-401').reply(401);

      await expect(api.get('/trigger-401')).rejects.toThrow();
      expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('Corner Case: Error jaringan / Network Error (error.response undefined) tidak membuat sistem crash', async () => {
      mock.onGet('/network-error').networkError();

      await expect(api.get('/network-error')).rejects.toThrow();
    });
  });
});