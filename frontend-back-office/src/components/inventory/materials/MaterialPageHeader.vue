<script setup lang="ts">
defineProps<{
  lowStockCount: number;
}>();

defineEmits<{
  (e: 'add'): void;
}>();
</script>

<template>
  <div class="flex items-start justify-between flex-wrap gap-4">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight flex items-center gap-2">
        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        Raw Materials
      </h1>
      <p class="text-text-secondary text-sm mt-1">
        Master data of warehouse raw materials — stock <strong>cannot</strong> be changed from this page
      </p>
    </div>

    <div class="flex gap-2 flex-wrap">
      <!-- Low Stock Indicator (info badge only, not clickable) -->
      <div
        v-if="lowStockCount > 0"
        class="px-4 py-2.5 rounded-xl bg-warning/15 text-warning border border-warning/30 text-sm font-bold flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>{{ lowStockCount }} Low Stock</span>
      </div>

      <!-- Add Button -->
      <button
        type="button"
        @click="$emit('add')"
        class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Material
      </button>
    </div>
  </div>
</template>