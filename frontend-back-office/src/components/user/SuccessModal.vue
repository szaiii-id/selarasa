<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  isOpen: boolean;
  title?: string;
  message?: string;
  pinCode?: string | null;
  username?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isCopied = ref(false);

// Reset state 'copied' jika modal dibuka ulang
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    isCopied.value = false;
  }
});

const showCopiedState = () => {
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 2000);
};

const copyToClipboard = async () => {
  if (!props.pinCode) return;
  
  // 1. Coba gunakan Modern Clipboard API (Jika HTTPS / localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(props.pinCode);
      showCopiedState();
      return; // Berhenti di sini jika sukses
    } catch (err) {
      console.warn('Modern Clipboard API gagal, beralih ke fallback...', err);
    }
  }
  
  // 2. Fallback Tradisional (Bekerja di HTTP dan IP Address lokal)
  try {
    // Buat elemen textarea transparan
    const textArea = document.createElement("textarea");
    textArea.value = props.pinCode;
    
    // Sembunyikan elemen jauh dari layar agar tidak merusak UI
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    
    // Pilih dan salin teksnya
    textArea.select();
    document.execCommand("copy");
    
    // Bersihkan elemen
    textArea.remove();
    
    showCopiedState();
  } catch (err) {
    console.error('Semua metode copy gagal: ', err);
    alert(`Browser Anda memblokir fitur copy. Silakan block dan copy manual: ${props.pinCode}`);
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <!-- Backdrop -->
      <div 
        v-if="isOpen" 
        class="fixed inset-0 bg-background/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 sm:p-6"
      >
        <Transition name="modal-bounce" appear>
          <!-- Panel Modal -->
          <div 
            v-if="isOpen"
            class="w-full max-w-sm bg-surface/90 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-3xl flex flex-col relative overflow-hidden text-center"
          >
            <!-- Dekorasi Latar Belakang Cahaya -->
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div class="p-8 flex flex-col items-center">
              
              <!-- Ikon Sukses -->
              <div class="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <svg class="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <!-- Teks Header -->
              <h2 class="text-2xl font-bold text-text-primary mb-2">{{ title || 'Success!' }}</h2>
              <p class="text-sm text-text-secondary mb-6">{{ message || 'Action completed successfully.' }}</p>

              <!-- Kotak Kredensial (Hanya muncul jika ada PIN) -->
              <div v-if="pinCode" class="w-full bg-black/20 border border-white/10 rounded-2xl p-5 mb-6 backdrop-blur-sm relative overflow-hidden">
                <!-- Aksen Garis Kiri -->
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                
                <p class="text-xs text-text-secondary uppercase tracking-widest font-bold mb-1">Generated PIN for @{{ username }}</p>
                <p class="text-4xl font-mono font-bold text-white tracking-widest mb-4">{{ pinCode }}</p>
                
                <button 
                  @click="copyToClipboard"
                  class="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  :class="isCopied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-text-primary border border-white/20 hover:bg-white/20'"
                >
                  <svg v-if="isCopied" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  <span>{{ isCopied ? 'Copied to Clipboard!' : 'Copy PIN Code' }}</span>
                </button>
              </div>

              <!-- Tombol Tutup -->
              <button 
                @click="$emit('close')"
                class="w-full px-5 py-3 rounded-xl bg-primary text-surface font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
              >
                Done
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Animasi memantul (bounce) kecil yang elegan */
.modal-bounce-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-bounce-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-bounce-enter-from {
  opacity: 0;
  transform: scale(0.85) translateY(20px);
}
.modal-bounce-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}
</style>