<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm"
      @mousedown.self="$emit('close')"
    >
      <div class="bg-surface w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col p-6 items-center text-center">
        
        <!-- Success Icon -->
        <div class="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-5 border-4 border-success/20">
          <svg class="w-10 h-10 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Text Content -->
        <h3 class="text-2xl font-bold text-text-primary mb-2">
          {{ title }}
        </h3>
        <p class="text-text-secondary text-sm font-medium mb-6 leading-relaxed">
          {{ message }}
        </p>

        <!-- Button -->
        <button 
          @click="$emit('close')"
          class="w-full py-3 px-6 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-md shadow-primary/20"
        >
          Got it, thanks!
        </button>

      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-surface,
.modal-leave-to .bg-surface {
  transform: scale(0.9) translateY(10px);
}
</style>