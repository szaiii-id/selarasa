import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUserStore } from '../userStore';
import { userApi } from '@/api/userApi';
import type { UserPayload } from '@/types/user';

// 1. Mock module userApi
vi.mock('../../api/userApi', () => ({
  userApi: {
    getUsers: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deactivateUser: vi.fn(),
    activateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

describe('useUserStore (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    // Reset Pinia dan Mocks sebelum setiap tes berjalan
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH (Testing Jalur Normal vs Gagal)
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] fetchUsers() berhasil mengambil data, mengisi state users, dan set pagination', async () => {
      const store = useUserStore();
      const mockUsers = [{ id: '1', name: 'Admin', role: 'admin' }];
      const mockMeta = { current_page: 2, last_page: 5, per_page: 15, total: 50 };

      vi.mocked(userApi.getUsers).mockResolvedValueOnce({
        data: { data: mockUsers, meta: mockMeta },
      } as any);

      const success = await store.fetchUsers({ page: 2 });

      expect(success).toBe(true);
      expect(store.users).toEqual(mockUsers);
      expect(store.pagination.current_page).toBe(2);
      expect(store.pagination.total).toBe(50);
      expect(store.errorMessage).toBeNull();
    });

    it('[Happy Path] createUser() memanggil API, melakukan refetch di halaman 1, dan mereturn data', async () => {
      const store = useUserStore();
      const payload: UserPayload = { name: 'Kasir', username: 'kasir', role: 'cashier' };
      const responseData = { id: '2', pin_code: '123456', ...payload };

      vi.mocked(userApi.createUser).mockResolvedValueOnce({ data: { data: responseData } } as any);
      vi.mocked(userApi.getUsers).mockResolvedValueOnce({ data: { data: [], meta: {} } } as any);

      const result = await store.createUser(payload);

      expect(userApi.createUser).toHaveBeenCalledWith(payload);
      expect(userApi.getUsers).toHaveBeenCalledWith({ per_page: 15, page: 1 }); // Harus kembali ke halaman 1
      expect(result).toEqual(responseData);
    });

    it('[Negative Path] deleteUser() mengembalikan false dan mengisi errorMessage saat API gagal', async () => {
      const store = useUserStore();
      
      vi.mocked(userApi.deleteUser).mockRejectedValueOnce({
        response: { data: { message: 'Cannot delete active user.' } }
      });

      const success = await store.deleteUser('uuid-1');

      expect(success).toBe(false);
      expect(store.errorMessage).toBe('Cannot delete active user.');
      // Refetch (getUsers) TIDAK boleh dipanggil jika proses mutasi gagal
      expect(userApi.getUsers).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Testing Partisi Response Error)
  // =========================================================================
  describe('Equivalence Partitioning (Error Handling)', () => {
    it('[Invalid Input Partition - 422] memilah HTTP 422 ke validationErrors dan mengosongkan errorMessage', async () => {
      const store = useUserStore();
      const mockErrors = { username: ['The username has already been taken.'] };

      vi.mocked(userApi.updateUser).mockRejectedValueOnce({
        response: { status: 422, data: { errors: mockErrors } }
      });

      const success = await store.updateUser('1', { username: 'admin' });

      expect(success).toBe(false);
      expect(store.validationErrors).toEqual(mockErrors);
      expect(store.errorMessage).toBeNull(); 
    });

    it('[Forbidden/Conflict Partition - 403] memilah HTTP 403, mengosongkan validationErrors, dan mengisi errorMessage', async () => {
      const store = useUserStore();
      store.validationErrors = { old_error: ['test'] }; // State memiliki sisa error sebelumnya

      vi.mocked(userApi.updateUser).mockRejectedValueOnce({
        response: { status: 403, data: { message: 'Only administrators can assign admin role.' } }
      });

      await store.updateUser('1', { role: 'admin' });

      expect(store.errorMessage).toBe('Only administrators can assign admin role.');
      expect(store.validationErrors).toEqual({}); // Harus dikosongkan
    });

    it('[Network Issue Partition] mendeteksi timeout (ECONNABORTED) dan menampilkan pesan fallback khusus jaringan', async () => {
      const store = useUserStore();

      // INI YANG BENAR
      vi.mocked(userApi.getUsers).mockRejectedValueOnce({
        code: 'ECONNABORTED'
      });

      await store.fetchUsers(); // Tetap panggil action store.fetchUsers()

      expect(store.errorMessage).toBe('Slow network connection. Please check your internet and try again.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS / BVA (Testing Batas State & Fallback)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - 1 to 0 boundary] clearError() menghapus kunci objek satu per satu hingga habis', () => {
      const store = useUserStore();
      store.validationErrors = { username: ['Err1'], role: ['Err2'] };

      // Hapus yang pertama
      store.clearError('username');
      expect(store.validationErrors.username).toBeUndefined();
      expect(store.validationErrors.role).toBeDefined();
      expect(Object.keys(store.validationErrors).length).toBe(1);

      // Hapus batas terakhir (menjadi 0)
      store.clearError('role');
      expect(Object.keys(store.validationErrors).length).toBe(0);
    });

    it('[BVA - Invalid Boundary] clearError() tidak mengubah state jika field yang dihapus tidak ada', () => {
      const store = useUserStore();
      store.validationErrors = { name: ['Required'] };
      
      store.clearError('password'); // Field tidak ada

      expect(Object.keys(store.validationErrors).length).toBe(1);
      expect(store.validationErrors.name).toBeDefined();
    });

    it('[BVA - Fallback Data Kosong] fetchUsers() menggunakan nilai default (1 & 0) jika meta data dari API hilang/kosong', async () => {
      const store = useUserStore();
      
      // Simulasi backend mengembalikan JSON rusak (tanpa object 'meta')
      vi.mocked(userApi.getUsers).mockResolvedValueOnce({
        data: { data: [] } // Tidak ada .meta
      } as any);

      await store.fetchUsers();

      expect(store.pagination.current_page).toBe(1);
      expect(store.pagination.last_page).toBe(1);
      expect(store.pagination.total).toBe(0);
    });
  });

  // =========================================================================
  // 4. EDGE & CORNER CASES (Testing Kondisi Ekstrem di Level Fungsi)
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    
    it('[Corner Case - Pagination Memory] updateUser() melakukan refetch pada current_page yang sedang aktif, BUKAN page 1', async () => {
      const store = useUserStore();
      
      // Kondisikan user sedang berada di halaman 4
      store.pagination.current_page = 4;
      store.pagination.per_page = 15;

      vi.mocked(userApi.updateUser).mockResolvedValueOnce({} as any);
      vi.mocked(userApi.getUsers).mockResolvedValueOnce({ data: { data: [] } } as any);

      await store.updateUser('1', { name: 'Update' });

      // Memastikan pemanggilan ulang tabel mempertahankan posisi halaman user
      expect(userApi.getUsers).toHaveBeenCalledWith({ per_page: 15, page: 4 });
    });

    it('[Edge Case - Malformed Nested JSON] fetchUserById() fallback membaca respons mentah jika wrapper `data` tidak bersarang', async () => {
      const store = useUserStore();
      const mockRawData = { id: 'uuid-99', name: 'Weird Format API' };
      
      // API mereturn { data: { id: ... } } alih-alih { data: { data: { id: ... } } }
      vi.mocked(userApi.getUserById).mockResolvedValueOnce({
        data: mockRawData 
      } as any);

      const result = await store.fetchUserById('uuid-99');

      // Harusnya baris `response.data?.data || response.data` menyelematkan data ini
      expect(result).toEqual(mockRawData);
    });

    it('[Edge Case - Unknown Error Structure] handleError() memberikan default message jika response body sama sekali tidak terbaca', async () => {
      const store = useUserStore();

      // Error aneh tanpa format Axios yang standar
      vi.mocked(userApi.activateUser).mockRejectedValueOnce(new Error('Unknown native error'));

      const success = await store.activateUser('1');

      expect(success).toBe(false);
      // Memastikan fallback default message yang dipassing ke handleError bekerja
      expect(store.errorMessage).toBe('Failed to activate user.');
    });

  });
});