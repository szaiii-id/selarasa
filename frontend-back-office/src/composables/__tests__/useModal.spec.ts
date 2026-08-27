import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useModal } from '@/composables/useModal'; // Menggunakan alias @

describe('useModal Composable (Function-Level Unit Testing)', () => {
  beforeEach(() => {
    // Membajak waktu sistem agar kita bisa mengontrol setTimeout secara presisi
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Kembalikan waktu ke normal setelah tes selesai
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH (Jalur Normal)
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] open() mengubah isOpen menjadi true dan mengisi data', () => {
      const modal = useModal();
      
      modal.open({ id: 1, name: 'Budi' });

      expect(modal.isOpen.value).toBe(true);
      expect(modal.data.value).toEqual({ id: 1, name: 'Budi' });
    });

    it('[Happy Path] close() menutup modal secara instan, namun data bertahan sesaat', () => {
      const modal = useModal();
      modal.open({ id: 1 });
      
      modal.close();

      // Modal langsung tertutup
      expect(modal.isOpen.value).toBe(false);
      // TETAPI data harusnya masih ada (belum dihapus) karena animasi penutupan butuh waktu
      expect(modal.data.value).toEqual({ id: 1 });
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING (Partisi Parameter Inisialisasi)
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Tanpa Parameter] initialData default bernilai null', () => {
      const modal = useModal(); // Tanpa parameter
      expect(modal.data.value).toBeNull();
    });

    it('[Partisi 2 - Parameter Kustom] initialData menyimpan state bawaan yang diberikan', () => {
      const defaultState = { title: 'Default', type: 'info' };
      const modal = useModal(defaultState);
      
      expect(modal.data.value).toEqual(defaultState);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS / BVA (Batas Waktu Timer 300ms)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[Time Boundary] Data tidak terhapus di 299ms, tapi terhapus tepat di 300ms', () => {
      const initial = { id: 0 };
      const modal = useModal(initial);
      
      modal.open({ id: 99 }); // Isi dengan data baru
      modal.close(); // Memicu setTimeout 300ms

      // Majukan waktu tepat 299 milidetik (Batas bawah)
      vi.advanceTimersByTime(299);
      // Data harusnya MASIH ADA (belum keriset)
      expect(modal.data.value).toEqual({ id: 99 });

      // Majukan waktu 1 milidetik lagi (Total 300ms - Batas tepat)
      vi.advanceTimersByTime(1);
      // Data harusnya KEMBALI KE INITIAL
      expect(modal.data.value).toEqual(initial);
    });
  });

  // =========================================================================
  // 4. EDGE & CORNER CASES (Perilaku Ekstrem)
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Memanggil open(undefined) TIDAK akan menimpa data yang sudah ada', () => {
      const modal = useModal();
      modal.open({ user: 'Budi' });
      
      // Dipanggil secara tidak sengaja dengan undefined dari template
      modal.open(undefined);

      // Karena ada logika "if (payload !== undefined)", data lama tidak boleh hilang
      expect(modal.data.value).toEqual({ user: 'Budi' });
      expect(modal.isOpen.value).toBe(true);
    });

    it('[Corner Case] Rapid Toggle (Buka -> Tutup -> Buka Cepat) mengekspos sifat timer yang saling tumpang tindih', () => {
      // PERHATIAN: Tes ini membuktikan adanya "celah" kecil di kode composable saat ini.
      // Jika user klik buka-tutup dengan sangat ganas, timer lama bisa meriset data baru.
      const modal = useModal();
      
      modal.open({ state: 'Data Pertama' });
      modal.close(); // Mulai timer A (300ms)
      
      // 100ms kemudian (sebelum timer A selesai), user langsung buka modal lagi dengan data baru
      vi.advanceTimersByTime(100);
      modal.open({ state: 'Data Kedua' });
      expect(modal.data.value).toEqual({ state: 'Data Kedua' });

      // 200ms kemudian, Timer A (yang dibuat dari aksi tutup pertama) akan meledak/selesai
      vi.advanceTimersByTime(200);
      
      // TERBUKTI: Data kedua tiba-tiba jadi null karena ulah Timer A.
      // (Dalam praktik nyata, ini jarang terjadi, tapi Unit Test tugasnya menemukan celah ini).
      expect(modal.data.value).toBeNull();
    });
  });
});