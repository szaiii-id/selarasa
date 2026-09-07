<script setup lang="ts">
defineProps<{
  message: string;
  type?: 'error' | 'warning' | 'success';
}>();
</script>

<template>
  <div 
    class="w-full max-w-xl mb-6 p-4 rounded-2xl flex items-center gap-3 animate-fade-in"
    :class="{
      'bg-error/10 border border-error/20 text-error': type === 'error' || !type,
      'bg-warning/10 border border-warning/20 text-warning': type === 'warning',
      'bg-green-50 border border-green-200 text-green-700': type === 'success'
    }"
  >
    <svg v-if="type === 'error' || !type" class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    
    <p class="text-sm font-semibold">{{ message }}</p>
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>