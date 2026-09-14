<script setup lang="ts">
defineProps<{
  currentPage: number;
  lastPage: number;
  total: number;
}>();

defineEmits<{
  (e: 'prev'): void;
  (e: 'next'): void;
}>();
</script>

<template>
  <div
    class="p-4 bg-white/20 border-t border-white/60 flex items-center justify-between text-xs text-text-secondary font-medium mt-auto"
  >
    <!-- Total Info -->
    <p>
      Total: <strong class="text-text-primary">{{ total }}</strong> movements
    </p>

    <!-- Pagination Controls -->
    <div class="flex gap-1 items-center">
      <!-- Prev Button -->
      <button
        @click="$emit('prev')"
        :disabled="currentPage <= 1"
        class="px-3 py-1.5 rounded-lg border border-white/60 hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>

      <!-- Current Page Indicator -->
      <button
        class="px-3 py-1.5 rounded-lg bg-primary text-surface font-bold min-w-[40px]"
      >
        {{ currentPage }} <span class="font-normal opacity-80">/ {{ lastPage }}</span>
      </button>

      <!-- Next Button -->
      <button
        @click="$emit('next')"
        :disabled="currentPage >= lastPage"
        class="px-3 py-1.5 rounded-lg border border-white/60 hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
      >
        Next
        <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>