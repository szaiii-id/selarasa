// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import AxiosMockAdapter from 'axios-mock-adapter';
import { AxiosError } from 'axios';
import api from '../axios';

describe('Axios Global Interceptor Logic (axios.ts)', () => {
  let mock: AxiosMockAdapter;
  let replaceMock: Mock;

  beforeEach(() => {
    // 1. Inisialisasi Mock Adapter
    mock = new AxiosMockAdapter(api);

    // 2. Setup window mock dengan type assertion
    replaceMock = vi.fn();
    vi.stubGlobal('window', {
      location: {
        pathname: '/dashboard',
        replace: replaceMock,
      }
    });
  });

  afterEach(() => {
    mock.reset();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // Helper function untuk mengambil error dengan type assertion
  const getAxiosError = async (request: Promise<any>): Promise<AxiosError & { userMessage?: string }> => {
    try {
      await request;
      throw new Error('Request should have failed');
    } catch (error) {
      return error as AxiosError & { userMessage?: string };
    }
  };

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Mengembalikan respons utuh saat HTTP 200 (Success)', async () => {
      const mockData = { id: 1, name: 'Product A' };
      mock.onGet('/products').reply(200, mockData);

      const response = await api.get('/products');
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual(mockData);
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Happy Path] Mengembalikan respons utuh saat HTTP 201 (Created)', async () => {
      const mockData = { id: 2, name: 'New Product' };
      mock.onPost('/products').reply(201, mockData);

      const response = await api.post('/products', { name: 'New Product' });
      
      expect(response.status).toBe(201);
      expect(response.data).toEqual(mockData);
    });

    it('[Happy Path] Mengembalikan respons utuh saat HTTP 204 (No Content)', async () => {
      mock.onDelete('/products/1').reply(204);

      const response = await api.delete('/products/1');
      
      expect(response.status).toBe(204);
    });

    it('[Negative Path] HTTP 401 mengarahkan user ke halaman /login (Redirect)', async () => {
      mock.onGet('/protected-data').reply(401);

      await expect(api.get('/protected-data')).rejects.toThrow();
      
      expect(replaceMock).toHaveBeenCalledWith('/login');
      expect(replaceMock).toHaveBeenCalledTimes(1);
    });

    it('[Negative Path] HTTP 500 menambahkan userMessage custom', async () => {
      mock.onGet('/server-error').reply(500);

      const error = await getAxiosError(api.get('/server-error'));
      
      expect(error.userMessage).toBe('Server is currently unavailable. Please try again later.');
      expect(error.message).toBe('Request failed with status code 500');
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =====================================================================
  describe('Equivalence Partitioning (Error Code Grouping)', () => {
    it('[Partisi 1 - Client Error 4xx selain 401] Diteruskan tanpa modifikasi', async () => {
      mock.onGet('/data-403').reply(403, { message: 'Forbidden' });
      mock.onGet('/data-404').reply(404, { message: 'Not Found' });
      mock.onPost('/data-422').reply(422, { message: 'Validation Error' });

      const error403 = await getAxiosError(api.get('/data-403'));
      expect(error403.response?.status).toBe(403);
      expect(error403.userMessage).toBeUndefined();
      
      const error404 = await getAxiosError(api.get('/data-404'));
      expect(error404.response?.status).toBe(404);
      expect(error404.userMessage).toBeUndefined();
      
      const error422 = await getAxiosError(api.post('/data-422'));
      expect(error422.response?.status).toBe(422);
      expect(error422.userMessage).toBeUndefined();
      
      // Tidak ada redirect untuk error 4xx selain 401
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Partisi 2 - Server Error 5xx] Diberikan custom userMessage', async () => {
      mock.onGet('/server-error-500').reply(500);
      mock.onGet('/server-error-502').reply(502);
      mock.onGet('/server-error-503').reply(503);

      const error500 = await getAxiosError(api.get('/server-error-500'));
      expect(error500.userMessage).toBe('Server is currently unavailable. Please try again later.');
      
      const error502 = await getAxiosError(api.get('/server-error-502'));
      expect(error502.userMessage).toBe('Server is currently unavailable. Please try again later.');
      
      const error503 = await getAxiosError(api.get('/server-error-503'));
      expect(error503.userMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('[Partisi 3 - Success 2xx] Tidak ada interceptor yang mengubah respons', async () => {
      const mockData = { status: 'ok' };
      mock.onGet('/success-200').reply(200, mockData);
      mock.onPost('/success-201').reply(201, mockData);

      const response200 = await api.get('/success-200');
      const response201 = await api.post('/success-201');

      expect(response200.status).toBe(200);
      expect(response200.data).toEqual(mockData);
      expect(response201.status).toBe(201);
      expect(response201.data).toEqual(mockData);
    });

    it('[Partisi 4 - Redirect 3xx] Diteruskan tanpa modifikasi', async () => {
      mock.onGet('/redirect').reply(302);

      const error = await getAxiosError(api.get('/redirect'));
      expect(error.response?.status).toBe(302);
      expect(error.userMessage).toBeUndefined();
      
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =====================================================================
  describe('Boundary Value Analysis (BVA) untuk logika "status >= 500"', () => {
    it('[BVA - Di bawah batas: HTTP 499] Diteruskan secara mentah', async () => {
      mock.onGet('/bva-499').reply(499);

      const error = await getAxiosError(api.get('/bva-499'));
      expect(error.response?.status).toBe(499);
      expect(error.userMessage).toBeUndefined();
    });

    it('[BVA - Tepat pada batas bawah: HTTP 500] Memiliki custom userMessage', async () => {
      mock.onGet('/bva-500').reply(500);

      const error = await getAxiosError(api.get('/bva-500'));
      expect(error.response?.status).toBe(500);
      expect(error.userMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('[BVA - Tepat di atas batas: HTTP 501] Memiliki custom userMessage', async () => {
      mock.onGet('/bva-501').reply(501);

      const error = await getAxiosError(api.get('/bva-501'));
      expect(error.response?.status).toBe(501);
      expect(error.userMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('[BVA - Jauh di atas batas: HTTP 599] Memiliki custom userMessage', async () => {
      mock.onGet('/bva-599').reply(599);

      const error = await getAxiosError(api.get('/bva-599'));
      expect(error.response?.status).toBe(599);
      expect(error.userMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('[BVA - Batas untuk 401: HTTP 400] Tidak redirect', async () => {
      mock.onGet('/bva-400').reply(400);

      const error = await getAxiosError(api.get('/bva-400'));
      expect(error.response?.status).toBe(400);
      
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[BVA - Batas untuk 401: HTTP 402] Tidak redirect', async () => {
      mock.onGet('/bva-402').reply(402);

      const error = await getAxiosError(api.get('/bva-402'));
      expect(error.response?.status).toBe(402);
      
      expect(replaceMock).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 4. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] HTTP 401 saat URL request adalah "/auth/me" -> TIDAK redirect', async () => {
      mock.onGet('/api/v1/auth/me').reply(401);

      await expect(api.get('/api/v1/auth/me')).rejects.toThrow();
      
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Edge Case] HTTP 401 saat user sudah di "/login" -> TIDAK redirect berulang', async () => {
      window.location.pathname = '/login';
      mock.onGet('/trigger-401').reply(401);

      await expect(api.get('/trigger-401')).rejects.toThrow();
      
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Edge Case] HTTP 401 dengan URL mengandung "auth/me" di tengah -> TIDAK redirect', async () => {
      mock.onGet('/some/path/auth/me/details').reply(401);

      await expect(api.get('/some/path/auth/me/details')).rejects.toThrow();
      
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Corner Case] Network Error (error.response undefined) tidak crash', async () => {
      mock.onGet('/network-error').networkError();

      await expect(api.get('/network-error')).rejects.toThrow();
      
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Corner Case] Request timeout tidak crash', async () => {
      mock.onGet('/timeout').timeout();

      await expect(api.get('/timeout')).rejects.toThrow();
      
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('[Edge Case] HTTP 500 pada URL "/auth/me" tetap memberikan custom userMessage', async () => {
      mock.onGet('/auth/me').reply(500);

      const error = await getAxiosError(api.get('/auth/me'));
      expect(error.userMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('[Corner Case] Error dengan config undefined tidak crash', async () => {
      mock.onGet('/no-config').reply(() => {
        const error = new Error('Network Error') as Error & { config?: undefined };
        error.config = undefined;
        throw error;
      });

      await expect(api.get('/no-config')).rejects.toThrow();
    });
  });

  // =====================================================================
  // 5. INTERCEPTOR CONFIGURATION TESTS
  // =====================================================================
  describe('Interceptor Configuration', () => {
    it('Memiliki baseURL yang benar', () => {
      expect(api.defaults.baseURL).toBeDefined();
      expect(api.defaults.baseURL).toContain('http');
    });

    it('Memiliki timeout 8000ms', () => {
      expect(api.defaults.timeout).toBe(8000);
    });

    it('Memiliki header Accept: application/json', () => {
      expect(api.defaults.headers['Accept']).toBe('application/json');
    });

    it('Memiliki header Content-Type: application/json', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('Mengaktifkan withCredentials untuk Sanctum SPA', () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it('Mengaktifkan withXSRFToken untuk CSRF protection', () => {
      expect(api.defaults.withXSRFToken).toBe(true);
    });
  });

  // =====================================================================
  // 6. RESPONSE INTERCEPTOR BEHAVIOR
  // =====================================================================
  describe('Response Interceptor Behavior', () => {
    it('Meneruskan response success tanpa modifikasi', async () => {
      const mockData = { data: 'test' };
      
      mock.onGet('/success').reply(200, mockData);

      const response = await api.get('/success');
      
      // Verifikasi data dan status
      expect(response.data).toEqual(mockData);
      expect(response.status).toBe(200);
      
      // Verifikasi headers ada
      expect(response.headers).toBeDefined();
      
      // Verifikasi config ada
      expect(response.config).toBeDefined();
      expect(response.config.url).toBe('/success');
    });

    it('Menambahkan userMessage untuk error 5xx', async () => {
      mock.onGet('/server-error').reply(500);

      const error = await getAxiosError(api.get('/server-error'));
      expect(error.userMessage).toBe('Server is currently unavailable. Please try again later.');
    });

    it('Tidak menambahkan userMessage untuk error 4xx', async () => {
      mock.onGet('/client-error').reply(400);

      const error = await getAxiosError(api.get('/client-error'));
      expect(error.userMessage).toBeUndefined();
    });

    it('Redirect untuk setiap 401 error (bukan hanya sekali)', async () => {
      // Reset mock antara request
      replaceMock.mockClear();
      
      mock.onGet('/protected-1').reply(401);
      await expect(api.get('/protected-1')).rejects.toThrow();
      expect(replaceMock).toHaveBeenCalledTimes(1);
      
      // Reset mock untuk request kedua
      replaceMock.mockClear();
      
      mock.onGet('/protected-2').reply(401);
      await expect(api.get('/protected-2')).rejects.toThrow();
      expect(replaceMock).toHaveBeenCalledTimes(1);
    });
  });
});