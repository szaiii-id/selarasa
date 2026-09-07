<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string; // Teks tombol bisa diubah (misal: "Delete", "Deactivate", "Approve")
  theme?: 'danger' | 'warning' | 'primary'; // Tema warna tombol dan ikon
  isLoading?: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();

// --- Computed properties untuk menyesuaikan warna berdasarkan tema ---
const themeClasses = computed(() => {
  switch (props.theme) {
    case 'primary':
      return {
        bgGlow: 'bg-primary/20',
        iconWrapper: 'bg-primary/20 border-primary/30 shadow-[0_0_30px_rgba(var(--color-primary),0.2)]',
        iconText: 'text-primary',
        button: 'bg-primary hover:bg-primary/90 shadow-primary/20 text-surface'
      };
    case 'warning':
      return {
        bgGlow: 'bg-yellow-500/20',
        iconWrapper: 'bg-yellow-500/20 border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.2)]',
        iconText: 'text-yellow-500',
        button: 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20 text-white'
      };
    case 'danger':
    default:
      return {
        bgGlow: 'bg-error/20',
        iconWrapper: 'bg-error/20 border-error/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]',
        iconText: 'text-error',
        button: 'bg-error hover:bg-error/90 shadow-error/20 text-white'
      };
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6">
        <Transition name="modal-bounce" appear>
          <div v-if="isOpen" class="w-full max-w-sm bg-surface/90 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl flex flex-col relative overflow-hidden text-center">
            
            <!-- Glow Latar Belakang Dinamis -->
            <div :class="['absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl pointer-events-none', themeClasses.bgGlow]"></div>

            <div class="p-8 flex flex-col items-center">
              
              <!-- Ikon Peringatan Dinamis -->
              <div :class="['w-20 h-20 border rounded-full flex items-center justify-center mb-6', themeClasses.iconWrapper]">
                <svg :class="['w-10 h-10', themeClasses.iconText]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <!-- Header & Pesan -->
              <h2 class="text-xl font-bold text-text-primary mb-2">{{ title }}</h2>
              <p class="text-sm text-text-secondary mb-8">{{ message }}</p>

              <!-- Tombol -->
              <div class="w-full flex gap-3">
                <button 
                  @click="$emit('close')"
                  :disabled="isLoading"
                  class="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-text-primary font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  @click="$emit('confirm')"
                  :disabled="isLoading"
                  :class="['flex-1 px-5 py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70', themeClasses.button]"
                >
                  <!-- Spinner -->
                  <svg v-if="isLoading" class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span v-else>{{ confirmText || 'Confirm' }}</span>
                </button>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transisi diletakkan di sini sama seperti sebelumnya */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.modal-bounce-enter-active { transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-bounce-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-bounce-enter-from { opacity: 0; transform: scale(0.85) translateY(20px); }
.modal-bounce-leave-to { opacity: 0; transform: scale(0.95) translateY(-10px); }
</style>