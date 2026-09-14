<script setup lang="ts">
import { computed } from 'vue';
import type { MovementType } from '@/types/inventory';

export interface MaterialOption {
  value: number;
  label: string;
  sku: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  isLowStock: boolean;
  isActive: boolean;
}

const props = defineProps<{
  rawMaterialId: number | '';
  movementType: MovementType | '';
  startDate: string;
  endDate: string;
  materialOptions: MaterialOption[];
}>();

const emit = defineEmits<{
  (e: 'update:rawMaterialId', value: number | ''): void;
  (e: 'update:movementType', value: MovementType | ''): void;
  (e: 'update:startDate', value: string): void;
  (e: 'update:endDate', value: string): void;
  (e: 'preset-today'): void;
  (e: 'preset-7d'): void;
  (e: 'preset-30d'): void;
  (e: 'clear-dates'): void;
}>();

// ==========================================
// COMPUTED TWO-WAY BINDINGS
// ==========================================
const materialSelectValue = computed({
  get: () => props.rawMaterialId,
  set: (value) => emit('update:rawMaterialId', value),
});

const typeSelectValue = computed({
  get: () => props.movementType,
  set: (value) => emit('update:movementType', value),
});

const startDateValue = computed({
  get: () => props.startDate,
  set: (value) => emit('update:startDate', value),
});

const endDateValue = computed({
  get: () => props.endDate,
  set: (value) => emit('update:endDate', value),
});

// ==========================================
// DATE PRESET ACTIVE STATE
// ==========================================
/**
 * Detect if the current date range matches a preset.
 * Only for visual highlighting — actual range set by parent.
 */
const activePreset = computed<'today' | '7d' | '30d' | null>(() => {
  if (!props.startDate || !props.endDate) return null;

  const today = new Date().toISOString().slice(0, 10);

  if (props.startDate === today && props.endDate === today) return 'today';

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  if (
    props.startDate === sevenDaysAgo.toISOString().slice(0, 10) &&
    props.endDate === today
  ) {
    return '7d';
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  if (
    props.startDate === thirtyDaysAgo.toISOString().slice(0, 10) &&
    props.endDate === today
  ) {
    return '30d';
  }

  return null;
});

const hasDateFilter = computed(() => !!props.startDate || !!props.endDate);
</script>

<template>
  <div class="glass rounded-3xl p-5 shadow-sm space-y-3">

    <!-- ========================================== -->
    <!-- ROW 1: Search + Type + Material            -->
    <!-- ========================================== -->
    <div class="flex flex-wrap gap-3">

      <!-- Movement Type -->
      <div class="relative min-w-[150px]">
        <select
          v-model="typeSelectValue"
          class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
        >
          <option value="">All Types</option>
          <option value="IN">IN — Stock In</option>
          <option value="OUT">OUT — Stock Out</option>
          <option value="ADJUSTMENT">ADJUSTMENT</option>
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

      <!-- Material -->
      <div class="relative flex-1 min-w-[240px]">
        <select
          v-model="materialSelectValue"
          class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
        >
          <option value="">All Materials</option>
          <option
            v-for="opt in materialOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }} — {{ opt.sku }}
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

    </div>

    <!-- ========================================== -->
    <!-- ROW 2: Date Range + Presets                -->
    <!-- ========================================== -->
    <div class="flex flex-wrap gap-3 items-center">

      <!-- Date Range Label -->
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-text-secondary shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-xs font-semibold text-text-secondary">Date Range:</span>
      </div>

      <!-- Start Date -->
      <input
        v-model="startDateValue"
        type="date"
        class="px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <!-- Separator -->
      <span class="text-text-disabled text-xs">—</span>

      <!-- End Date -->
      <input
        v-model="endDateValue"
        type="date"
        class="px-3 py-2 rounded-lg bg-white/60 border border-white/70 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
      />

      <!-- Clear Button -->
      <button
        v-if="hasDateFilter"
        @click="$emit('clear-dates')"
        class="w-7 h-7 rounded-lg hover:bg-error/10 text-text-secondary hover:text-error transition-colors flex items-center justify-center"
        title="Clear date filter"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <!-- Presets — right-aligned on wide screens -->
      <div class="flex gap-1.5 ml-auto">
        <button
          @click="$emit('preset-today')"
          class="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
          :class="
            activePreset === 'today'
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-white/60 text-text-secondary border-white/70 hover:bg-white/80'
          "
        >
          Today
        </button>
        <button
          @click="$emit('preset-7d')"
          class="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
          :class="
            activePreset === '7d'
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-white/60 text-text-secondary border-white/70 hover:bg-white/80'
          "
        >
          7 Days
        </button>
        <button
          @click="$emit('preset-30d')"
          class="px-3 py-1.5 rounded-lg text-xs font-bold border transition"
          :class="
            activePreset === '30d'
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'bg-white/60 text-text-secondary border-white/70 hover:bg-white/80'
          "
        >
          30 Days
        </button>
      </div>

    </div>

  </div>
</template>