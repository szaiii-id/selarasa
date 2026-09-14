<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { RawMaterial, RawMaterialPayload } from '@/types/inventory';
import type { CategoryOption } from '@/composables/useCategoryOptions';

const props = defineProps<{
  isOpen: boolean;
  isLoading: boolean;
  materialToEdit: RawMaterial | null;
  categoryOptions: CategoryOption[];
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: RawMaterialPayload): void;
}>();

// ==========================================
// CONSTANTS
// ==========================================
const UNIT_OPTIONS = ['kg', 'gr', 'L', 'ml', 'pcs'] as const;

// ==========================================
// FORM STATE
// ==========================================
const form = ref<RawMaterialPayload>({
  category_id: '',
  sku: '',
  name: '',
  unit: 'kg',
  minimum_stock: '',
  is_active: true,
});

const isEditing = computed(() => !!props.materialToEdit);

const isValid = computed(() => {
  return (
    form.value.category_id !== '' &&
    form.value.sku.trim().length > 0 &&
    form.value.name.trim().length > 0 &&
    form.value.unit !== '' &&
    form.value.minimum_stock !== '' &&
    Number(form.value.minimum_stock) >= 0
  );
});

// ==========================================
// RESET FORM ON OPEN
// ==========================================
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;

    if (props.materialToEdit) {
      form.value = {
        category_id: props.materialToEdit.category_id,
        sku: props.materialToEdit.sku,
        name: props.materialToEdit.name,
        unit: props.materialToEdit.unit,
        minimum_stock: Number(props.materialToEdit.minimum_stock),
        is_active: props.materialToEdit.is_active,
      };
    } else {
      form.value = {
        category_id: '',
        sku: '',
        name: '',
        unit: 'kg',
        minimum_stock: '',
        is_active: true,
      };
    }
  },
  { immediate: true }
);

// ==========================================
// HANDLERS
// ==========================================
const handleSubmit = () => {
  if (!isValid.value || props.isLoading) return;

  emit('submit', {
    category_id: Number(form.value.category_id),
    sku: form.value.sku.trim().toUpperCase(),
    name: form.value.name.trim(),
    unit: form.value.unit,
    minimum_stock: Number(form.value.minimum_stock),
    is_active: form.value.is_active,
  });
};

const handleClose = () => {
  if (props.isLoading) return;
  emit('close');
};

