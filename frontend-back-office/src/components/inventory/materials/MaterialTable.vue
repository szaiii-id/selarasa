<script setup lang="ts">
import type { RawMaterial } from '@/types/inventory';
import StockStatusBadge from '@/components/inventory/shared/StockStatusBadge.vue';
import UnitDisplay from '@/components/inventory/shared/UnitDisplay.vue';

defineProps<{
  materials: RawMaterial[];
  isLoading: boolean;
  errorMessage: string | null;
}>();

defineEmits<{
  (e: 'view', material: RawMaterial): void;
  (e: 'edit', material: RawMaterial): void;
  (e: 'retry'): void;
}>();

/**
 * Determine row styling based on material state.
 * Priority: Inactive > Out of Stock > Low Stock > Default
 */
const getRowClass = (material: RawMaterial): string => {
  if (!material.is_active) return 'opacity-60';
  const stock = Number(material.current_stock);
  const minimum = Number(material.minimum_stock);
  if (stock === 0) return 'bg-error/5 border-l-4 border-error';
  if (stock <= minimum) return 'bg-warning/5 border-l-4 border-warning';
  return '';
};
</script>

<template>
  <!-- ========================================== -->
  <!-- LOADING STATE                              -->
  <!-- ========================================== -->
  <div v-if="isLoading && materials.length === 0" class="p-12 text-center">
    <div class="inline-block w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    <p class="text-xs text-text-secondary mt-3">Loading materials...</p>
  </div>

  <!-- ========================================== -->
  <!-- ERROR STATE                                -->
  <!-- ========================================== -->
  <div v-else-if="errorMessage" class="p-12 text-center">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-error/10 text-error mb-3">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <p class="text-sm font-semibold text-error">{{ errorMessage }}</p>
    <button
      @click="$emit('retry')"
      class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition"
    >
      Try Again
    </button>
  </div>

  <!-- ========================================== -->
  <!-- EMPTY STATE                                -->
  <!-- ========================================== -->
  <div v-else-if="materials.length === 0" class="p-12 text-center">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </div>
    <p class="text-sm font-bold">No materials found</p>
    <p class="text-xs text-text-secondary mt-1">
      Try adjusting your filters or add a new material
    </p>
  </div>

  <!-- ========================================== -->
  <!-- TABLE                                      -->
  <!-- ========================================== -->
  <div v-else class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-white/40 text-text-secondary text-[10px] uppercase tracking-widest">
          <th class="text-left px-6 py-4 font-bold">SKU / Name</th>
          <th class="text-left px-6 py-4 font-bold">Category</th>
          <th class="text-right px-6 py-4 font-bold">Stock</th>
          <th class="text-right px-6 py-4 font-bold">Min</th>
          <th class="text-center px-6 py-4 font-bold">Status</th>
          <th class="text-right px-6 py-4 font-bold w-40">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/60">
        <tr
          v-for="material in materials"
          :key="material.id"
          class="hover:bg-white/40 transition"
          :class="getRowClass(material)"
        >
          <!-- SKU / Name -->
          <td class="px-6 py-4">
            <p class="font-bold">{{ material.name }}</p>
            <p class="text-[10px] text-disabled font-mono mt-0.5">
              {{ material.sku }}
            </p>
          </td>

          <!-- Category -->
          <td class="px-6 py-4">
            <span
              v-if="material.category"
              class="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold"
            >
              {{ material.category.name }}
            </span>
            <span v-else class="text-disabled text-xs">—</span>
          </td>

          <!-- Current Stock -->
          <td class="px-6 py-4 text-right">
            <UnitDisplay
              :value="Number(material.current_stock)"
              :unit="material.unit"
              :state="
                Number(material.current_stock) === 0
                  ? 'danger'
                  : material.is_low_stock
                  ? 'warning'
                  : 'default'
              "
            />
          </td>

          <!-- Minimum Stock -->
          <td class="px-6 py-4 text-right font-mono text-xs text-text-secondary whitespace-nowrap">
            {{ Number(material.minimum_stock).toFixed(2) }}
          </td>

          <!-- Status Badge -->
          <td class="px-6 py-4 text-center">
            <StockStatusBadge
              :is-active="material.is_active"
              :is-low-stock="material.is_low_stock"
              :current-stock="Number(material.current_stock)"
            />
          </td>

          <!-- Actions with Labels -->
          <td class="px-6 py-4">
            <div class="flex items-center justify-end gap-1.5">

              <!-- View -->
              <button
                @click="$emit('view', material)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:bg-info/10 hover:text-info transition-colors"
                title="View Details"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>

              <!-- Edit -->
              <button
                @click="$emit('edit', material)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                title="Edit"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>

            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>