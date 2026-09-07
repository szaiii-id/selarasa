<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import type { StartShiftPayload } from '@/types/shift';
import BrandLogo from '@/components/common/BrandLogo.vue';
import ShiftSetup from '@/components/shift/ShiftSetup.vue';
import ShiftPin from '@/components/shift/ShiftPin.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import AlertBanner from '@/components/common/AlertBanner.vue';

const router = useRouter();
const shiftStore = useShiftStore();
const authStore = useAuthStore();

const currentStep = ref<1 | 2>(1);
const isLogoutModalOpen = ref<boolean>(false);

const form = ref<StartShiftPayload>({
  shift_id: 0,
  opening_balance: 0,
  pin_code: '',
  notes: ''
});

onMounted(async () => {
  await shiftStore.fetchCurrentShift();
  
  if (shiftStore.currentShift) {
    router.push({ name: 'Home' }); 
    return;
  }

  await shiftStore.fetchMasterShifts();
  
  if (shiftStore.masterShifts.length > 0) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;

    const matchedShift = shiftStore.masterShifts.find(shift => {
      const start = shift.start_time;
      const end = shift.end_time;
      
      return start <= end 
        ? (currentTime >= start && currentTime < end) 
        : (currentTime >= start || currentTime < end);
    });

    form.value.shift_id = matchedShift?.id || shiftStore.masterShifts[0]?.id || 0;
  }
});

const submitShift = async () => {
  if (form.value.pin_code.length !== 6) return;
  
  const success = await shiftStore.startShift(form.value);
  
  if (success) {
    router.push({ name: 'Home' }); 
  } else {
    form.value.pin_code = '';
  }
};

const handleLogout = async () => {
  await authStore.logout();
};
</script>

<template>
  <div class="relative min-h-screen w-full bg-background flex flex-col">
    
    <div class="absolute top-6 right-6 z-10 animate-fade-in">
      <button 
        @click="isLogoutModalOpen = true"
        :disabled="authStore.isLoading"
        class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-error bg-surface hover:bg-error/10 border border-custom-border hover:border-error/30 rounded-xl transition-all shadow-sm disabled:opacity-50 cursor-pointer"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Switch Account</span>
      </button>
    </div>

    <div v-if="shiftStore.isCheckingSession || shiftStore.isLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div class="flex flex-col items-center space-y-4">
        <div class="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p class="text-text-secondary text-lg font-medium tracking-wide">Authenticating System...</p>
      </div>
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto py-10 w-full">
      
      <div class="text-center mb-10 flex flex-col items-center animate-fade-in-down">
        <BrandLogo class="mb-6 transform scale-125" />
        <h1 class="text-3xl font-extrabold text-text-primary tracking-tight">Start Shift</h1>
        <p class="text-lg text-text-secondary mt-2">
          {{ currentStep === 1 ? 'Set up your cash drawer to begin' : 'Verify your shift details' }}
        </p>
      </div>

      <AlertBanner 
        v-if="shiftStore.errorMessage" 
        :message="shiftStore.errorMessage" 
        type="error" 
      />

      <ShiftSetup 
        v-if="currentStep === 1" 
        :form="form" 
        @next="currentStep = 2; form.pin_code = ''" 
      />
      
      <ShiftPin 
        v-else-if="currentStep === 2" 
        :form="form" 
        @back="currentStep = 1; shiftStore.clearErrors()" 
        @submit="submitShift" 
      />

    </div>

    <ConfirmModal 
      :is-loading="authStore.isLoading" 
      :is-open="isLogoutModalOpen" 
      @close="isLogoutModalOpen = false" 
      @confirm="handleLogout" 
      confirm-text="Yes, Sign Out" 
      message="Are you sure you want to sign out and switch to another account?" 
      theme="danger" 
      title="Switch Account?"
    />

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
.animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
</style>