const toggleActive = () => {
  form.value.is_active = !form.value.is_active;
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
              <h3 class="text-lg font-bold">
                {{ isEditing ? 'Edit Material' : 'Add New Material' }}
              </h3>
              <p class="text-xs text-text-secondary mt-0.5">
                {{
                  isEditing
                    ? 'Update raw material details'
                    : 'Register a new raw material for your warehouse'
                }}
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

            <!-- Info Banner (create mode only) -->
            <div
              v-if="!isEditing"
              class="p-3 rounded-xl bg-info/5 border border-info/20 text-xs text-info flex gap-2"
            >
              <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Initial stock will be <strong>0</strong>. To add stock, use the
                <strong>Stock Movements</strong> page.
              </span>
            </div>

            <!-- Row 1: SKU + Category -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

              <!-- SKU -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                  SKU <span class="text-error">*</span>
                </label>
                <input
                  v-model="form.sku"
                  type="text"
                  placeholder="RM-0012-APF"
                  maxlength="50"
                  class="w-full px-4 py-2.5 rounded-xl bg-gray-50 border text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                  :class="errors.sku ? 'border-error' : 'border-gray-200'"
                />
                <p v-if="errors.sku" class="mt-1.5 text-[10px] text-error font-medium">
                  {{ errors.sku[0] }}
                </p>
                <p v-else class="mt-1.5 text-[10px] text-disabled">
                  Unique code — auto-uppercase
                </p>
              </div>

              <!-- Category -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                  Category <span class="text-error">*</span>
                </label>
                <div class="relative">
                  <select
                    v-model="form.category_id"
                    class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-gray-50 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                    :class="errors.category_id ? 'border-error' : 'border-gray-200'"
                  >
                    <option value="" disabled>-- Select Category --</option>
                    <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <svg
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-disabled pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p v-if="errors.category_id" class="mt-1.5 text-[10px] text-error font-medium">
                  {{ errors.category_id[0] }}
                </p>
              </div>

            </div>

            <!-- Name -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Material Name <span class="text-error">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g., Fresh Milk UHT"
                maxlength="150"
                class="w-full px-4 py-2.5 rounded-xl bg-gray-50 border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                :class="errors.name ? 'border-error' : 'border-gray-200'"
              />
              <p v-if="errors.name" class="mt-1.5 text-[10px] text-error font-medium">
                {{ errors.name[0] }}
              </p>
              <p v-else class="mt-1.5 text-[10px] text-disabled">
                {{ form.name.length }}/150 characters
              </p>
            </div>

            <!-- Row 3: Unit + Minimum Stock -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

              <!-- Unit -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                  Unit <span class="text-error">*</span>
                </label>
                <div class="relative">
                  <select
                    v-model="form.unit"
                    class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-gray-50 border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                    :class="errors.unit ? 'border-error' : 'border-gray-200'"
                  >
                    <option v-for="u in UNIT_OPTIONS" :key="u" :value="u">{{ u }}</option>
                  </select>
                  <svg
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-disabled pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p v-if="errors.unit" class="mt-1.5 text-[10px] text-error font-medium">
                  {{ errors.unit[0] }}
                </p>
              </div>

              <!-- Minimum Stock -->
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                  Minimum Stock <span class="text-error">*</span>
                </label>
                <div class="relative">
                  <input
                    v-model="form.minimum_stock"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="5.00"
                    class="w-full px-4 py-2.5 pr-14 rounded-xl bg-gray-50 border text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
                    :class="errors.minimum_stock ? 'border-error' : 'border-gray-200'"
                  />
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-secondary">
                    {{ form.unit }}
                  </span>
                </div>
                <p v-if="errors.minimum_stock" class="mt-1.5 text-[10px] text-error font-medium">
                  {{ errors.minimum_stock[0] }}
                </p>
                <p v-else class="mt-1.5 text-[10px] text-disabled">
                  Alert triggers when stock falls to or below this value
                </p>
              </div>

            </div>

            <!-- Current Stock (read-only, edit mode only) -->
            <div v-if="isEditing && materialToEdit">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Current Stock
                <span class="text-disabled font-normal normal-case tracking-normal ml-1">
                  (read-only)
                </span>
              </label>
              <div class="relative">
                <input
                  :value="Number(materialToEdit.current_stock).toFixed(2)"
                  type="text"
                  readonly
                  class="w-full px-4 py-2.5 pr-12 rounded-xl bg-gray-100 border border-gray-200 text-sm font-mono font-bold text-disabled cursor-not-allowed"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-disabled">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <p class="mt-1.5 text-[10px] text-info">
                Stock can only be changed through Stock Movements.
              </p>
            </div>

            <!-- Is Active Toggle -->
            <div class="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <p class="text-sm font-bold">Active Status</p>
                <p class="text-xs text-text-secondary mt-0.5">
                  Inactive materials cannot be used in new recipes or movements
                </p>
              </div>
              <button
                type="button"
                @click="toggleActive"
                class="w-12 h-6 rounded-full relative transition-colors shrink-0"
                :class="form.is_active ? 'bg-success' : 'bg-gray-300'"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  :class="form.is_active ? 'right-0.5' : 'left-0.5'"
                ></span>
              </button>
            </div>

          </div>

          <!-- ========================================== -->
          <!-- FOOTER                                     -->
          <!-- ========================================== -->
          <div class="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              @click="handleClose"
              :disabled="isLoading"
              class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              @click="handleSubmit"
              :disabled="isLoading || !isValid"
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
              {{ isEditing ? 'Save Changes' : 'Create Material' }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>