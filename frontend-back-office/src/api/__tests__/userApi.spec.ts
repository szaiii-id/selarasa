import { describe, it, expect, beforeEach, vi } from 'vitest';
import { userApi } from '../userApi'; 
import api from '../axios';
import type { UserPayload, UserFilters } from '@/types/user';

// Mocking instance axios agar tidak melakukan request HTTP sungguhan
vi.mock('../axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('userApi Service (Fokus Logika Parameter & API Wrapper)', () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Bersihkan history panggilan mock sebelum tiap tes
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('Happy Path: createUser() memanggil endpoint POST dengan payload yang benar', () => {
      const payload: UserPayload = { 
        name: 'Budi', 
        username: 'budi', 
        role: 'cashier',
        is_active: true
      };
      
      userApi.createUser(payload);

      expect(api.post).toHaveBeenCalledWith('/backoffice/users', payload);
    });

    it('Happy Path: getUserById() memanggil endpoint GET dengan ID spesifik', () => {
      const id = 'uuid-1234';
      userApi.getUserById(id);

      expect(api.get).toHaveBeenCalledWith(`/backoffice/users/${id}`);
    });

    it('Negative Path: Error dari axios langsung diteruskan (rejection tidak ditelan oleh service)', async () => {
      const mockError = new Error('Network Error');
      // Memaksa axios untuk gagal
      vi.mocked(api.delete).mockRejectedValueOnce(mockError);

      // Memastikan userApi melempar error yang sama
      await expect(userApi.deleteUser('uuid-1')).rejects.toThrow('Network Error');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('Partisi 1 (Tanpa Parameter): getUsers() otomatis menggunakan object kosong default {}', () => {
      userApi.getUsers();

      expect(api.get).toHaveBeenCalledWith('/backoffice/users', { params: {} });
    });

    it('Partisi 2 (Dengan Parameter Penuh): getUsers() meneruskan semua filter yang diberikan', () => {
      const filters: UserFilters = { search: 'admin', role: 'manager', is_active: true, page: 2 };
      userApi.getUsers(filters);

      expect(api.get).toHaveBeenCalledWith('/backoffice/users', { params: filters });
    });

    it('Partisi 3 (Payload Parsial): updateUser() berhasil menerima hanya sebagian tipe UserPayload (Partial)', () => {
      // Karena tipenya Partial<UserPayload>, kita bisa kirim 1 atribut saja
      const partialPayload = { is_active: false };
      
      userApi.updateUser('uuid-1234', partialPayload);

      expect(api.put).toHaveBeenCalledWith('/backoffice/users/uuid-1234', partialPayload);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('Batas Bawah Parameter ID: Menyuntikkan string kosong ("") pada deactivateUser', () => {
      // Meskipun ini tidak valid secara sistem, kita memastikan service tetap merangkai URL
      userApi.deactivateUser('');

      expect(api.patch).toHaveBeenCalledWith('/backoffice/users//deactivate');
    });

    it('Batas Bawah Payload: updateUser() dengan object payload yang benar-benar kosong {}', () => {
      // Menguji batasan bawah dari Partial<T>
      userApi.updateUser('uuid-1234', {});

      expect(api.put).toHaveBeenCalledWith('/backoffice/users/uuid-1234', {});
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    
    it('Edge Case: URL terangkai dengan benar meskipun ID mengandung spasi atau karakter aneh (URL Encoding diserahkan ke Axios)', () => {
      const weirdId = 'id aneh dengan spasi dan @!#';
      
      userApi.activateUser(weirdId);

      // Memastikan userApi tidak memotong string, meneruskan mentah-mentah
      expect(api.patch).toHaveBeenCalledWith(`/backoffice/users/${weirdId}/activate`);
    });

    it('Corner Case: getUsers() menerima nilai undefined pada properti filternya', () => {
      // Terkadang router/vue mengirimkan undefined untuk state yang belum terisi
      const cornerFilters = { search: undefined, role: 'admin' };
      
      userApi.getUsers(cornerFilters as any);

      // Memastikan object dengan undefined diteruskan persis apa adanya.
      // (Nantinya Axios secara otomatis membuang key bernilai undefined saat membuat Query String).
      expect(api.get).toHaveBeenCalledWith('/backoffice/users', { params: cornerFilters });
    });

  });
});