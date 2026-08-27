import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDateFormat } from '../useDateFormat';

describe('useDateFormat Composable', () => {
  const { formatTime, formatDateTime, formatDate, formatTimeAgo } = useDateFormat();

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] formatTime() mengembalikan waktu format HH:mm dari HH:mm:ss', () => {
      expect(formatTime('08:00:00')).toBe('08:00');
    });

    it('[Happy Path] formatTime() mengembalikan waktu yang sama jika sudah HH:mm', () => {
      expect(formatTime('08:00')).toBe('08:00');
    });

    it('[Happy Path] formatDateTime() mengembalikan format tanggal dan waktu lengkap', () => {
      const result = formatDateTime('2024-01-15T08:00:00');
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('[Happy Path] formatDate() mengembalikan format tanggal saja', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
    });

    it('[Happy Path] formatTimeAgo() mengembalikan "Just now" untuk waktu sekarang', () => {
      const now = new Date();
      expect(formatTimeAgo(now.toISOString())).toBe('Just now');
    });

    it('[Negative Path] formatTime() mengembalikan "-" untuk null', () => {
      expect(formatTime(null)).toBe('-');
    });

    it('[Negative Path] formatTime() mengembalikan "-" untuk undefined', () => {
      expect(formatTime(undefined)).toBe('-');
    });

    it('[Negative Path] formatDateTime() mengembalikan "-" untuk null', () => {
      expect(formatDateTime(null)).toBe('-');
    });

    it('[Negative Path] formatDate() mengembalikan "-" untuk undefined', () => {
      expect(formatDate(undefined)).toBe('-');
    });

    it('[Negative Path] formatTimeAgo() mengembalikan "-" untuk null', () => {
      expect(formatTimeAgo(null)).toBe('-');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Waktu dengan Detik] formatTime() memotong detik dari HH:mm:ss', () => {
      expect(formatTime('08:30:45')).toBe('08:30');
    });

    it('[Partisi 2 - Waktu Tanpa Detik] formatTime() mengembalikan HH:mm apa adanya', () => {
      expect(formatTime('08:30')).toBe('08:30');
    });

    it('[Partisi 3 - Waktu Kosong] formatTime() mengembalikan "-" untuk string kosong', () => {
      expect(formatTime('')).toBe('-');
    });

    it('[Partisi 4 - Tanggal ISO] formatDate() menangani format ISO lengkap', () => {
      const result = formatDate('2024-01-15T08:00:00+00:00');
      expect(result).toContain('2024');
    });

    it('[Partisi 5 - Tanggal Singkat] formatDate() menangani format YYYY-MM-DD', () => {
      const result = formatDate('2024-01-15');
      expect(result).toContain('2024');
    });

    it('[Partisi 6 - Waktu Lampau] formatTimeAgo() untuk waktu 5 menit lalu', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
      expect(formatTimeAgo(fiveMinutesAgo.toISOString())).toBe('5 minutes ago');
    });

    it('[Partisi 7 - Waktu Lampau] formatTimeAgo() untuk waktu 3 jam lalu', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 3600000);
      expect(formatTimeAgo(threeHoursAgo.toISOString())).toBe('3 hours ago');
    });

    it('[Partisi 8 - Waktu Lampau] formatTimeAgo() untuk waktu 2 hari lalu', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      expect(formatTimeAgo(twoDaysAgo.toISOString())).toBe('2 days ago');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] formatTime() dengan string kosong ""', () => {
      expect(formatTime('')).toBe('-');
    });

    it('[BVA - Batas Bawah] formatTime() dengan string spasi "   "', () => {
      expect(formatTime('   ')).toBe('-'); 
    });

    it('[BVA - Batas Bawah] formatDate() dengan null', () => {
      expect(formatDate(null)).toBe('-');
    });

    it('[BVA - Batas Bawah] formatDateTime() dengan undefined', () => {
      expect(formatDateTime(undefined)).toBe('-');
    });

    it('[BVA - Batas Atas] formatTime() dengan string sangat panjang', () => {
      const longTime = '08:00:00:00:00:00';
      expect(formatTime(longTime)).toBe('08:00');
    });

    it('[BVA - Tepat 5 Karakter] formatTime() dengan string "08:00"', () => {
      expect(formatTime('08:00')).toBe('08:00');
    });

    it('[BVA - Kurang dari 5 Karakter] formatTime() dengan string "8:00"', () => {
      expect(formatTime('8:00')).toBe('8:00');
    });

    it('[BVA - Tepat 1 Menit] formatTimeAgo() untuk 60 detik lalu', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000);
      expect(formatTimeAgo(oneMinuteAgo.toISOString())).toBe('1 minutes ago');
    });

    it('[BVA - Tepat 1 Jam] formatTimeAgo() untuk 60 menit lalu', () => {
      const oneHourAgo = new Date(Date.now() - 3600000);
      expect(formatTimeAgo(oneHourAgo.toISOString())).toBe('1 hours ago');
    });

    it('[BVA - Tepat 1 Hari] formatTimeAgo() untuk 24 jam lalu', () => {
      const oneDayAgo = new Date(Date.now() - 86400000);
      expect(formatTimeAgo(oneDayAgo.toISOString())).toBe('1 days ago');
    });

    it('[BVA - Tepat 7 Hari] formatTimeAgo() untuk 7 hari lalu (fallback ke formatDate)', () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const result = formatTimeAgo(sevenDaysAgo.toISOString());
      // Harusnya menggunakan formatDate, bukan "7 days ago"
      expect(result).not.toBe('7 days ago');
      // Cek tahun sekarang, bukan hardcode 2024
      const currentYear = new Date().getFullYear().toString();
      expect(result).toContain(currentYear);
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] formatTime() dengan format "HH:MM:SS.ffffff"', () => {
      expect(formatTime('08:00:00.000000')).toBe('08:00');
    });

    it('[Edge Case] formatDate() dengan tanggal invalid', () => {
    const result = formatDate('invalid-date');
    expect(result).toBe('-'); 
    });

    it('[Edge Case] formatTimeAgo() dengan tanggal di masa depan', () => {
      const futureDate = new Date(Date.now() + 3600000);
      const result = formatTimeAgo(futureDate.toISOString());
      expect(result).toBe('Just now'); // Karena diff negatif, kurang dari 1 menit
    });

    it('[Corner Case] formatTime() dengan waktu "23:59:59"', () => {
      expect(formatTime('23:59:59')).toBe('23:59');
    });

    it('[Corner Case] formatTime() dengan waktu "00:00:00"', () => {
      expect(formatTime('00:00:00')).toBe('00:00');
    });

    it('[Corner Case] formatDate() dengan tanggal epoch 0', () => {
      const result = formatDate('1970-01-01');
      expect(result).toContain('1970');
    });
    
    it('[Corner Case] formatTimeAgo() dengan tanggal "null" (string literal)', () => {
      const result = formatTimeAgo('null');
      expect(result).toBe('-'); // Sekarang PASS karena ada isNaN check
    });


    it('[Edge Case] formatTime() konsisten untuk input yang sama', () => {
      const result1 = formatTime('08:00:00');
      const result2 = formatTime('08:00:00');
      expect(result1).toBe(result2);
    });

    it('[Edge Case] formatDateTime() menghasilkan format yang konsisten', () => {
      const date = '2024-01-15T08:00:00';
      const result1 = formatDateTime(date);
      const result2 = formatDateTime(date);
      expect(result1).toBe(result2);
    });

    it('[Edge Case] formatTimeAgo() menangani waktu 30 detik lalu', () => {
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      expect(formatTimeAgo(thirtySecondsAgo.toISOString())).toBe('Just now');
    });

    it('[Edge Case] formatTimeAgo() menangani waktu 59 menit lalu', () => {
      const fiftyNineMinutesAgo = new Date(Date.now() - 59 * 60000);
      expect(formatTimeAgo(fiftyNineMinutesAgo.toISOString())).toBe('59 minutes ago');
    });

    it('[Edge Case] formatTimeAgo() menangani waktu 23 jam lalu', () => {
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 3600000);
      expect(formatTimeAgo(twentyThreeHoursAgo.toISOString())).toBe('23 hours ago');
    });

    it('[Edge Case] formatTimeAgo() menangani waktu 6 hari lalu', () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 86400000);
      expect(formatTimeAgo(sixDaysAgo.toISOString())).toBe('6 days ago');
    });
  });
});