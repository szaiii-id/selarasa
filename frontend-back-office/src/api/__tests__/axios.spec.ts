import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import api from '../axios'; // Sesuaikan lokasi impor file axios Anda
import MockAdapter from 'axios-mock-adapter';

// Menggunakan axios-mock-adapter agar tidak benar-benar menembak server asli
const mock = new MockAdapter(api);

describe('api (Axios Response Interceptors)', () => {
  // Simpan properti window.location asli agar bisa direstore
  const originalLocation = window.location;

  beforeEach(() => {
    mock.reset();
    // Mocking window.location.pathname dan fungsi replace agar bisa dipantau (spy) oleh vitest
    delete (window as any).location;
    window.location = {
      pathname: '/dashboard',
      replace: vi.fn(), // Menggunakan vi.fn() agar kita bisa mengecek apakah fungsi ini dipanggil
    } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY PATH: Respons 200 OK
  // =========================================================================
  it('mengembalikan respons normal tanpa modifikasi saat HTTP 200', async () => {
    mock.onGet('/test-200').reply(200, { message: 'success' });

    const response = await api.get('/test-200');
    expect(response.data.message).toBe('success');
  });

  // =========================================================================
  // 2. SECURITY & RECOVERY: HTTP 401 Unauthorized
  // =========================================================================
  it('redirect (replace) ke /login saat terjadi HTTP 401 dan user BUKAN di halaman /login', async () => {
    window.location.pathname = '/dashboard';
    mock.onGet('/test-401').reply(401);

    await expect(api.get('/test-401')).rejects.toThrow();
    
    // Pastikan window.location.replace dipanggil dengan parameter '/login'
    expect(window.location.replace).toHaveBeenCalledWith('/login');
  });

  it('TIDAK redirect ke /login saat terjadi HTTP 401 jika user SUDAH di halaman /login', async () => {
    window.location.pathname = '/login';
    mock.onGet('/test-401-login').reply(401);

    await expect(api.get('/test-401-login')).rejects.toThrow();
    
    // Pastikan replace TIDAK dipanggil agar tidak terjadi infinite loop
    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it('TIDAK redirect ke /login saat terjadi HTTP 401 jika request adalah endpoint auth/me (Initial Load)', async () => {
    window.location.pathname = '/dashboard';
    mock.onGet('/auth/me').reply(401); // Endpoint pengecualian

    await expect(api.get('/auth/me')).rejects.toThrow();
    
    // Pastikan replace TIDAK dipanggil karena diabaikan oleh isAuthCheck
    expect(window.location.replace).not.toHaveBeenCalled();
  });

  // =========================================================================
  // 3. RATE LIMITING: HTTP 429 Too Many Requests
  // =========================================================================
  it('mengubah pesan error saat terjadi HTTP 429 Rate Limit', async () => {
    mock.onGet('/test-429').reply(429);

    await expect(api.get('/test-429')).rejects.toThrow(
      'Too many requests. Please try again later.'
    );
  });

  // =========================================================================
  // 4. SERVER ERROR: HTTP 500+
  // =========================================================================
  it('mengubah pesan error saat terjadi HTTP 500 Internal Server Error', async () => {
    mock.onGet('/test-500').reply(500);

    await expect(api.get('/test-500')).rejects.toThrow(
      'Server is currently unavailable. Please try again later.'
    );
  });
});