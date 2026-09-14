import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTableFilters } from '@/composables/useTableFilters';
import { useRoute, useRouter } from 'vue-router';
import { onUnmounted } from 'vue';

// ============================================================
// 1. MOCK VUE ROUTER
// ============================================================
vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn(),
}));

// ============================================================
// 2. MOCK onUnmounted DARI VUE
// ============================================================
// Kita ganti onUnmounted dengan vi.fn() agar bisa:
// - Memastikan composable benar-benar mendaftarkan cleanup
// - Mengambil callback-nya secara manual untuk diuji
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

describe('useTableFilters Composable (Function-Level Unit Testing)', () => {
  // ==========================================================
  // SHARED MOCKS
  // ==========================================================
  const mockFetchCallback = vi.fn();
  const mockRouterReplace = vi.fn().mockResolvedValue(true);

  // Gunakan objek mutable + getter supaya reassign `mockRouteQuery`
  // di dalam test tetap terbaca oleh mock useRoute().
  let mockRouteQuery: Record<string, any> = {};
  const routeMock = {
    get query() {
      return mockRouteQuery;
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockRouteQuery = {};

    vi.mocked(useRouter).mockReturnValue({ replace: mockRouterReplace } as any);
    vi.mocked(useRoute).mockReturnValue(routeMock as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultFilters = { search: '', role: 'all', is_active: true, page: 1 };

  // ==========================================================
  // HELPER: Ambil callback cleanup dari onUnmounted
  // Menghindari TS2532 "Object is possibly undefined"
  // ==========================================================
  const getRegisteredUnmountCallback = (): (() => void) => {
    const calls = vi.mocked(onUnmounted).mock.calls;
    if (calls.length === 0) {
      throw new Error('onUnmounted tidak pernah dipanggil oleh composable');
    }
    // Cast karena signature onUnmounted kompleks
    return calls[0]![0] as unknown as () => void;
  };

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Inisialisasi state filter memakai defaultFilters jika URL kosong', () => {
      mockRouteQuery = {};
      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);

      // filters adalah reactive object, bukan ref
      expect(filters).toEqual(defaultFilters);
    });

    it('[Happy Path] changePage() mengubah halaman, sync URL, dan fetch langsung tanpa debounce', () => {
      const { filters, changePage } = useTableFilters(defaultFilters, mockFetchCallback);

      changePage(3);

      expect(filters.page).toBe(3);
      // Hanya `page` yang berbeda dari default → hanya itu yang masuk query
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: { page: '3' } });
      expect(mockFetchCallback).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] changePage() tidak melakukan apa-apa jika tidak ada properti `page`', () => {
      const noPageDefaults = { search: '', role: 'all' };
      const { changePage } = useTableFilters(noPageDefaults, mockFetchCallback);

      changePage(2);

      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(mockFetchCallback).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Parsing Tipe Data dari URL)
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi URL Parsing] String, Number, Boolean dikonversi dengan akurat dari URL', () => {
      mockRouteQuery = { search: 'admin', is_active: 'false', page: '5' };

      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);

      expect(filters.search).toBe('admin');
      expect(filters.is_active).toBe(false); // boolean sejati
      expect(filters.page).toBe(5);          // number sejati
      expect(filters.role).toBe('all');      // tetap default karena tidak ada di URL
    });

    it('[Partisi URL Parsing] Nilai boolean tidak valid → fallback ke default', () => {
      mockRouteQuery = { is_active: 'yes' }; // bukan 'true'/'false'

      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);

      expect(filters.is_active).toBe(true); // default dipertahankan
    });

    it('[Partisi URL Parsing] Nilai number tidak valid → fallback ke default', () => {
      mockRouteQuery = { page: 'abc' };

      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);

      expect(filters.page).toBe(1); // default dipertahankan
    });

    it('[Partisi URL Parsing] Query array → ambil elemen pertama', () => {
      mockRouteQuery = { search: ['first', 'second'] };

      const { filters } = useTableFilters(defaultFilters, mockFetchCallback);

      expect(filters.search).toBe('first');
    });

    it('[Partisi Sinkronisasi] Nilai kosong / sama dengan default dihapus dari URL', () => {
      const { filters, syncToUrl } = useTableFilters(defaultFilters, mockFetchCallback);

      filters.search = '';
      filters.role = null as any;

      syncToUrl();

      // Tidak ada yang berbeda dari default → query kosong
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: {} });
    });

    it('[Partisi Sinkronisasi] Boolean false dan number 0 TETAP dimasukkan ke URL', () => {
      const { filters, syncToUrl } = useTableFilters(
        { search: '', is_active: true, count: 1 },
        mockFetchCallback
      );

      filters.is_active = false;
      filters.count = 0;

      syncToUrl();

      expect(mockRouterReplace).toHaveBeenCalledWith({
        query: { is_active: 'false', count: '0' },
      });
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[Time Boundary] applyFilters() memanggil callback TEPAT di 300ms, bukan di 299ms', () => {
      const { applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);

      applyFilters();

      vi.advanceTimersByTime(299);
      expect(mockFetchCallback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(mockFetchCallback).toHaveBeenCalledTimes(1);
    });

    it('[Page Number Boundary] page = 1 tidak masuk URL, page > 1 masuk URL', () => {
      const { filters, syncToUrl } = useTableFilters(defaultFilters, mockFetchCallback);

      filters.page = 1;
      syncToUrl();
      expect(mockRouterReplace.mock.calls[0]?.[0].query.page).toBeUndefined();

      filters.page = 2;
      syncToUrl();
      expect(mockRouterReplace.mock.calls[1]?.[0].query.page).toBe('2');
    });
  });

  // =========================================================================
  // 4. EDGE & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Spam Ketikan] Debounce reset timer, callback dieksekusi 1x', () => {
      const { applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);

      applyFilters();
      vi.advanceTimersByTime(100);
      applyFilters();
      vi.advanceTimersByTime(100);
      applyFilters();
      vi.advanceTimersByTime(100);

      // Total 300ms tapi timer sudah direset oleh panggilan terakhir
      expect(mockFetchCallback).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(mockFetchCallback).toHaveBeenCalledTimes(1);
    });

    it('[Corner Case - Auto Reset Page] applyFilters() memaksa page kembali ke 1', () => {
      const { filters, applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);

      filters.page = 5;

      applyFilters();
      vi.advanceTimersByTime(300);

      expect(filters.page).toBe(1);
    });

    it('[Corner Case - Auto Reset Page] tidak error jika tidak ada properti `page`', () => {
      const noPageDefaults = { search: '', role: 'all' };
      const { applyFilters } = useTableFilters(noPageDefaults, mockFetchCallback);

      expect(() => {
        applyFilters();
        vi.advanceTimersByTime(300);
      }).not.toThrow();

      expect(mockFetchCallback).toHaveBeenCalledTimes(1);
    });

    it('[Edge Case - resetFilters(false)] mengembalikan nilai default + sync + fetch', () => {
      const { filters, resetFilters } = useTableFilters(defaultFilters, mockFetchCallback);

      filters.search = 'changed';
      filters.page = 5;
      mockRouterReplace.mockClear();
      mockFetchCallback.mockClear();

      resetFilters();

      expect(filters.search).toBe('');
      expect(filters.page).toBe(1);
      expect(mockRouterReplace).toHaveBeenCalledWith({ query: {} });
      expect(mockFetchCallback).toHaveBeenCalledTimes(1);
    });

    it('[Edge Case - resetFilters(true)] silent: tidak sync & tidak fetch', () => {
      const { filters, resetFilters } = useTableFilters(defaultFilters, mockFetchCallback);

      filters.search = 'changed';
      mockRouterReplace.mockClear();
      mockFetchCallback.mockClear();

      resetFilters(true);

      expect(filters.search).toBe('');
      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(mockFetchCallback).not.toHaveBeenCalled();
    });

    it('[Edge Case - Memory Leak Cleanup] onUnmounted didaftarkan dan membersihkan debounce timer', () => {
      useTableFilters(defaultFilters, mockFetchCallback);

      // Pastikan onUnmounted dipanggil oleh composable
      expect(onUnmounted).toHaveBeenCalledTimes(1);

      // Ambil callback cleanup dengan helper (bebas TS2532)
      const unmountCallback = getRegisteredUnmountCallback();
      expect(typeof unmountCallback).toBe('function');

      // Jalankan cleanup
      unmountCallback();

      // Setelah cleanup, tidak boleh ada efek samping
      vi.advanceTimersByTime(300);
      expect(mockFetchCallback).not.toHaveBeenCalled();
    });

    it('[Edge Case - Memory Leak Cleanup] timer dibatalkan setelah unmount walau ada pending applyFilters', () => {
      const { applyFilters } = useTableFilters(defaultFilters, mockFetchCallback);

      // Jadwalkan timer
      applyFilters();

      // Ambil callback cleanup & jalankan
      const unmountCallback = getRegisteredUnmountCallback();
      unmountCallback();

      // Majukan waktu — timer seharusnya sudah dibatalkan
      vi.advanceTimersByTime(300);
      expect(mockFetchCallback).not.toHaveBeenCalled();
    });
  });
});