import { describe, it, expect } from 'vitest';
import { useCurrencyFormat } from '../useCurrencyFormat';

describe('useCurrencyFormat Composable', () => {
  const { 
    formatCurrency, 
    formatCurrencyWithDecimal, 
    formatCompactCurrency, 
    parseCurrencyToNumber 
  } = useCurrencyFormat();

  describe('Happy & Negative Path', () => {
    it('[Happy Path] formatCurrency() mengembalikan format Rupiah tanpa desimal', () => {
      const result = formatCurrency(500000);
      expect(result).toContain('500');
      expect(result).toContain('Rp');
    });

    it('[Happy Path] formatCurrency() mengembalikan format Rupiah untuk 0', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
      expect(result).toContain('Rp');
    });

    it('[Happy Path] formatCurrencyWithDecimal() mengembalikan format Rupiah dengan 2 desimal', () => {
      const result = formatCurrencyWithDecimal(500000);
      expect(result).toContain('500');
      expect(result).toContain('Rp');
      expect(result).toContain(',00');
    });

    it('[Happy Path] formatCurrencyWithDecimal() menangani angka desimal', () => {
      const result = formatCurrencyWithDecimal(500000.5);
      expect(result).toContain('500');
      expect(result).toContain('Rp');
      expect(result).toContain(',50');
    });

    it('[Happy Path] formatCompactCurrency() mengembalikan format compact untuk jutaan', () => {
      expect(formatCompactCurrency(1500000)).toBe('Rp 1.5M');
    });

    it('[Happy Path] formatCompactCurrency() mengembalikan format compact untuk ribuan', () => {
      expect(formatCompactCurrency(15000)).toBe('Rp 15K');
    });

    it('[Happy Path] parseCurrencyToNumber() mengubah string Rupiah menjadi angka', () => {
      expect(parseCurrencyToNumber('Rp 500.000')).toBe(500000);
    });

    it('[Negative Path] formatCurrency() mengembalikan "-" untuk null', () => {
      expect(formatCurrency(null)).toBe('-');
    });

    it('[Negative Path] formatCurrency() mengembalikan "-" untuk undefined', () => {
      expect(formatCurrency(undefined)).toBe('-');
    });

    it('[Negative Path] formatCurrencyWithDecimal() mengembalikan "-" untuk null', () => {
      expect(formatCurrencyWithDecimal(null)).toBe('-');
    });

    it('[Negative Path] formatCompactCurrency() mengembalikan "-" untuk undefined', () => {
      expect(formatCompactCurrency(undefined)).toBe('-');
    });

    it('[Negative Path] parseCurrencyToNumber() mengembalikan 0 untuk null', () => {
      expect(parseCurrencyToNumber(null)).toBe(0);
    });

    it('[Negative Path] parseCurrencyToNumber() mengembalikan 0 untuk undefined', () => {
      expect(parseCurrencyToNumber(undefined)).toBe(0);
    });
  });

  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Ratusan] formatCurrency() untuk nilai < 1000', () => {
      const result = formatCurrency(500);
      expect(result).toContain('500');
    });

    it('[Partisi 2 - Ribuan] formatCurrency() untuk nilai 1000-999999', () => {
      const result = formatCurrency(50000);
      expect(result).toContain('50');
    });

    it('[Partisi 3 - Jutaan] formatCurrency() untuk nilai 1000000-999999999', () => {
      const result = formatCurrency(5000000);
      expect(result).toContain('5');
    });

    it('[Partisi 4 - Milyaran] formatCurrency() untuk nilai >= 1000000000', () => {
      const result = formatCurrency(5000000000);
      expect(result).toContain('5');
    });

    it('[Partisi 5 - Compact Jutaan] formatCompactCurrency() untuk nilai >= 1000000', () => {
      expect(formatCompactCurrency(2500000)).toBe('Rp 2.5M');
    });

    it('[Partisi 6 - Compact Ribuan] formatCompactCurrency() untuk nilai 1000-999999', () => {
      expect(formatCompactCurrency(25000)).toBe('Rp 25K');
    });

    it('[Partisi 7 - Compact Kecil] formatCompactCurrency() untuk nilai < 1000', () => {
      expect(formatCompactCurrency(500)).toBe('Rp 500');
    });

    it('[Partisi 8 - Parse dengan Titik] parseCurrencyToNumber() menangani titik pemisah ribuan', () => {
      expect(parseCurrencyToNumber('Rp 1.234.567')).toBe(1234567);
    });

    it('[Partisi 9 - Parse dengan Koma] parseCurrencyToNumber() menangani koma desimal', () => {
      expect(parseCurrencyToNumber('Rp 1.234.567,89')).toBe(123456789);
    });
  });

  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] formatCurrency() dengan 0', () => {
      expect(formatCurrency(0)).toContain('0');
    });

    it('[BVA - Batas Bawah] formatCurrencyWithDecimal() dengan 0', () => {
      expect(formatCurrencyWithDecimal(0)).toContain(',00');
    });

    it('[BVA - Batas Bawah] parseCurrencyToNumber() dengan string kosong', () => {
      expect(parseCurrencyToNumber('')).toBe(0);
    });

    it('[BVA - Batas Bawah] parseCurrencyToNumber() dengan string tanpa angka', () => {
      expect(parseCurrencyToNumber('abc')).toBe(0);
    });

    it('[BVA - Batas Atas] formatCurrency() dengan Number.MAX_SAFE_INTEGER', () => {
      const result = formatCurrency(Number.MAX_SAFE_INTEGER);
      expect(result).toContain('Rp');
    });

    it('[BVA - Batas Atas] formatCompactCurrency() dengan nilai sangat besar', () => {
      const result = formatCompactCurrency(999999999999);
      expect(result).toContain('M');
    });

    it('[BVA - Tepat 1000] formatCompactCurrency() batas ribuan', () => {
      expect(formatCompactCurrency(1000)).toBe('Rp 1K');
    });

    it('[BVA - Tepat 999] formatCompactCurrency() di bawah batas ribuan', () => {
      expect(formatCompactCurrency(999)).toBe('Rp 999');
    });

    it('[BVA - Tepat 1000000] formatCompactCurrency() batas jutaan', () => {
      expect(formatCompactCurrency(1000000)).toBe('Rp 1.0M');
    });

    it('[BVA - Tepat 999999] formatCompactCurrency() di bawah batas jutaan', () => {
      expect(formatCompactCurrency(999999)).toBe('Rp 1000K');
    });

    it('[BVA - Angka Negatif] formatCurrency() dengan nilai negatif', () => {
      const result = formatCurrency(-50000);
      expect(result).toContain('50');
    });
  });

  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] formatCurrency() dengan angka desimal', () => {
      const result = formatCurrency(500000.75);
      expect(result).toContain('500');
    });

    it('[Edge Case] formatCurrencyWithDecimal() dengan 3 desimal (dibulatkan)', () => {
      const result = formatCurrencyWithDecimal(500000.999);
      expect(result).toContain('500');
    });

    it('[Edge Case] formatCurrencyWithDecimal() dengan angka negatif desimal', () => {
      const result = formatCurrencyWithDecimal(-500.5);
      expect(result).toContain('500');
    });

    it('[Corner Case] formatCompactCurrency() dengan angka desimal', () => {
      expect(formatCompactCurrency(1500000.75)).toBe('Rp 1.5M');
    });

    it('[Corner Case] parseCurrencyToNumber() dengan string mengandung huruf dan angka', () => {
      expect(parseCurrencyToNumber('abc123def456')).toBe(123456);
    });

    it('[Corner Case] parseCurrencyToNumber() dengan string hanya simbol', () => {
      expect(parseCurrencyToNumber('!@#$%')).toBe(0);
    });

    it('[Corner Case] parseCurrencyToNumber() dengan string "0"', () => {
      expect(parseCurrencyToNumber('0')).toBe(0);
    });

    it('[Corner Case] formatCurrency() dengan NaN', () => {
      expect(formatCurrency(NaN)).toBe('-');
    });

    it('[Corner Case] formatCompactCurrency() dengan Infinity', () => {
      expect(formatCompactCurrency(Infinity)).toBe('-');
    });

    it('[Edge Case] formatCurrency() konsisten untuk input yang sama', () => {
      const result1 = formatCurrency(500000);
      const result2 = formatCurrency(500000);
      expect(result1).toBe(result2);
    });

    it('[Edge Case] parseCurrencyToNumber() menangani string dengan spasi berlebih', () => {
      expect(parseCurrencyToNumber('  Rp  500.000  ')).toBe(500000);
    });

    it('[Edge Case] formatCurrencyWithDecimal() dengan angka bulat', () => {
      const result = formatCurrencyWithDecimal(1000000);
      expect(result).toContain('1');
    });

    it('[Edge Case] formatCompactCurrency() dengan angka 0', () => {
      expect(formatCompactCurrency(0)).toBe('Rp 0');
    });

    it('[Edge Case] formatCompactCurrency() dengan angka negatif', () => {
      expect(formatCompactCurrency(-1500000)).toBe('-Rp 1.5M');
    });
  });
});