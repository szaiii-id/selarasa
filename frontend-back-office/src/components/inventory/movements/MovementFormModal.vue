<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useStockPreview } from '@/composables/useStockPreview';
import type {
  StockMovementPayload,
  MovementType,
  RawMaterial,
} from '@/types/inventory';
import type { MaterialOption } from '@/composables/useMaterialOptions';

const props = defineProps<{
  isOpen: boolean;
  isLoading: boolean;
  materialOptions: MaterialOption[];
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: StockMovementPayload): void;
}>();

// ==========================================
// FORM STATE
// ==========================================
const form = ref<StockMovementPayload>({
  raw_material_id: '',
  movement_type: '',
  quantity: '',
  reason: '',
  reference_id: '',
});

// ==========================================
// SELECTED MATERIAL FOR PREVIEW
// ==========================================
const selectedMaterial = computed<RawMaterial | null>(() => {
  if (form.value.raw_material_id === '') return null;

  const opt = props.materialOptions.find((o) => o.value === form.value.raw_material_id);
  if (!opt) return null;

  return {
    id: opt.value,
    name: opt.label,
    sku: opt.sku,
    unit: opt.unit,
    current_stock: opt.currentStock,
    minimum_stock: opt.minimumStock,
    is_low_stock: opt.isLowStock,
    is_active: opt.isActive,
    category_id: 0,
    created_at: null,
    updated_at: null,
  };
});

const movementType = computed(() => form.value.movement_type);
const quantity = computed(() => form.value.quantity);

// ==========================================
// LIVE STOCK PREVIEW
// ==========================================
const { preview } = useStockPreview(selectedMaterial, movementType, quantity);

// ==========================================
// TYPE-AWARE HELPERS
// ==========================================
const isAdjustment = computed(() => form.value.movement_type === 'ADJUSTMENT');

/**
 * HTML input min attribute:
 * - IN / OUT   : 0 (positive only)
 * - ADJUSTMENT : undefined (allow signed)
 */
const quantityMin = computed<number | undefined>(() =>
  isAdjustment.value ? undefined : 0
);

/**
 * Dynamic hint text per movement type.
 */
const quantityHint = computed<string>(() => {
  switch (form.value.movement_type) {
    case 'IN':
      return 'Enter a positive number — this will ADD to the current stock.';
    case 'OUT':
      return 'Enter a positive number — this will SUBTRACT from the current stock.';
    case 'ADJUSTMENT':
      return 'Enter a signed delta: positive to increase, negative to decrease (e.g., -3).';
    default:
      return 'Select a movement type first.';
  }
});

// ==========================================
// QUICK REASON SUGGESTIONS
// ==========================================
const REASON_SUGGESTIONS = [
  'Supplier Delivery',
  'Expired / Spillage',
  'Stock Opname',
  'Staff Meal',
  'Return to Supplier',
];

const applyReason = (text: string) => {
  form.value.reason = text;
};

// ==========================================
// VALIDATION
// ==========================================
const isFormValid = computed(() => {
  if (form.value.raw_material_id === '') return false;
  if (form.value.movement_type === '') return false;

  // Quantity check
  if (form.value.quantity === '') return false;
  const qtyNum = Number(form.value.quantity);
  if (isNaN(qtyNum) || qtyNum === 0) return false;

  // For IN/OUT: quantity must be positive (backend will reject negative anyway)
  if (!isAdjustment.value && qtyNum < 0) return false;

  // Reason check (trimmed, minimal 3 chars — matches backend)
  if (form.value.reason.trim().length < 3) return false;

  return true;
});

const canSubmit = computed(() => {
  if (!isFormValid.value) return false;
  if (!preview.value) return false;
  if (preview.value.isNegative) return false;
  if (preview.value.isSameAsBefore) return false;
  return true;
});

// ==========================================
// RESET FORM ON OPEN
// ==========================================
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;
    form.value = {
      raw_material_id: '',
      movement_type: '',
      quantity: '',
      reason: '',
      reference_id: '',
    };
  },
  { immediate: true }
);

