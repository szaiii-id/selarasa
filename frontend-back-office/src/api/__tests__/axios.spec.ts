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
    // Mocking window.location.pathname dan href agar bisa dites di jsdom
    delete (window as any).location;
    window.location = {
      pathname: '/dashboard',
      href: '',
    } as any;
  });

  afterEach(() => {
    window.location = originalLocation;
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
  it('redirect ke /login saat terjadi HTTP 401 dan user BUKAN di halaman /login', async () => {
    window.location.pathname = '/dashboard';
    mock.onGet('/test-401').reply(401);

    await expect(api.get('/test-401')).rejects.toThrow();
    expect(window.location.href).toBe('/login');
  });

  it('TIDAK redirect ke /login saat terjadi HTTP 401 jika user SUDAH di halaman /login', async () => {
    window.location.pathname = '/login';
    mock.onGet('/test-401-login').reply(401);

    await expect(api.get('/test-401-login')).rejects.toThrow();
    // href tidak boleh berubah menjadi /login lagi (mencegah redirect loop)
    expect(window.location.href).not.toBe('/login');
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