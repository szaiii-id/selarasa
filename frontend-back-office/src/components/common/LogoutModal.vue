<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  isLoading?: boolean;
}>();

const emit = defineEmits(['close', 'confirm']);
</script>

<template>
  <!-- Menggunakan Teleport agar modal dipasang di luar struktur tata letak (di tag <body>) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isOpen" class="fixed inset-0 z-[999] flex items-center justify-center px-4">
        
        <!-- Overlay: Background hitam transparan dengan efek blur kaca -->
        <div class="fixed inset-0 bg-black/20 backdrop-blur-sm" @click="emit('close')"></div>

        <!-- Konten Modal: Menggunakan gaya Glassmorphism -->
        <div class="relative w-full max-w-sm bg-surface/70 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.1)] rounded-3xl p-6 text-center transform transition-all">
          
          <!-- Ikon Peringatan / Logout -->
          <div class="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-4 border border-error/20">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>

          <h3 class="text-lg font-bold text-text-primary mb-2">Ready to Leave?</h3>
          <p class="text-sm text-text-secondary mb-6 leading-relaxed">
            Are you sure you want to logout from SelaRasa Backoffice? You will need to login again to access this system.
          </p>

          <!-- Aksi Tombol -->
          <div class="flex items-center gap-3 justify-center">
            <button 
              @click="emit('close')"
              :disabled="isLoading"
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-text-secondary bg-white/50 hover:bg-white/80 border border-white/60 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              @click="emit('confirm')"
              :disabled="isLoading"
              class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-error hover:bg-error/90 shadow-md transition-colors disabled:opacity-50"
            >
              <span v-if="isLoading">Logging out...</span>
              <span v-else>Yes, Logout</span>
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>