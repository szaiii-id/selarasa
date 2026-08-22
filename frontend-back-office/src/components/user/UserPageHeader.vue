<script setup lang="ts">
defineEmits<{
  (e: 'add'): void;
}>();
</script>

<template>
  <div class="bg-surface/40 backdrop-blur-xl border border-white/60 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold text-primary">User Management</h1>
      <p class="text-sm text-text-secondary mt-1">
        Manage access roles, add new users, or deactivate accounts.
      </p>
    </div>
    <button 
      @click="$emit('add')"
      class="px-5 py-2.5 bg-primary text-surface rounded-xl text-sm font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shrink-0"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      Add User
    </button>
  </div>
</template>