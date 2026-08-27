import { describe, it, expect } from 'vitest';
import { useUserInitials } from '../useUserInitials';

describe('useUserInitials Composable', () => {
  const { getInitials, getAvatarColor } = useUserInitials();

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] getInitials() mengembalikan inisial dari nama lengkap', () => {
      expect(getInitials('John Doe')).toBe('JD');
    });

    it('[Happy Path] getInitials() mengembalikan inisial dari nama dengan 3 kata', () => {
      expect(getInitials('John Michael Doe')).toBe('JM');
    });

    it('[Happy Path] getInitials() mengembalikan inisial dari nama 1 kata', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('[Happy Path] getAvatarColor() mengembalikan warna dari daftar yang tersedia', () => {
      const color = getAvatarColor('John Doe');
      const validColors = [
        'bg-primary/10 text-primary',
        'bg-info/10 text-info',
        'bg-success/10 text-success',
        'bg-warning/10 text-warning',
        'bg-error/10 text-error'
      ];
      
      expect(validColors).toContain(color);
    });

    it('[Negative Path] getInitials() mengembalikan fallback untuk null', () => {
      expect(getInitials(null)).toBe('??');
    });

    it('[Negative Path] getInitials() mengembalikan fallback untuk undefined', () => {
      expect(getInitials(undefined)).toBe('??');
    });

    it('[Negative Path] getInitials() mengembalikan fallback untuk string kosong', () => {
      expect(getInitials('')).toBe('??');
    });

    it('[Negative Path] getAvatarColor() mengembalikan warna disabled untuk null', () => {
      expect(getAvatarColor(null)).toBe('bg-disabled/30 text-text-secondary');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Nama Normal] getInitials() dengan nama 2 kata standar', () => {
      expect(getInitials('Budi Santoso')).toBe('BS');
    });

    it('[Partisi 2 - Nama dengan Spasi Berlebih] getInitials() menangani multiple spaces', () => {
      expect(getInitials('  John   Doe  ')).toBe('JD');
    });

    it('[Partisi 3 - Nama dengan Karakter Khusus] getInitials() menangani karakter spesial', () => {
      expect(getInitials('John-Doe Smith')).toBe('JS');
    });

    it('[Partisi 4 - Nama Lowercase] getInitials() mengubah ke uppercase', () => {
      expect(getInitials('john doe')).toBe('JD');
    });

    it('[Partisi 5 - Nama Uppercase] getInitials() tetap uppercase', () => {
      expect(getInitials('JOHN DOE')).toBe('JD');
    });

    it('[Partisi 6 - Nama Campuran] getInitials() menangani mixed case', () => {
      expect(getInitials('JoHn dOe')).toBe('JD');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] getInitials() dengan string kosong ""', () => {
      expect(getInitials('')).toBe('??');
    });

    it('[BVA - Batas Bawah] getInitials() dengan string spasi "   "', () => {
      expect(getInitials('   ')).toBe('??');
    });

    it('[BVA - Batas Atas] getInitials() dengan nama sangat panjang', () => {
      const longName = 'A'.repeat(100);
      expect(getInitials(longName)).toBe('A');
    });

    it('[BVA - Satu Karakter] getInitials() dengan nama 1 huruf', () => {
      expect(getInitials('A')).toBe('A');
    });

    it('[BVA - Dua Karakter] getInitials() dengan nama 2 huruf', () => {
      expect(getInitials('AB')).toBe('A');
    });

    it('[BVA - Fallback Custom] getInitials() dengan fallback kustom', () => {
      expect(getInitials(null, 'XX')).toBe('XX');
    });

    it('[BVA - Fallback Custom Kosong] getInitials() dengan fallback string kosong', () => {
      expect(getInitials(null, '')).toBe('');
    });

    it('[BVA - Index Array] getAvatarColor() selalu mengembalikan warna valid untuk berbagai nama', () => {
      const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const validColors = [
        'bg-primary/10 text-primary',
        'bg-info/10 text-info',
        'bg-success/10 text-success',
        'bg-warning/10 text-warning',
        'bg-error/10 text-error'
      ];
      
      names.forEach(name => {
        expect(validColors).toContain(getAvatarColor(name));
      });
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] getInitials() dengan nama mengandung angka', () => {
      expect(getInitials('John 2 Doe')).toBe('J2');
    });

    it('[Edge Case] getInitials() dengan nama mengandung emoji', () => {
      const result = getInitials('John 😀 Doe');
      expect(result.startsWith('J')).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('[Edge Case] getInitials() dengan nama hanya simbol', () => {
      expect(getInitials('@#$')).toBe('@');
    });

    it('[Corner Case] getInitials() dengan nama mengandung newline', () => {
      expect(getInitials('John\nDoe')).toBe('JD');
    });

    it('[Corner Case] getInitials() dengan nama mengandung tab', () => {
      expect(getInitials('John\tDoe')).toBe('JD');
    });

    it('[Corner Case] getAvatarColor() dengan string kosong', () => {
      expect(getAvatarColor('')).toBe('bg-disabled/30 text-text-secondary');
    });

    it('[Corner Case] getAvatarColor() dengan string spasi', () => {
      expect(getAvatarColor('   ')).toBe('bg-disabled/30 text-text-secondary');
    });

    it('[Corner Case] getInitials() dengan nama "undefined" (string literal)', () => {
      expect(getInitials('undefined')).toBe('U');
    });

    it('[Corner Case] getInitials() dengan nama "null" (string literal)', () => {
      expect(getInitials('null')).toBe('N');
    });

    it('[Edge Case] getInitials() konsisten untuk nama yang sama', () => {
      const result1 = getInitials('John Doe');
      const result2 = getInitials('John Doe');
      expect(result1).toBe(result2);
    });

    it('[Edge Case] getAvatarColor() konsisten untuk nama yang sama', () => {
      const color1 = getAvatarColor('John Doe');
      const color2 = getAvatarColor('John Doe');
      expect(color1).toBe(color2);
    });

    it('[Edge Case] getAvatarColor() mendistribusikan warna berbeda untuk nama berbeda', () => {
      const colors = new Set([
        getAvatarColor('John'),
        getAvatarColor('Jane'),
        getAvatarColor('Bob'),
        getAvatarColor('Alice'),
        getAvatarColor('Charlie')
      ]);
      
      // Minimal harus ada 2 warna berbeda dari 5 nama
      expect(colors.size).toBeGreaterThanOrEqual(2);
    });
  });
});