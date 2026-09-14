<script setup lang="ts">
import type { RawMaterial } from '@/types/inventory';
import StockStatusBadge from '@/components/inventory/shared/StockStatusBadge.vue';

defineProps<{
  isOpen: boolean;
  material: RawMaterial | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'edit', material: RawMaterial): void;
}>();

/**
 * Format ISO date string to Indonesian short date (e.g., "20 Jan 2024").
 */
const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Get stock banner color scheme based on material state.
 */
const getStockBanner = (material: RawMaterial) => {
  const stock = Number(material.current_stock);
  if (stock === 0) {
    return {
      bg: 'bg-error/10 border-error/20',
      label: 'text-error',
      message: 'Out of stock — urgent action required',
    };
  }
  if (material.is_low_stock) {
    return {
      bg: 'bg-warning/10 border-warning/20',
      label: 'text-warning',
      message: 'Stock is below minimum level',
    };
  }
  return {
    bg: 'bg-success/5 border-success/20',
    label: 'text-success',
    message: 'Stock level is healthy',
  };
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
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="translate-x-full"
          enter-to-class="translate-x-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="translate-x-0"
          leave-to-class="translate-x-full"
        >
          <div
            v-if="material"
            class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl overflow-y-auto"
          >

            <!-- ========================================== -->
            <!-- HEADER                                     -->
            <!-- ========================================== -->
            <div class="px-6 py-5 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
              <div class="min-w-0 flex-1">
                <h3 class="text-lg font-bold truncate">{{ material.name }}</h3>
                <p class="text-[10px] text-text-secondary mt-0.5 font-mono truncate">
                  {{ material.sku }}
                  <template v-if="material.category">
                    · {{ material.category.name }}
                  </template>
                </p>
              </div>
              <button
                @click="emit('close')"
                class="w-8 h-8 rounded-lg hover:bg-gray-100 text-text-secondary flex items-center justify-center shrink-0 ml-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- ========================================== -->
            <!-- STOCK BANNER                               -->
            <!-- ========================================== -->
            <div
              class="px-6 py-4 border-b"
              :class="getStockBanner(material).bg"
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class="text-[10px] font-bold uppercase tracking-widest"
                    :class="getStockBanner(material).label"
                  >
                    Current Stock
                  </p>
                  <p class="text-2xl font-mono font-bold mt-1">
                    {{ Number(material.current_stock).toFixed(2) }}
                    <span class="text-sm font-medium">{{ material.unit }}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] uppercase tracking-widest text-text-secondary">
                    Minimum
                  </p>
                  <p class="text-sm font-mono font-bold mt-1">
                    {{ Number(material.minimum_stock).toFixed(2) }}
                    <span class="text-xs font-medium">{{ material.unit }}</span>
                  </p>
                </div>
              </div>
              <p
                class="text-[11px] mt-2 font-medium flex items-center gap-1.5"
                :class="getStockBanner(material).label"
              >
                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ getStockBanner(material).message }}
              </p>
            </div>

            <!-- ========================================== -->
            <!-- META INFO GRID                             -->
            <!-- ========================================== -->
            <div class="px-6 py-4 grid grid-cols-2 gap-4 border-b border-gray-100">
              <div>
                <p class="text-[10px] uppercase tracking-widest text-disabled font-bold">
                  Unit
                </p>
                <p class="text-sm font-semibold mt-1">{{ material.unit }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-disabled font-bold">
                  Status
                </p>
                <div class="mt-1">
                  <StockStatusBadge
                    :is-active="material.is_active"
                    :is-low-stock="material.is_low_stock"
                    :current-stock="Number(material.current_stock)"
                  />
                </div>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-disabled font-bold">
                  Created
                </p>
                <p class="text-sm font-semibold mt-1">{{ formatDate(material.created_at) }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase tracking-widest text-disabled font-bold">
                  Last Update
                </p>
                <p class="text-sm font-semibold mt-1">{{ formatDate(material.updated_at) }}</p>
              </div>
            </div>

            <!-- ========================================== -->
            <!-- ACTIONS                                    -->
            <!-- ========================================== -->
            <div class="px-6 py-4 flex gap-2 border-b border-gray-100">
              <button
                @click="emit('edit', material)"
                class="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Material
              </button>
            </div>

            <!-- ========================================== -->
            <!-- INFO NOTE                                  -->
            <!-- ========================================== -->
            <div class="px-6 py-5">
              <div class="p-3 rounded-xl bg-info/5 border border-info/20 text-[11px] text-info flex gap-2">
                <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  To see the full movement history of this material, open the
                  <strong>Stock Movements</strong> page and filter by this material.
                </span>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>