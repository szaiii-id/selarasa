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
  <div class="p-4 bg-white/20 border-t border-white/60 flex items-center justify-between text-xs text-text-secondary font-medium mt-auto">
    <p>Total: {{ total }} items</p>
    <div class="flex gap-1">
      <button 
        @click="$emit('prev')"
        :disabled="currentPage <= 1"
        class="px-3 py-1.5 rounded-lg border border-white/60 hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Prev
      </button>
      <button class="px-3 py-1.5 rounded-lg bg-primary text-surface font-bold">
        {{ currentPage }} <span class="font-normal opacity-80">/ {{ lastPage }}</span>
      </button>
      <button 
        @click="$emit('next')"
        :disabled="currentPage >= lastPage"
        class="px-3 py-1.5 rounded-lg border border-white/60 hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  </div>
</template>