// ==========================================
// HANDLERS
// ==========================================
const handleSubmit = () => {
  if (!canSubmit.value || props.isLoading) return;

  const qty = Number(form.value.quantity);

  // Resolve quantity per movement type.
  // IMPORTANT: IN and OUT always send POSITIVE quantity.
  // The backend (InventoryService) converts OUT to a negative delta internally.
  // Only ADJUSTMENT sends a signed value (delta semantics).
  let quantityToSend: number;
  switch (form.value.movement_type) {
    case 'IN':
      quantityToSend = Math.abs(qty);
      break;
    case 'OUT':
      quantityToSend = Math.abs(qty);   // POSITIVE (backend converts to negative)
      break;
    case 'ADJUSTMENT':
      quantityToSend = qty;              // signed as-is (can be + or -)
      break;
    default:
      return; // Should never happen (guarded by isFormValid)
  }

  emit('submit', {
    raw_material_id: Number(form.value.raw_material_id),
    movement_type: form.value.movement_type as MovementType,
    quantity: quantityToSend,
    reason: form.value.reason.trim(),
    reference_id: form.value.reference_id?.trim() || null,
  });
};

const handleClose = () => {
  if (props.isLoading) return;
  emit('close');
};

// ==========================================
// PREVIEW STYLING
// ==========================================
const previewBoxClass = computed(() => {
  if (!preview.value) return '';
  if (preview.value.isNegative) return 'bg-error/5 border-error/40';
  if (preview.value.isBelowMinimum) return 'bg-warning/5 border-warning/30';
  return 'bg-success/5 border-success/30';
});

const previewLabelClass = computed(() => {
  if (!preview.value) return 'text-text-secondary';
  if (preview.value.isNegative) return 'text-error';
  if (preview.value.isBelowMinimum) return 'text-warning';
  return 'text-success';
});

const previewIcon = computed(() => {
  if (!preview.value) return 'info';
  if (preview.value.isNegative) return 'block';
  if (preview.value.isBelowMinimum) return 'warning';
  return 'check';
});

const previewMessage = computed(() => {
  if (!preview.value) return '';
  if (preview.value.isNegative) {
    return 'Stock would become negative — operation rejected by server';
  }
  if (preview.value.isBelowMinimum) {
    return 'Result will be below minimum stock level';
  }
  if (preview.value.isSameAsBefore) {
    return 'No change from current stock';
  }
  return 'Stock level will remain healthy';
});

// ==========================================
// MOVEMENT TYPE BUTTONS
// ==========================================
const movementTypes: { value: MovementType; label: string; color: string }[] = [
  { value: 'IN', label: 'IN', color: 'success' },
  { value: 'OUT', label: 'OUT', color: 'error' },
  { value: 'ADJUSTMENT', label: 'ADJUST', color: 'warning' },
];

