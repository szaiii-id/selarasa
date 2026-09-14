import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useStockPreview } from '../useStockPreview';
import type { RawMaterial, MovementType } from '@/types/inventory';

describe('useStockPreview Composable (Function-Level Unit Testing)', () => {
  // ==========================================================
  // TEST HELPERS
  // ==========================================================
  const createMaterial = (overrides: Partial<RawMaterial> = {}): RawMaterial => ({
    id: 1,
    name: 'Gula Pasir',
    sku: 'GUL-001',
    unit: 'kg',
    current_stock: 10,
    minimum_stock: 5,
    is_low_stock: false,
    is_active: true,
    category_id: 1,
    ...overrides,
  } as RawMaterial);

  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] IN: menambah stok (10 + 5 = 15)', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(5)
      );

      expect(preview.value).toMatchObject({
        before: 10,
        after: 15,
        delta: 5,
        unit: 'kg',
        isNegative: false,
        isBelowMinimum: false,
        isSameAsBefore: false,
        isValid: true,
      });
    });

    it('[Happy Path] OUT: mengurangi stok (10 - 3 = 7)', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('OUT'),
        ref(3)
      );

      expect(preview.value).toMatchObject({
        before: 10,
        after: 7,
        delta: -3,
        isNegative: false,
        isBelowMinimum: false,
        isValid: true,
      });
    });

    it('[Happy Path] ADJUSTMENT positif: menambah stok (10 + 2 = 12)', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(2)
      );

      expect(preview.value).toMatchObject({
        before: 10,
        after: 12,
        delta: 2,
        isValid: true,
      });
    });

    it('[Happy Path] ADJUSTMENT negatif: mengurangi stok (10 - 4 = 6)', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(-4)
      );

      expect(preview.value).toMatchObject({
        before: 10,
        after: 6,
        delta: -4,
        isValid: true,
      });
    });

    it('[Negative Path] guard null: material null → preview null', () => {
      const { preview } = useStockPreview(
        ref(null),
        ref<MovementType>('IN'),
        ref(5)
      );

      expect(preview.value).toBeNull();
    });

    it('[Negative Path] guard empty: movementType empty string → preview null', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType | ''>(''),
        ref(5)
      );

      expect(preview.value).toBeNull();
    });

    it('[Negative Path] guard quantity empty: quantity "" → preview null', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType>('IN'),
        ref<number | ''>('')
      );

      expect(preview.value).toBeNull();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - IN positif] abs applied: IN -5 → delta +5', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(-5)
      );

      expect(preview.value!.delta).toBe(5);
      expect(preview.value!.after).toBe(15);
    });

    it('[Partisi 2 - OUT positif] abs applied: OUT -3 → delta -3', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('OUT'),
        ref(-3)
      );

      expect(preview.value!.delta).toBe(-3);
      expect(preview.value!.after).toBe(7);
    });

    it('[Partisi 3 - ADJUSTMENT signed] tidak pakai abs: -4 → delta -4', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(-4)
      );

      expect(preview.value!.delta).toBe(-4);
      expect(preview.value!.after).toBe(6);
    });

    it('[Partisi 4 - Quantity string number] "5" → 5', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref<number | ''>('5' as any)
      );

      expect(preview.value!.delta).toBe(5);
    });

    it('[Partisi 5 - Quantity desimal] 2.5 → 2.5', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(2.5)
      );

      expect(preview.value!.delta).toBe(2.5);
      expect(preview.value!.after).toBe(12.5);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - quantity 0] no-op → preview null', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(0)
      );

      expect(preview.value).toBeNull();
    });

    it('[BVA - after = 0] OUT menyentuh nol, isNegative false', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('OUT'),
        ref(10)
      );

      expect(preview.value!.after).toBe(0);
      expect(preview.value!.isNegative).toBe(false);
      expect(preview.value!.isSameAsBefore).toBe(false);
      expect(preview.value!.isValid).toBe(true);
    });

    it('[BVA - after < 0] OUT melebihi stok → isNegative true, isValid false', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('OUT'),
        ref(15)
      );

      expect(preview.value!.after).toBe(-5);
      expect(preview.value!.isNegative).toBe(true);
      expect(preview.value!.isValid).toBe(false);
    });

    it('[BVA - after = minimum_stock] tepat di minimum → isBelowMinimum false', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10, minimum_stock: 5 })),
        ref<MovementType>('OUT'),
        ref(5)
      );

      expect(preview.value!.after).toBe(5);
      expect(preview.value!.isBelowMinimum).toBe(false);
    });

    it('[BVA - after = minimum - 0.01] di bawah minimum → isBelowMinimum true', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10, minimum_stock: 5 })),
        ref<MovementType>('OUT'),
        ref(5.01)
      );

      expect(preview.value!.after).toBe(4.99);
      expect(preview.value!.isBelowMinimum).toBe(true);
    });

    it('[BVA - after = minimum + 0.01] di atas minimum → isBelowMinimum false', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10, minimum_stock: 5 })),
        ref<MovementType>('OUT'),
        ref(4.99)
      );

      expect(preview.value!.after).toBe(5.01);
      expect(preview.value!.isBelowMinimum).toBe(false);
    });

    it('[BVA - same as before] ADJUSTMENT 0 sudah di-guard di awal', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(0)
      );

      expect(preview.value).toBeNull();
    });

    it('[BVA - isSameAsBefore true] ADJUSTMENT dengan delta yang di-round jadi 0', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(0.001)
      );

      expect(preview.value).not.toBeNull();
      expect(preview.value!.after).toBe(10);
      expect(preview.value!.isSameAsBefore).toBe(true);
      expect(preview.value!.isValid).toBe(false);
    });

    it('[BVA - NaN quantity] "abc" → preview null', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType>('IN'),
        ref<number | ''>('abc' as any)
      );

      expect(preview.value).toBeNull();
    });

    it('[BVA - NaN current_stock] preview null', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 'abc' as any })),
        ref<MovementType>('IN'),
        ref(5)
      );

      expect(preview.value).toBeNull();
    });

    it('[BVA - NaN minimum_stock] preview null', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ minimum_stock: 'abc' as any })),
        ref<MovementType>('IN'),
        ref(5)
      );

      expect(preview.value).toBeNull();
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - Floating point] 0.1 + 0.2 tidak jadi 0.30000000000000004', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 0.1 })),
        ref<MovementType>('IN'),
        ref(0.2)
      );

      expect(preview.value!.after).toBe(0.3);
    });

    it('[Edge Case - Rounding 2 desimal] 10.005 → 10.01 (banker-esque)', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(0.005)
      );

      expect(preview.value!.after).toBe(10.01);
    });

    it('[Edge Case - Rounding 3 desimal ke 2] 10.999 → 11.00', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(0.999)
      );

      expect(preview.value!.after).toBe(11);
    });

    it('[Edge Case - Quantity string kosong "" → null]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType>('IN'),
        ref<number | ''>('')
      );

      expect(preview.value).toBeNull();
    });

    it('[Edge Case - Quantity undefined → null]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType>('IN'),
        ref<number | undefined>(undefined)
      );

      expect(preview.value).toBeNull();
    });

    it('[Edge Case - Quantity null → null]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType>('IN'),
        ref<number | null>(null)
      );

      expect(preview.value).toBeNull();
    });

    it('[Edge Case - movementType undefined → null]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType | undefined>(undefined),
        ref(5)
      );

      expect(preview.value).toBeNull();
    });

    it('[Edge Case - movementType invalid → null]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial()),
        ref<MovementType>('INVALID' as any),
        ref(5)
      );

      expect(preview.value).toBeNull();
    });

    it('[Edge Case - Reaktivitas] preview berubah saat quantity berubah', () => {
      const material = ref(createMaterial({ current_stock: 10 }));
      const type = ref<MovementType>('IN');
      const qty = ref<number | ''>(5);

      const { preview } = useStockPreview(material, type, qty);

      expect(preview.value!.after).toBe(15);

      qty.value = 8;
      expect(preview.value!.after).toBe(18);

      qty.value = '';
      expect(preview.value).toBeNull();
    });

    it('[Edge Case - Reaktivitas material] preview berubah saat material berubah', () => {
      const material = ref(createMaterial({ current_stock: 10 }));
      const type = ref<MovementType>('IN');
      const qty = ref<number | ''>(5);

      const { preview } = useStockPreview(material, type, qty);
      expect(preview.value!.before).toBe(10);

      material.value = createMaterial({ current_stock: 20 });
      expect(preview.value!.before).toBe(20);
      expect(preview.value!.after).toBe(25);
    });

    it('[Edge Case - Reaktivitas movementType] IN → OUT mengubah delta', () => {
      const material = ref(createMaterial({ current_stock: 10 }));
      const type = ref<MovementType>('IN');
      const qty = ref<number | ''>(5);

      const { preview } = useStockPreview(material, type, qty);
      expect(preview.value!.delta).toBe(5);
      expect(preview.value!.after).toBe(15);

      type.value = 'OUT';
      expect(preview.value!.delta).toBe(-5);
      expect(preview.value!.after).toBe(5);
    });

    it('[Corner Case - Unit diteruskan apa adanya]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ unit: 'liter' })),
        ref<MovementType>('IN'),
        ref(5)
      );

      expect(preview.value!.unit).toBe('liter');
    });

    it('[Corner Case - current_stock string] Number() coercion', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: '10.5' as any })),
        ref<MovementType>('IN'),
        ref(2)
      );

      expect(preview.value!.before).toBe(10.5);
      expect(preview.value!.after).toBe(12.5);
    });

    it('[Corner Case - minimum_stock string] Number() coercion', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10, minimum_stock: '5' as any })),
        ref<MovementType>('OUT'),
        ref(5.01)
      );

      expect(preview.value!.isBelowMinimum).toBe(true);
    });

    it('[Corner Case - Semua flag false] IN dengan hasil normal di atas minimum', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 100, minimum_stock: 10 })),
        ref<MovementType>('IN'),
        ref(5)
      );

      expect(preview.value).toMatchObject({
        isNegative: false,
        isBelowMinimum: false,
        isSameAsBefore: false,
        isValid: true,
      });
    });

    it('[Corner Case - isBelowMinimum false saat isNegative true]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10, minimum_stock: 5 })),
        ref<MovementType>('OUT'),
        ref(20)
      );

      expect(preview.value!.after).toBe(-10);
      expect(preview.value!.isNegative).toBe(true);
      expect(preview.value!.isBelowMinimum).toBe(false);
    });

    it('[Corner Case - isValid false saat isSameAsBefore true]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(0.001)
      );

      expect(preview.value!.isSameAsBefore).toBe(true);
      expect(preview.value!.isValid).toBe(false);
    });

    it('[Corner Case - isValid true saat after = 0]', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('OUT'),
        ref(10)
      );

      expect(preview.value!.after).toBe(0);
      expect(preview.value!.isValid).toBe(true);
    });

    it('[Corner Case - delta rounding] 2.345 → 2.35 (Math.round)', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(2.345)
      );

      expect(preview.value!.delta).toBe(2.35);
    });

    it('[Corner Case - preview computed di-cache] akses .value 2x return object yang sama', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(5)
      );

      const a = preview.value;
      const b = preview.value;

      expect(a).toBe(b);
    });

    it('[Corner Case - large numbers] stok dan quantity besar', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 1_000_000 })),
        ref<MovementType>('OUT'),
        ref(500_000)
      );

      expect(preview.value!.before).toBe(1_000_000);
      expect(preview.value!.after).toBe(500_000);
      expect(preview.value!.delta).toBe(-500_000);
    });

    it('[Corner Case - very small quantity] 0.01 di ADJUSTMENT', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('ADJUSTMENT'),
        ref(-0.01)
      );

      expect(preview.value!.delta).toBe(-0.01);
      expect(preview.value!.after).toBe(9.99);
      expect(preview.value!.isSameAsBefore).toBe(false);
    });

    it('[Corner Case - quantity di-round jadi 0] 0.001 dengan IN', () => {
      const { preview } = useStockPreview(
        ref(createMaterial({ current_stock: 10 })),
        ref<MovementType>('IN'),
        ref(0.001)
      );

      expect(preview.value).not.toBeNull();
      expect(preview.value!.after).toBe(10);
      expect(preview.value!.isSameAsBefore).toBe(true);
      expect(preview.value!.isValid).toBe(false);
    });
  });
});