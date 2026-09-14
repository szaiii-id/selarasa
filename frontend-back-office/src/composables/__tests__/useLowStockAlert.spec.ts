import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useLowStockAlert } from '../useLowStockAlert';
import api from '@/api/axios';

// ============================================================
// 1. MOCK AXIOS
// ============================================================
vi.mock('@/api/axios', () => ({
  default: { get: vi.fn() },
}));

// ============================================================
// 2. MOCK onMounted & onUnmounted DARI VUE
// ============================================================
const mountedCallbacks: Array<() => void> = [];
const unmountedCallbacks: Array<() => void> = [];

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    onMounted: vi.fn((cb: () => void) => {
      mountedCallbacks.push(cb);
    }),
    onUnmounted: vi.fn((cb: () => void) => {
      unmountedCallbacks.push(cb);
    }),
  };
});

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('useLowStockAlert Composable (Function-Level Unit Testing)', () => {
  const mockGet = vi.mocked(api.get);

  beforeEach(() => {
    // Reset callbacks DULU sebelum clear
    mountedCallbacks.length = 0;
    unmountedCallbacks.length = 0;
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockGet.mockResolvedValue({ data: { meta: { total: 1 } } } as any);
  });

  afterEach(() => {
    // ⚠️ PENTING: panggil unmount callbacks agar semua interval dibersihkan
    unmountedCallbacks.forEach((cb) => cb());
    vi.useRealTimers();
  });

  const triggerMount = () => mountedCallbacks.forEach((cb) => cb());
  const triggerUnmount = () => unmountedCallbacks.forEach((cb) => cb());

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] refresh() memanggil API dengan params low-stock yang benar & mengisi count', async () => {
      mockGet.mockResolvedValueOnce({ data: { meta: { total: 7 } } } as any);

      const { count, lastRefreshedAt, refresh } = useLowStockAlert({ immediate: false });
      await refresh();

      expect(mockGet).toHaveBeenCalledWith('/backoffice/inventory/materials', {
        params: { is_low_stock: true, is_active: true, per_page: 1, page: 1 },
      });
      expect(count.value).toBe(7);
      expect(lastRefreshedAt.value).toBeInstanceOf(Date);
    });

    it('[Happy Path] startPolling() langsung refresh & menjadwalkan interval', async () => {
      const { count, startPolling, stopPolling } = useLowStockAlert({ immediate: false });

      startPolling();
      await flushMicrotasks();

      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(count.value).toBe(1);

      await vi.advanceTimersByTimeAsync(60_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(2);

      stopPolling();
    });

    it('[Negative Path] refresh() gagal API → tidak crash, count tetap nilai lama', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network down'));

      const { count, refresh, isRefreshing } = useLowStockAlert({ immediate: false });
      await expect(refresh()).resolves.toBeUndefined();
      expect(count.value).toBe(0);
      expect(isRefreshing.value).toBe(false);
    });

    it('[Negative Path] refresh() saat response tidak punya meta.total → fallback ke 0', async () => {
      mockGet.mockResolvedValueOnce({ data: {} } as any);

      const { count, refresh } = useLowStockAlert({ immediate: false });
      await refresh();

      expect(count.value).toBe(0);
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - immediate: true] onMounted otomatis memulai polling', async () => {
      useLowStockAlert();
      triggerMount();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(60_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(2);

      triggerUnmount();
    });

    it('[Partisi 2 - immediate: false] onMounted TIDAK memulai polling', async () => {
      useLowStockAlert({ immediate: false });
      triggerMount();

      await vi.advanceTimersByTimeAsync(120_000);
      await flushMicrotasks();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('[Partisi 3 - pollInterval kustom] interval mengikuti angka yang diberikan', async () => {
      const { startPolling, stopPolling } = useLowStockAlert({
        immediate: false,
        pollInterval: 5_000,
      });

      startPolling();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(5_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(5_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(3);

      stopPolling();
    });

    it('[Partisi 4 - refresh() dipanggil dua kali paralel] guard isRefreshing mencegah duplicate fetch', async () => {
      let resolveFetch: (v: any) => void = () => {};
      mockGet.mockReturnValueOnce(
        new Promise((res) => { resolveFetch = res; }) as any
      );

      const { refresh } = useLowStockAlert({ immediate: false });
      const p1 = refresh();
      const p2 = refresh();

      resolveFetch({ data: { meta: { total: 9 } } });
      await Promise.all([p1, p2]);

      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - pollInterval minimal 1] tetap jalan tanpa crash', async () => {
      // ⚠️ Pakai 1, bukan 0 (0 = infinite fire loop)
      const { startPolling, stopPolling } = useLowStockAlert({
        immediate: false,
        pollInterval: 1,
      });

      startPolling();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      stopPolling();
      await flushMicrotasks();

      // Setelah stop, waktu jalan 10ms — tidak ada fetch tambahan
      await vi.advanceTimersByTimeAsync(10);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('[BVA - meta.total = 0] count diisi 0 (bukan fallback default yang lama)', async () => {
      mockGet.mockResolvedValueOnce({ data: { meta: { total: 99 } } } as any);
      const { count, refresh } = useLowStockAlert({ immediate: false });
      await refresh();
      expect(count.value).toBe(99);

      mockGet.mockResolvedValueOnce({ data: { meta: { total: 0 } } } as any);
      await refresh();
      expect(count.value).toBe(0);
    });

    it('[BVA - meta.total = undefined] fallback ke 0', async () => {
      mockGet.mockResolvedValueOnce({ data: { meta: {} } } as any);

      const { count, refresh } = useLowStockAlert({ immediate: false });
      await refresh();

      expect(count.value).toBe(0);
    });

    it('[BVA - stopPolling() saat belum start] tidak crash (no-op)', () => {
      const { stopPolling } = useLowStockAlert({ immediate: false });
      expect(() => stopPolling()).not.toThrow();
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('[BVA - startPolling() dipanggil dua kali] guard intervalId mencegah double interval', async () => {
      const { startPolling, stopPolling } = useLowStockAlert({ immediate: false });

      startPolling();
      startPolling(); // no-op
      startPolling(); // no-op

      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      stopPolling();
      await flushMicrotasks();

      // Setelah stop, maju waktu — tidak boleh ada fetch tambahan
      await vi.advanceTimersByTimeAsync(60_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Lifecycle] onMounted & onUnmounted didaftarkan tepat 1x', () => {
      useLowStockAlert();
      expect(mountedCallbacks.length).toBe(1);
      expect(unmountedCallbacks.length).toBe(1);
    });

    it('[Edge Case - Auto Cleanup] onUnmounted menghentikan interval polling', async () => {
      useLowStockAlert();
      triggerMount();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      triggerUnmount();
      await flushMicrotasks();

      await vi.advanceTimersByTimeAsync(300_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('[Edge Case - Manual stopPolling()] interval berhenti setelah dipanggil', async () => {
      const { startPolling, stopPolling } = useLowStockAlert({ immediate: false });
      startPolling();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      stopPolling();
      await flushMicrotasks();  // pastikan clearInterval sudah sinkron

      await vi.advanceTimersByTimeAsync(300_000);
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('[Edge Case - Restart] stopPolling() lalu startPolling() bisa jalan kembali', async () => {
      const { startPolling, stopPolling } = useLowStockAlert({ immediate: false });

      startPolling();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);
      stopPolling();
      await flushMicrotasks();

      startPolling();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(2);

      stopPolling();
    });

    it('[Edge Case - isRefreshing State] true selama request, false setelah selesai', async () => {
      let resolveFetch: (v: any) => void = () => {};
      mockGet.mockReturnValueOnce(
        new Promise((res) => { resolveFetch = res; }) as any
      );

      const { refresh, isRefreshing } = useLowStockAlert({ immediate: false });
      expect(isRefreshing.value).toBe(false);

      const promise = refresh();
      expect(isRefreshing.value).toBe(true);

      resolveFetch({ data: { meta: { total: 1 } } });
      await promise;
      expect(isRefreshing.value).toBe(false);
    });

    it('[Edge Case - isRefreshing Reset saat error] false setelah error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Fail'));

      const { refresh, isRefreshing } = useLowStockAlert({ immediate: false });
      await refresh();
      expect(isRefreshing.value).toBe(false);
    });

    it('[Edge Case - lastRefreshedAt] null sebelum refresh, Date setelah refresh sukses', async () => {
      mockGet.mockResolvedValueOnce({ data: { meta: { total: 1 } } } as any);

      const { refresh, lastRefreshedAt } = useLowStockAlert({ immediate: false });
      expect(lastRefreshedAt.value).toBeNull();

      await refresh();
      expect(lastRefreshedAt.value).toBeInstanceOf(Date);
    });

    it('[Edge Case - lastRefreshedAt saat error] tidak berubah (tetap null)', async () => {
      mockGet.mockRejectedValueOnce(new Error('Fail'));

      const { refresh, lastRefreshedAt } = useLowStockAlert({ immediate: false });
      await refresh();
      expect(lastRefreshedAt.value).toBeNull();
    });

    it('[Corner Case - Silent Fail] error tidak mengisi count & tidak throw', async () => {
      mockGet.mockRejectedValueOnce(new Error('Silent Fail'));

      const { refresh, count } = useLowStockAlert({ immediate: false });
      await expect(refresh()).resolves.toBeUndefined();
      expect(count.value).toBe(0);
    });

    it('[Corner Case - Readonly Refs] count, isRefreshing, lastRefreshedAt tidak bisa dimutasi dari luar', () => {
      // Suppress Vue warning di console untuk test ini
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { count, isRefreshing, lastRefreshedAt } = useLowStockAlert({ immediate: false });
      const initialCount = count.value;

      // @ts-expect-error — sengaja test immutability
      count.value = 999;
      // @ts-expect-error
      isRefreshing.value = true;
      // @ts-expect-error
      lastRefreshedAt.value = new Date();

      expect(count.value).toBe(initialCount);

      warnSpy.mockRestore();
    });

    it('[Corner Case - Concurrent refresh via interval] interval tidak overlap karena guard isRefreshing', async () => {
      let resolveFetch: (v: any) => void = () => {};
      mockGet.mockReturnValue(
        new Promise((res) => { resolveFetch = res; }) as any
      );

      const { startPolling, stopPolling } = useLowStockAlert({
        immediate: false,
        pollInterval: 1000,
      });

      startPolling();
      await flushMicrotasks();
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Interval fire 2x, tapi refresh skip karena isRefreshing
      await vi.advanceTimersByTimeAsync(1000);
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(1000);
      await flushMicrotasks();

      // Karena refresh pertama belum resolve, guard mencegah fetch baru
      expect(mockGet).toHaveBeenCalledTimes(1);

      stopPolling();
      resolveFetch({ data: { meta: { total: 1 } } });
      await flushMicrotasks();
    });

    it('[Corner Case - Return Shape] composable mengembalikan props yang benar', () => {
      const result = useLowStockAlert({ immediate: false });

      expect(result).toHaveProperty('count');
      expect(result).toHaveProperty('isRefreshing');
      expect(result).toHaveProperty('lastRefreshedAt');
      expect(result).toHaveProperty('refresh');
      expect(result).toHaveProperty('startPolling');
      expect(result).toHaveProperty('stopPolling');

      expect(typeof result.refresh).toBe('function');
      expect(typeof result.startPolling).toBe('function');
      expect(typeof result.stopPolling).toBe('function');
    });

    it('[Corner Case - API Params] params selalu dikirim konsisten di setiap refresh', async () => {
      const { refresh } = useLowStockAlert({ immediate: false });
      await refresh();
      await refresh();
      await refresh();

      const expectedParams = {
        params: { is_low_stock: true, is_active: true, per_page: 1, page: 1 },
      };

      expect(mockGet).toHaveBeenNthCalledWith(1, '/backoffice/inventory/materials', expectedParams);
      expect(mockGet).toHaveBeenNthCalledWith(2, '/backoffice/inventory/materials', expectedParams);
      expect(mockGet).toHaveBeenNthCalledWith(3, '/backoffice/inventory/materials', expectedParams);
    });

    it('[Corner Case - Endpoint URL] menggunakan path yang benar', async () => {
      mockGet.mockResolvedValueOnce({ data: { meta: { total: 1 } } } as any);

      const { refresh } = useLowStockAlert({ immediate: false });
      await refresh();

      expect(mockGet.mock.calls[0]?.[0]).toBe('/backoffice/inventory/materials');
    });
  });
});