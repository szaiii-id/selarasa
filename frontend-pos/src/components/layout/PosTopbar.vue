<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useIdleTimeout } from '@/composables/useIdleTimeout';
import CloseShiftModal from '@/components/shift/CloseShift.vue';
import HandoverShiftModal from '@/components/shift/HandoverShift.vue';
import LockScreen from '@/components/common/LockScreen.vue';
import BrandLogo from '@/components/common/BrandLogo.vue';

const authStore = useAuthStore();
const shiftStore = useShiftStore();
const sessionStore = useSessionStore();

// Modal State
const isCloseShiftModalOpen = ref<boolean>(false);
const isHandoverModalOpen = ref<boolean>(false);

// Auto-lock if idle for 3 minutes
useIdleTimeout(3, () => {
  sessionStore.lockScreen();
});

onMounted(async () => {
  if (shiftStore.masterShifts.length === 0) {
    await shiftStore.fetchMasterShifts();
  }
  await shiftStore.fetchCurrentShift();
});

// ==========================================
// AUTO-TRIGGER END SHIFT MODAL
// ==========================================
// Automatically monitor if shift time is over and the grace period transaction has been used.
watch(
  () => [shiftStore.shiftStatus, shiftStore.hasUsedGracePeriod, shiftStore.isFinishingOvertimeTransaction],
  ([status, usedGrace, isFinishing]) => {
    // If overtime, grace period is used, and not currently finishing the last transaction
    if (status === 'overtime' && usedGrace && !isFinishing) {
      isCloseShiftModalOpen.value = true; // FORCE OPEN MODAL!
    }
  },
  { immediate: true } // immediate: true ensures this is checked on page refresh as well
);

// Actions after modal success
const handleShiftClosedSuccessfully = async () => {
  await authStore.logout();
};

const handleHandoverSuccessfully = async () => {
  isHandoverModalOpen.value = false;
  sessionStore.clearRateLimit();
  sessionStore.isLocked = false;
  await authStore.logout();
};

const handleHandoverFromLockScreen = () => {
  isHandoverModalOpen.value = true;
};
</script>

<template>
  <!-- Topbar wrapper with Glassmorphism effect -->
  <header class="w-full h-full min-h-[80px] bg-surface/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-3xl flex items-center justify-between px-4 lg:px-6 gap-3">
    
    <!-- ============================================ -->
    <!-- LEFT: BrandLogo + Shift Info                 -->
    <!-- ============================================ -->
    <div class="flex items-center gap-3 lg:gap-5 min-w-0">
      
      <!-- BrandLogo - Implementation like in StartShift -->
      <div class="flex items-center shrink-0">
        <BrandLogo class="h-12 w-auto lg:h-14" />
      </div>
      
      <!-- Divider -->
      <div class="hidden sm:block w-px h-10 bg-custom-border/50 shrink-0"></div>
      
      <!-- Shift Info (Like in Dashboard) -->
      <div class="hidden md:flex items-center gap-2 lg:gap-3 shrink-0">
        
        <!-- Shift Status -->
        <div class="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-full border bg-white/50 backdrop-blur-sm shadow-sm">
          <span 
            class="w-2.5 h-2.5 rounded-full pulse-dot" 
            :class="shiftStore.shiftStatus === 'overtime' ? 'bg-error' : 'bg-success'"
          ></span>
          <span 
            class="text-xs lg:text-sm font-bold tracking-wider uppercase" 
            :class="shiftStore.shiftStatus === 'overtime' ? 'text-error' : 'text-success'"
          >
            {{ shiftStore.currentShift?.status || 'Active' }}
          </span>
        </div>
        
        <!-- Shift Schedule (Shift Name + Start - End Time) -->
        <div class="hidden lg:flex items-center gap-2 px-4 py-2 rounded-full border bg-white/50 backdrop-blur-sm shadow-sm">
          <svg class="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-sm font-bold text-text-primary">
            {{ shiftStore.activeMasterShift?.name || 'N/A' }}
          </span>
          <span class="text-xs font-semibold text-text-secondary">
            {{ shiftStore.activeMasterShift?.start_time?.substring(0, 5) }} - {{ shiftStore.activeMasterShift?.end_time?.substring(0, 5) }}
          </span>
        </div>
        
        <!-- Time Remaining (Remaining Shift Time) -->
        <div class="hidden xl:flex items-center gap-2 px-4 py-2 rounded-full border bg-white/50 backdrop-blur-sm shadow-sm">
          <svg class="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span 
            class="text-sm font-bold"
            :class="{
              'text-success': shiftStore.shiftStatus === 'safe',
              'text-warning animate-pulse': shiftStore.shiftStatus === 'warning' || shiftStore.shiftStatus === 'grace_period',
              'text-error': shiftStore.shiftStatus === 'overtime'
            }"
          >
            {{ shiftStore.timeRemainingText }}
          </span>
          <span class="text-xs font-semibold text-text-secondary">
            Ends at {{ shiftStore.activeMasterShift?.end_time?.substring(0, 5) }}
          </span>
        </div>
      </div>
    </div>

    <!-- ============================================ -->
    <!-- RIGHT: Action Buttons                        -->
    <!-- ============================================ -->
    <div class="flex items-center gap-2 lg:gap-3 shrink-0">

      <!-- Lock Screen Button -->
      <button 
        @click="sessionStore.lockScreen()" 
        class="flex items-center gap-2 px-3 lg:px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/80 hover:bg-white text-text-secondary hover:text-primary transition-all cursor-pointer shadow-sm" 
        title="Lock Screen"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span class="hidden sm:inline text-sm font-bold">Lock Screen</span>
      </button>

      <!-- Handover Button -->
      <button 
        @click="isHandoverModalOpen = true" 
        :disabled="shiftStore.shiftStatus === 'overtime'" 
        class="flex items-center gap-2 px-3 lg:px-4 py-3 rounded-2xl bg-info/10 border border-info/20 text-info hover:bg-info hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        title="Handover Shift"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        <span class="hidden sm:inline text-sm font-bold">Handover</span>
      </button>

      <!-- End Shift Button -->
      <button 
        @click="isCloseShiftModalOpen = true" 
        class="px-4 lg:px-5 py-3 bg-warning/80 border border-warning backdrop-blur-md text-surface font-semibold shadow-sm hover:bg-warning transition-all flex items-center gap-2 cursor-pointer rounded-2xl"
      >
        <svg class="w-5 h-5 text-surface" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span class="hidden sm:inline text-sm font-bold">End Shift</span>
      </button>

    </div>

    <!-- ============================================ -->
    <!-- GLOBAL MODALS                               -->
    <!-- ============================================ -->
    <CloseShiftModal 
      :is-open="isCloseShiftModalOpen" 
      @close="isCloseShiftModalOpen = false"
      @success="handleShiftClosedSuccessfully"
    />
    
    <HandoverShiftModal 
      :is-open="isHandoverModalOpen" 
      @close="isHandoverModalOpen = false"
      @success="handleHandoverSuccessfully"
    />
    
    <LockScreen @trigger-handover="handleHandoverFromLockScreen" />

  </header>
</template>

<style scoped>
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
.pulse-dot {
  animation: pulse-dot 2s infinite ease-in-out;
}
</style>