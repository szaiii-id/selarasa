// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useCurrencyInput } from '../useCurrencyInput';

describe('useCurrencyInput Composable', () => {
  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Mengembalikan string kosong saat value null', () => {
      const value = ref<number | null>(null);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('');
    });

    it('[Happy Path] Mengembalikan string kosong saat value undefined', () => {
      const value = ref<number | undefined>(undefined);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('');
    });

    it('[Happy Path] Mengembalikan string kosong saat value 0', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      // 0 adalah falsy, jadi mengembalikan string kosong
      expect(currencyInput.value).toBe('');
    });

    it('[Happy Path] Memformat angka 1000 menjadi "1.000"', () => {
      const value = ref<number>(1000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('1.000');
    });

    it('[Happy Path] Memformat angka 1000000 menjadi "1.000.000"', () => {
      const value = ref<number>(1000000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('1.000.000');
    });

    it('[Negative Path] Set value dengan string kosong memanggil setValue(0)', () => {
      const value = ref<number>(1000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '';

      expect(setValue).toHaveBeenCalledWith(0);
    });

    it('[Negative Path] Set value dengan karakter non-digit memanggil setValue(0)', () => {
      const value = ref<number>(1000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = 'abc';

      expect(setValue).toHaveBeenCalledWith(0);
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =====================================================================
  describe('Equivalence Partitioning (Formatting)', () => {
    it('[Partisi 1 - Angka 1-999] Tidak ada pemisah ribuan', () => {
      const testCases = [
        { input: 1, expected: '1' },
        { input: 99, expected: '99' },
        { input: 999, expected: '999' },
      ];

      testCases.forEach(({ input, expected }) => {
        const value = ref<number>(input);
        const setValue = vi.fn();
        
        const currencyInput = useCurrencyInput(
          () => value.value,
          setValue
        );

        expect(currencyInput.value).toBe(expected);
      });
    });

    it('[Partisi 2 - Angka 1.000-999.999] Satu pemisah ribuan', () => {
      const testCases = [
        { input: 1000, expected: '1.000' },
        { input: 50000, expected: '50.000' },
        { input: 999999, expected: '999.999' },
      ];

      testCases.forEach(({ input, expected }) => {
        const value = ref<number>(input);
        const setValue = vi.fn();
        
        const currencyInput = useCurrencyInput(
          () => value.value,
          setValue
        );

        expect(currencyInput.value).toBe(expected);
      });
    });

    it('[Partisi 3 - Angka 1.000.000+] Dua atau lebih pemisah ribuan', () => {
      const testCases = [
        { input: 1000000, expected: '1.000.000' },
        { input: 999999999, expected: '999.999.999' },
        { input: 1000000000, expected: '1.000.000.000' },
      ];

      testCases.forEach(({ input, expected }) => {
        const value = ref<number>(input);
        const setValue = vi.fn();
        
        const currencyInput = useCurrencyInput(
          () => value.value,
          setValue
        );

        expect(currencyInput.value).toBe(expected);
      });
    });
  });

  // =====================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =====================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas bawah: 0] Mengembalikan string kosong', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('');
    });

    it('[BVA - Batas bawah: 1] Mengembalikan "1"', () => {
      const value = ref<number>(1);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('1');
    });

    it('[BVA - Tepat 999] Mengembalikan "999"', () => {
      const value = ref<number>(999);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('999');
    });

    it('[BVA - Tepat 1000] Mengembalikan "1.000"', () => {
      const value = ref<number>(1000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('1.000');
    });

    it('[BVA - Tepat 999999] Mengembalikan "999.999"', () => {
      const value = ref<number>(999999);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('999.999');
    });

    it('[BVA - Tepat 1000000] Mengembalikan "1.000.000"', () => {
      const value = ref<number>(1000000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('1.000.000');
    });

    it('[BVA - Number.MAX_SAFE_INTEGER] Mengembalikan format yang benar', () => {
      const value = ref<number>(Number.MAX_SAFE_INTEGER);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('9.007.199.254.740.991');
    });
  });

  // =====================================================================
  // 4. SET VALUE (Parsing Input)
  // =====================================================================
  describe('Set Value (Parsing Input)', () => {
    it('[Happy Path] Set "1.000" memanggil setValue(1000)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '1.000';

      expect(setValue).toHaveBeenCalledWith(1000);
    });

    it('[Happy Path] Set "1.000.000" memanggil setValue(1000000)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '1.000.000';

      expect(setValue).toHaveBeenCalledWith(1000000);
    });

    it('[Edge Case] Set "1.000abc" hanya mengambil digit dan memanggil setValue(1000)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '1.000abc';

      expect(setValue).toHaveBeenCalledWith(1000);
    });

    it('[Edge Case] Set "Rp 50.000" hanya mengambil digit dan memanggil setValue(50000)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = 'Rp 50.000';

      expect(setValue).toHaveBeenCalledWith(50000);
    });

    it('[Corner Case] Set string dengan hanya karakter non-digit memanggil setValue(0)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = 'abc';

      expect(setValue).toHaveBeenCalledWith(0);
    });

    it('[Corner Case] Set string kosong memanggil setValue(0)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '';

      expect(setValue).toHaveBeenCalledWith(0);
    });

    it('[Edge Case] Set "000123" memanggil setValue(123)', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '000123';

      expect(setValue).toHaveBeenCalledWith(123);
    });
  });

  // =====================================================================
  // 5. REACTIVITY TESTS
  // =====================================================================
  describe('Reactivity Tests', () => {
    it('Computed value berubah saat sumber value berubah', async () => {
      const value = ref<number>(1000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      expect(currencyInput.value).toBe('1.000');

      // Ubah value sumber
      value.value = 2000;
      await nextTick();

      expect(currencyInput.value).toBe('2.000');
    });

    it('Set value memanggil setValue dengan angka yang benar', async () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '5.000';
      await nextTick();

      expect(setValue).toHaveBeenCalledWith(5000);
      expect(setValue).toHaveBeenCalledTimes(1);
    });
  });

  // =====================================================================
  // 6. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] NaN dianggap sebagai 0', () => {
      const value = ref<number>(NaN);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      // NaN adalah falsy, jadi mengembalikan string kosong
      expect(currencyInput.value).toBe('');
    });

    it('[Edge Case] Infinity dianggap sebagai 0', () => {
      const value = ref<number>(Infinity);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      // Infinity adalah truthy, tapi formatnya akan aneh
      expect(currencyInput.value).toBe('Infinity');
    });

    it('[Corner Case] Angka negatif tetap diformat dengan pemisah ribuan', () => {
      const value = ref<number>(-1000);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      // -1000 adalah truthy
      expect(currencyInput.value).toBe('-1.000');
    });

    it('[Edge Case] Set value dengan angka desimal hanya mengambil bagian integer', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '1.500,75';

      // Hanya digit yang diambil: "150075"
      expect(setValue).toHaveBeenCalledWith(150075);
    });

    it('[Corner Case] Set value dengan spasi di tengah', () => {
      const value = ref<number>(0);
      const setValue = vi.fn();
      
      const currencyInput = useCurrencyInput(
        () => value.value,
        setValue
      );

      currencyInput.value = '1 000 000';

      // Hanya digit yang diambil: "1000000"
      expect(setValue).toHaveBeenCalledWith(1000000);
    });
  });
});