<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryOption } from '@/composables/useCategoryOptions';

// ==========================================
// PROPS
// ==========================================
// NOTE: Boolean props use `unknown` type to avoid Vue's boolean coercion.
// Vue coerces empty string ('') to `true` when prop type includes `Boolean`.
// By typing as `unknown`, we receive the raw value ('' stays '').
const props = defineProps<{
  search: string;
  categoryId: number | '';
  isActive: unknown;
  isLowStock: unknown;
  isOutOfStock: unknown;
  categoryOptions: CategoryOption[];
}>();

// ==========================================
// EMITS
// ==========================================
const emit = defineEmits<{
  (e: 'update:search', value: string): void;
  (e: 'update:categoryId', value: number | ''): void;
  (e: 'update:isActive', value: boolean | ''): void;
  (e: 'update:stockFilter', value: '' | 'low_stock' | 'out_of_stock'): void;
}>();

// ==========================================
// DERIVED VALUES (for :value bindings)
// ==========================================
/**
 * Current status value as string.
 * - 'true'  → props.isActive === true
 * - 'false' → props.isActive === false
 * - ''      → otherwise (all status)
 */
const statusValue = computed<string>(() => {
  if (props.isActive === true) return 'true';
  if (props.isActive === false) return 'false';
  return '';
});

/**
 * Current stock filter as string.
 * - 'low_stock'    → props.isLowStock === true
 * - 'out_of_stock' → props.isOutOfStock === true
 * - ''             → otherwise (all stock levels)
 */
const stockValue = computed<'' | 'low_stock' | 'out_of_stock'>(() => {
  if (props.isOutOfStock === true) return 'out_of_stock';
  if (props.isLowStock === true) return 'low_stock';
  return '';
});

/**
 * Current category value.
 */
const categoryValue = computed<string>(() => String(props.categoryId));

// ==========================================
// CHANGE HANDLERS
// ==========================================
const onSearchInput = (event: Event) => {
  emit('update:search', (event.target as HTMLInputElement).value);
};

const onCategoryChange = (event: Event) => {
  const val = (event.target as HTMLSelectElement).value;
  emit('update:categoryId', val === '' ? '' : Number(val));
};

const onStatusChange = (event: Event) => {
  const val = (event.target as HTMLSelectElement).value;
  if (val === '') emit('update:isActive', '');
  else emit('update:isActive', val === 'true');
};

const onStockChange = (event: Event) => {
  const val = (event.target as HTMLSelectElement).value;
  emit('update:stockFilter', val as '' | 'low_stock' | 'out_of_stock');
};
</script>

<template>
  <div class="glass rounded-3xl p-5 shadow-sm">
    <div class="flex flex-wrap gap-3">

      <!-- ========================================== -->
      <!-- SEARCH                                     -->
      <!-- ========================================== -->
      <div class="flex-1 min-w-[220px] relative">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-disabled pointer-events-none"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          :value="search"
          @input="onSearchInput"
          placeholder="Search by SKU or name..."
          class="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <!-- ========================================== -->
      <!-- CATEGORY                                   -->
      <!-- ========================================== -->
      <div class="relative min-w-[180px]">
        <select
          :value="categoryValue"
          @change="onCategoryChange"
          class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
        >
          <option value="">All Categories</option>
          <option
            v-for="opt in categoryOptions"
            :key="opt.value"
            :value="String(opt.value)"
          >
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

      <!-- ========================================== -->
      <!-- STATUS                                     -->
      <!-- ========================================== -->
      <div class="relative min-w-[140px]">
        <select
          :value="statusValue"
          @change="onStatusChange"
          class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
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

      <!-- ========================================== -->
      <!-- STOCK FILTER                               -->
      <!-- ========================================== -->
      <div class="relative min-w-[180px]">
        <select
          :value="stockValue"
          @change="onStockChange"
          class="w-full pl-4 pr-10 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
        >
          <option value="">All Stock Levels</option>
          <option value="low_stock">Low Stock Only</option>
          <option value="out_of_stock">Out of Stock</option>
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

    </div>
  </div>
</template>