const selectMovementType = (type: MovementType) => {
  form.value.movement_type = type;
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
        @click.self="handleClose"
      >
        <div class="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8">

          <!-- ========================================== -->
          <!-- HEADER                                     -->
          <!-- ========================================== -->
          <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold">Record Stock Movement</h3>
              <p class="text-xs text-text-secondary mt-0.5">
                Log material in/out or adjustment in the audit trail
              </p>
            </div>
            <button
              @click="handleClose"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 text-text-secondary flex items-center justify-center"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- ========================================== -->
          <!-- BODY                                       -->
          <!-- ========================================== -->
          <div class="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">

            <!-- Raw Material -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Raw Material <span class="text-error">*</span>
              </label>
              <div class="relative">
                <select
                  v-model="form.raw_material_id"
                  class="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                  :class="errors.raw_material_id ? 'border-error' : 'border-gray-200'"
                >
                  <option value="" disabled>-- Select Material --</option>
                  <option
                    v-for="opt in materialOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }} — {{ opt.sku }}
                    <template v-if="opt.isLowStock"> (Low Stock)</template>
                  </option>
                </select>
                <svg
                  class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p v-if="errors.raw_material_id" class="mt-1.5 text-[10px] text-error font-medium">
                {{ errors.raw_material_id[0] }}
              </p>

              <!-- Current stock hint -->
              <p v-if="selectedMaterial" class="mt-1.5 text-[10px] text-text-secondary">
                Current stock:
                <span class="font-mono font-bold text-text-primary">
                  {{ Number(selectedMaterial.current_stock).toFixed(2) }} {{ selectedMaterial.unit }}
                </span>
                ·
                Minimum:
                <span class="font-mono">
                  {{ Number(selectedMaterial.minimum_stock).toFixed(2) }} {{ selectedMaterial.unit }}
                </span>
              </p>
            </div>

            <!-- Movement Type -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Movement Type <span class="text-error">*</span>
              </label>
              <div class="grid grid-cols-3 gap-2 p-1.5 rounded-xl bg-gray-100">
                <button
                  v-for="t in movementTypes"
                  :key="t.value"
                  type="button"
                  @click="selectMovementType(t.value)"
                  class="px-4 py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
                  :class="
                    form.movement_type === t.value
                      ? t.value === 'IN'
                        ? 'bg-success text-white shadow'
                        : t.value === 'OUT'
                        ? 'bg-error text-white shadow'
                        : 'bg-warning text-white shadow'
                      : 'text-text-secondary hover:bg-white/60'
                  "
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path
                      v-if="t.value === 'IN'"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                    <path
                      v-else-if="t.value === 'OUT'"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                    <path
                      v-else
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  {{ t.label }}
                </button>
              </div>
              <p v-if="errors.movement_type" class="mt-1.5 text-[10px] text-error font-medium">
                {{ errors.movement_type[0] }}
              </p>
            </div>

            <!-- Quantity -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Quantity <span class="text-error">*</span>
                <span v-if="isAdjustment" class="ml-1 text-[9px] text-warning font-normal normal-case tracking-normal">
                  (signed delta)
                </span>
              </label>
              <div class="relative">
                <input
                  v-model="form.quantity"
                  type="number"
                  step="0.01"
                  :min="quantityMin"
                  placeholder="0.00"
                  class="w-full px-4 py-3 pr-16 rounded-xl bg-gray-50 border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                  :class="errors.quantity ? 'border-error' : 'border-gray-200'"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">
                  {{ selectedMaterial?.unit || '—' }}
                </span>
              </div>
              <p v-if="errors.quantity" class="mt-1.5 text-[10px] text-error font-medium">
                {{ errors.quantity[0] }}
              </p>
              <p v-else class="mt-1.5 text-[10px]" :class="isAdjustment ? 'text-warning font-medium' : 'text-text-disabled'">
                {{ quantityHint }}
              </p>
            </div>

            <!-- Live Preview -->
            <div
              v-if="preview"
              class="p-4 rounded-2xl border-2 transition-colors"
              :class="previewBoxClass"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5"
                    :class="previewLabelClass"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path
                        v-if="previewIcon === 'check'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                      <path
                        v-else-if="previewIcon === 'warning'"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                      <path
                        v-else
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                    Preview Balance
                  </p>
                  <div class="flex items-center gap-3 font-mono text-lg">
                    <span class="text-text-secondary">
                      {{ preview.before.toFixed(2) }}
                    </span>
                    <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span class="font-bold" :class="previewLabelClass">
                      {{ preview.after.toFixed(2) }} {{ preview.unit }}
                    </span>
                  </div>
                  <p class="text-[11px] mt-1.5 font-medium" :class="previewLabelClass">
                    {{ previewMessage }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Reason -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Reason <span class="text-error">*</span>
              </label>
              <input
                v-model="form.reason"
                type="text"
                placeholder="e.g., Supplier Delivery, Expired / Spillage"
                maxlength="255"
                class="w-full px-4 py-3 rounded-xl bg-gray-50 border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                :class="errors.reason ? 'border-error' : 'border-gray-200'"
              />
              <p v-if="errors.reason" class="mt-1.5 text-[10px] text-error font-medium">
                {{ errors.reason[0] }}
              </p>

              <!-- Quick Reason Suggestions -->
              <div v-else class="flex flex-wrap gap-1.5 mt-2">
                <button
                  v-for="suggestion in REASON_SUGGESTIONS"
                  :key="suggestion"
                  type="button"
                  @click="applyReason(suggestion)"
                  class="px-2.5 py-1 rounded-md bg-gray-100 text-[10px] font-semibold text-text-secondary hover:bg-gray-200 transition"
                >
                  {{ suggestion }}
                </button>
              </div>
            </div>

            <!-- Reference ID -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Reference ID
                <span class="text-text-disabled font-normal normal-case">(optional)</span>
              </label>
              <input
                v-model="form.reference_id"
                type="text"
                placeholder="PO-2024-001 or invoice number"
                maxlength="100"
                class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                :class="errors.reference_id ? 'border-error' : 'border-gray-200'"
              />
              <p v-if="errors.reference_id" class="mt-1.5 text-[10px] text-error font-medium">
                {{ errors.reference_id[0] }}
              </p>
            </div>

          </div>

          <!-- ========================================== -->
          <!-- FOOTER                                     -->
          <!-- ========================================== -->
          <div class="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-[10px] text-text-disabled">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Movements are permanent — cannot be edited or deleted
            </div>
            <div class="flex gap-3">
              <button
                @click="handleClose"
                :disabled="isLoading"
                class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                @click="handleSubmit"
                :disabled="!canSubmit || isLoading"
                class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg
                  v-if="isLoading"
                  class="w-3.5 h-3.5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Record Movement
              </button>
            </div>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>