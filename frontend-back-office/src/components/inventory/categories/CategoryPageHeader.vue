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
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Raw Material Categories
      </h1>
      <p class="text-text-secondary text-sm mt-1">
        Group raw materials to keep your warehouse organized and easy to browse
      </p>
    </div>
    <button
      @click="$emit('add')"
      aria-label="Add new category"
      class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition flex items-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add Category
    </button>
  </div>
</template>