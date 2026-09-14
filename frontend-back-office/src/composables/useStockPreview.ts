// src/composables/useStockPreview.ts
import { computed, type Ref } from 'vue';
import type { RawMaterial, MovementType } from '@/types/inventory';

/**
 * Hasil preview balance untuk form Stock Movement.
 */
export interface StockPreview {
  /** Stok sebelum mutasi */
  before: number;
  /** Stok setelah mutasi */
  after: number;
  /** Delta perubahan (signed: + untuk IN, - untuk OUT, +/- untuk ADJUSTMENT) */
  delta: number;
  /** Satuan (kg, L, pcs, dll) */
  unit: string;
  /** True jika hasil akhir < 0 — operasi akan ditolak backend */
  isNegative: boolean;
  /** True jika hasil akhir di bawah minimum_stock */
  isBelowMinimum: boolean;
  /** True jika hasil akhir sama dengan stok saat ini (tidak ada perubahan) */
  isSameAsBefore: boolean;
  /** True jika aman untuk submit */
  isValid: boolean;
}

/**
 * Composable untuk menghitung preview balance secara real-time.
 * Dipakai di MovementFormModal untuk menampilkan `3.00 → 1.00 L`.
 *
 * Interpretation (delta semantics — must match backend InventoryService):
 * - IN         : qty is positive delta (abs applied)  → after = before + |qty|
 * - OUT        : qty is positive delta (abs applied)  → after = before - |qty|
 * - ADJUSTMENT : qty is SIGNED delta (as-is)          → after = before + qty
 *
 * @param material - Ref ke material yang dipilih (bisa null)
 * @param movementType - Ref ke tipe mutasi (IN/OUT/ADJUSTMENT)
 * @param quantity - Ref ke jumlah yang diinput (bisa number atau string kosong)
 */
export function useStockPreview(
  material: Ref<RawMaterial | null | undefined>,
  movementType: Ref<MovementType | '' | undefined>,
  quantity: Ref<number | '' | undefined>
) {
  const preview = computed<StockPreview | null>(() => {
    // ==========================================
    // 1. GUARD: butuh semua nilai terisi
    // ==========================================
    if (
      !material.value ||
      !movementType.value ||
      quantity.value === '' ||
      quantity.value === undefined ||
      quantity.value === null
    ) {
      return null;
    }

    const before  = Number(material.value.current_stock);
    const minimum = Number(material.value.minimum_stock);
    const rawQty  = Number(quantity.value);

    // ==========================================
    // 2. GUARD: pastikan angka valid
    // ==========================================
    if (isNaN(before) || isNaN(rawQty) || isNaN(minimum)) return null;
    if (rawQty === 0) return null;   // No-op — tidak ada perubahan

    // ==========================================
    // 3. HITUNG DELTA BERDASARKAN TYPE
    // ==========================================
    let delta: number;

    switch (movementType.value) {
      case 'IN':
        // IN: user input positive, kita pakai abs untuk safety
        delta = Math.abs(rawQty);
        break;

      case 'OUT':
        // OUT: user input positive, kita konversi ke negative
        delta = -Math.abs(rawQty);
        break;

      case 'ADJUSTMENT':
        // ADJUSTMENT: signed delta as-is (bisa +/-)
        delta = rawQty;
        break;

      default:
        return null;
    }

    // ==========================================
    // 4. HITUNG AFTER (delta semantics)
    // ==========================================
    const after = before + delta;

    // ==========================================
    // 5. ROUNDING (hindari floating-point drift)
    // ==========================================
    const roundedBefore = Math.round(before * 100) / 100;
    const roundedAfter  = Math.round(after * 100) / 100;
    const roundedDelta  = Math.round(delta * 100) / 100;

    // ==========================================
    // 6. RETURN PREVIEW
    // ==========================================
    return {
      before: roundedBefore,
      after: roundedAfter,
      delta: roundedDelta,
      unit: material.value.unit,
      isNegative: roundedAfter < 0,
      isBelowMinimum: roundedAfter < minimum && roundedAfter >= 0,
      isSameAsBefore: roundedAfter === roundedBefore,
      isValid: roundedAfter >= 0 && roundedAfter !== roundedBefore,
    };
  });

  return { preview };
}