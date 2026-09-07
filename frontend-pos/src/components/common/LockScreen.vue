<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import BrandLogo from '@/components/common/BrandLogo.vue';

const sessionStore = useSessionStore();
const authStore = useAuthStore();

const pin = ref<string>('');
const isShaking = ref<boolean>(false);

const cashierName = computed(() => authStore.user?.name || 'Cashier');
const cashierInitials = computed(() => {
  if (!authStore.user?.name) return 'CS';
  return authStore.user.name.substring(0, 2).toUpperCase();
});

const isInputDisabled = computed(() => {
  return sessionStore.isUnlocking || sessionStore.isRateLimited;
});

const emit = defineEmits<{
  (e: 'trigger-handover'): void;
}>();

const handleInput = (num: number): void => {
  if (pin.value.length < 6 && !isInputDisabled.value) {
    pin.value += num.toString();
    if (!sessionStore.isRateLimited) {
      sessionStore.unlockError = false;
    }
  }
};

const handleDelete = (): void => {
  if (pin.value.length > 0 && !isInputDisabled.value) {
    pin.value = pin.value.slice(0, -1);
  }
};

const handleClear = (): void => {
  if (!isInputDisabled.value) {
    pin.value = '';
    sessionStore.unlockError = false;
  }
};

const triggerErrorAnimation = (): void => {
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
    pin.value = '';
  }, 500);
};

const handleHandover = (): void => {
  // Hanya blokir saat unlocking, BUKAN saat rate limited
  if (!sessionStore.isUnlocking) {
    emit('trigger-handover');
  }
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (!sessionStore.isLocked) return;

  if (sessionStore.isRateLimited) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (isInputDisabled.value) {
    event.preventDefault();
    return;
  }

  if (event.key >= '0' && event.key <= '9') {
    handleInput(parseInt(event.key, 10));
    event.preventDefault();
  } else if (event.key === 'Backspace') {
    handleDelete();
    event.preventDefault();
  } else if (event.key === 'Escape') {
    handleClear();
    event.preventDefault();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, true);
});

watch(pin, async (newPin) => {
  if (newPin.length === 6 && !isInputDisabled.value) {
    const success = await sessionStore.unlockScreen(newPin);
    if (!success) {
      triggerErrorAnimation();
    } else {
      pin.value = '';
    }
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="sessionStore.isLocked" 
        class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4"
      >
        <div class="w-full max-w-[420px] flex flex-col items-center animate-fade-in-up bg-background p-8 rounded-[3rem] shadow-2xl border border-custom-border relative">
          
          <div class="mb-6 flex justify-center items-center z-10">
            <BrandLogo /> 
          </div>

          <div class="w-full bg-surface border border-custom-border rounded-2xl p-4 mb-8 flex items-center gap-4 text-left shadow-sm z-10 relative">
            <div class="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/30">
              <span class="text-lg font-bold text-white">{{ cashierInitials }}</span>
            </div>
            <div>
              <p class="text-[11px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">
                Session Locked
              </p>
              <p class="text-base font-extrabold text-text-primary">{{ cashierName }}</p>
            </div>
          </div>

          <div 
            class="flex items-center justify-center gap-5 mb-6 h-6 z-10 relative"
            :class="{ 'animate-shake': isShaking }"
          >
            <div 
              v-for="i in 6" 
              :key="i"
              class="w-5 h-5 rounded-full transition-all duration-300 border-2"
              :class="i <= pin.length ? 'bg-primary border-primary scale-125 shadow-md shadow-primary/30' : 'bg-surface border-custom-border'"
            ></div>
          </div>

          <!-- ✅ Text error tetap terlihat jelas -->
          <p v-if="sessionStore.unlockError" class="text-error font-semibold mb-6 text-sm h-5 w-full text-center px-2 z-10 relative transition-all">
            {{ sessionStore.unlockErrorMessage || 'Incorrect PIN. Please try again.' }}
          </p>
          <p v-else class="h-5 mb-6 w-full"></p> 

          <!-- ✅ Container input PIN dengan overlay khusus -->
          <div class="relative w-full z-10">
            <!-- Overlay hanya menutupi area input PIN -->
            <div 
              v-if="sessionStore.isRateLimited" 
              class="absolute inset-0 z-20 bg-background/40 rounded-[2rem] backdrop-blur-[2px] cursor-not-allowed"
              @click.stop
              @mousedown.stop
              @touchstart.stop
            ></div>

            <div 
              class="grid grid-cols-3 gap-4 w-full relative"
              :class="{ 'pointer-events-none opacity-50': sessionStore.isRateLimited }"
            >
              <button 
                v-for="num in 9" 
                :key="num"
                @click="handleInput(num)"
                :disabled="isInputDisabled"
                type="button"
                class="h-20 rounded-[2rem] bg-surface border border-custom-border hover:bg-primary/5 hover:border-primary/30 active:bg-primary/10 text-3xl font-bold text-text-primary transition-all flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {{ num }}
              </button>
              
              <button 
                @click="handleClear"
                :disabled="isInputDisabled"
                type="button"
                class="h-20 rounded-[2rem] bg-error/5 hover:bg-error/10 active:bg-error/20 text-error font-bold text-lg transition-all flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                CLEAR
              </button>
              
              <button 
                @click="handleInput(0)"
                :disabled="isInputDisabled"
                type="button"
                class="h-20 rounded-[2rem] bg-surface border border-custom-border hover:bg-primary/5 hover:border-primary/30 active:bg-primary/10 text-3xl font-bold text-text-primary transition-all flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                0
              </button>
              
              <button 
                @click="handleDelete"
                :disabled="isInputDisabled"
                type="button"
                class="h-20 rounded-[2rem] bg-surface border border-custom-border hover:bg-surface active:bg-custom-border text-text-secondary hover:text-text-primary transition-all flex items-center justify-center shadow-sm cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- ✅ Tombol Handover TIDAK tertutup overlay, tetap aktif dan jelas -->
          <button 
            @click="handleHandover"
            :disabled="sessionStore.isUnlocking"
            type="button"
            class="w-full mt-8 py-4 bg-surface border border-custom-border text-text-secondary font-bold text-sm rounded-[2rem] hover:bg-background hover:text-text-primary active:scale-[0.98] transition-all duration-300 flex justify-center items-center gap-2 cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed z-10 relative"
          >
            <svg class="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Cashier Unavailable? Handover Shift</span>
          </button>

        </div>
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

.animate-fade-in-up {
  animation: fadeInUp 0.4s ease-out forwards;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.animate-shake {
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translate3d(-2px, 0, 0); }
  20%, 80% { transform: translate3d(4px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
  40%, 60% { transform: translate3d(6px, 0, 0); }
}
</style>