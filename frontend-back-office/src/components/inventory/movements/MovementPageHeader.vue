<script setup lang="ts">
defineEmits<{
  (e: 'add'): void;
}>();
</script>

<template>
  <div class="flex items-start justify-between flex-wrap gap-4">
    <div>
      <h1 class="text-2xl font-extrabold tracking-tight flex items-center gap-2">
        <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Stock Movements
      </h1>
      <p class="text-text-secondary text-sm mt-1">
        Complete audit trail — every material in and out is permanently recorded
      </p>
    </div>

    <button
      @click="$emit('add')"
      class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Record Movement
    </button>
  </div>
</template>