import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTableFilters } from '@/composables/useTableFilters'; // Sesuaikan path jika perlu
import { useRoute, useRouter } from 'vue-router';
import { onUnmounted } from 'vue';

// 1. Mock Vue Router
vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn(),
}));

// 2. Mock fungsi onUnmounted dari Vue agar kita bisa menguji pembersihannya tanpa harus me-mount komponen sungguhan
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

describe('useTableFilters Composable (Function-Level Unit Testing)', () => {
  const mockFetchCallback = vi.fn();
  const mockRouterReplace = vi.fn().mockResolvedValue(true);
  let mockRouteQuery: Record<string, any> = {};

beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers(); 

    // ---> TAMBAHKAN BARIS INI UNTUK MENCEGAH KEBOCORAN STATE <---
    mockRouteQuery = {}; 

    // Setup default mock return values
    vi.mocked(useRouter).mockReturnValue({ replace: mockRouterReplace } as any);
    vi.mocked(useRoute).mockImplementation(() => ({ query: mockRouteQuery } as any));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultFilters = { search: '', role: 'all', is_active: true, page: 1 };

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH (Jalur Normal Inisialisasi & Navigasi)
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menginisialisasi state filter menggunakan defaultFilters jika URL kosong', () => {
      mockRouteQuery = {}; // URL bersih
      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);
      
      expect(filters.value).toEqual(defaultFilters);
    });

    it('[Happy Path] changePage() mengubah halaman, mensinkronkan URL, dan memanggil API langsung tanpa jeda', () => {
      const { filters, changePage } = useTableFilters(defaultFilters, mockFetchCallback);
      
      changePage(3); // Pindah ke halaman 3

      expect(filters.value.page).toBe(3);
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: { is_active: 'true', page: '3', role: 'all' } });
      expect(mockFetchCallback).toHaveBeenCalledTimes(1); // Dipanggil langsung, bukan setTimeout
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Partisi Parsing Tipe Data dari URL)
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi URL Parsing] Tipe String, Number, dan Boolean diubah dengan akurat dari URL String', () => {
      // Di URL, semua parameter ditangkap sebagai String ('true', '5', 'admin')
      mockRouteQuery = { search: 'admin', is_active: 'false', page: '5' };
      
      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);

      // Pastikan tipe datanya dikonversi dengan benar sesuai cetakan defaultFilters
      expect(filters.value.search).toBe('admin');      // String
      expect(filters.value.is_active).toBe(false);     // Strict Boolean (bukan string 'false')
      expect(filters.value.page).toBe(5);              // Strict Number (bukan string '5')
    });

    it('[Partisi Sinkronisasi] Nilai kosong ("" atau null) dihapus dari URL agar tetap bersih', () => {
      const { filters, syncToUrl } = useTableFilters(defaultFilters, mockFetchCallback);
      
      filters.value.search = '';
      filters.value.role = null as any;
      
      syncToUrl();

      // Parameter 'search' dan 'role' harus musnah dari argument router.replace
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: { is_active: 'true' } });
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS / BVA (Batas Waktu Debounce & Logika Pagination)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[Time Boundary] applyFilters() memanggil callback TEPAT di 300ms, tidak di 299ms', () => {
      const { applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);
      
      applyFilters();

      vi.advanceTimersByTime(299);
      expect(mockFetchCallback).not.toHaveBeenCalled(); // 299ms belum dipanggil

      vi.advanceTimersByTime(1);
      expect(mockFetchCallback).toHaveBeenCalledTimes(1); // Tepat 300ms dipanggil
    });

    it('[Page Number Boundary] page = 1 TIDAK dimasukkan ke URL, page > 1 DIMASUKKAN ke URL', () => {
      const { filters, syncToUrl } = useTableFilters(defaultFilters, mockFetchCallback);
      
      // Batas 1: Halaman 1
      filters.value.page = 1;
      syncToUrl();
      expect(mockRouterReplace.mock.calls[0][0].query.page).toBeUndefined(); 

      // Batas 2: Halaman 2
      filters.value.page = 2;
      syncToUrl();
      expect(mockRouterReplace.mock.calls[1][0].query.page).toBe('2');
    });
  });

  // =========================================================================
  // 4. EDGE & CORNER CASES (Perilaku Ekstrem Debounce & Memory Leak)
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Spam Ketikan] Debounce me-reset timer jika applyFilters dipanggil beruntun (hanya dieksekusi 1x)', () => {
      const { applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);
      
      // User mengetik "b", "r", "i", "a", "n" dengan sangat cepat (jeda 100ms)
      applyFilters(); // "b"
      vi.advanceTimersByTime(100);
      
      applyFilters(); // "r"
      vi.advanceTimersByTime(100);
      
      applyFilters(); // "i"
      vi.advanceTimersByTime(100);

      // Secara total waktu sudah berjalan 300ms dari ketikan pertama, 
      // TAPI fungsi tidak boleh dipanggil karena timer terus direset!
      expect(mockFetchCallback).not.toHaveBeenCalled();

      // Barulah 300ms setelah ketikan terakhir, fungsi dipanggil 1x saja
      vi.advanceTimersByTime(300);
      expect(mockFetchCallback).toHaveBeenCalledTimes(1);
    });

    it('[Corner Case - Auto Reset Page] applyFilters() selalu memaksa page kembali ke 1 saat pencarian berubah', () => {
      const { filters, applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);
      
      filters.value.page = 5; // Posisi user sedang di halaman 5
      
      // User mengetik pencarian baru
      applyFilters();
      vi.advanceTimersByTime(300);

      // Harus dikembalikan ke halaman 1 agar data tidak kosong/error
      expect(filters.value.page).toBe(1);
    });

    it('[Edge Case - Memory Leak Cleanup] onUnmounted dipanggil dan membersihkan debounce timer', () => {
      // Kita memonitor apakah fungsi onUnmounted dari Vue benar-benar didaftarkan oleh Composable ini
      useTableFilters(defaultFilters, mockFetchCallback);
      
      expect(onUnmounted).toHaveBeenCalledTimes(1);
      
      // Ambil callback yang didaftarkan ke onUnmounted, lalu jalankan
      const unmountCallback = vi.mocked(onUnmounted).mock.calls[0][0];
      unmountCallback();

      // Secara teori, timer (clearTimeout) telah tereksekusi sehingga jika kita majukan 300ms, callback tidak akan jalan
      vi.advanceTimersByTime(300);
      expect(mockFetchCallback).not.toHaveBeenCalled();
    });
  });
});