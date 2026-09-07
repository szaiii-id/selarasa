<script setup lang="ts">
import { computed } from 'vue';
import { useShiftStore } from '@/stores/shiftStore';
import type { StartShiftPayload, CloseShiftPayload, HandoverShiftPayload } from '@/types/shift';
import { usePinKeyboard } from '@/composables/usePinKeyboard';

const props = defineProps<{
  form: StartShiftPayload | CloseShiftPayload | HandoverShiftPayload;
  isClosing?: boolean;
  isHandover?: boolean;
}>();

const emit = defineEmits(['back', 'submit']);
const shiftStore = useShiftStore();

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
};

const selectedShift = computed(() => {
  if (props.isClosing || props.isHandover) return null;
  return shiftStore.masterShifts.find(s => s.id === (props.form as StartShiftPayload).shift_id);
});

const displayBalance = computed(() => {
  if (props.isClosing) return (props.form as CloseShiftPayload).closing_balance;
  if (props.isHandover) return (props.form as HandoverShiftPayload).amount_counted;
  return (props.form as StartShiftPayload).opening_balance;
});

const balanceLabel = computed(() => {
  if (props.isClosing) return 'Closing Cash Balance';
  if (props.isHandover) return 'Counted Cash Amount';
  return 'Opening Balance';
});

const submitButtonText = computed(() => {
  if (shiftStore.isLoading) return 'Processing...';
  if (props.isClosing) return 'End Shift Now';
  if (props.isHandover) return 'Complete Handover';
  return 'Start Shift Now';
});

const appendPin = (num: number) => {
  if (props.form.pin_code.length < 6) {
    props.form.pin_code += num.toString();
    shiftStore.clearErrors();
  }
};

const deletePin = () => {
  props.form.pin_code = props.form.pin_code.slice(0, -1);
};

const clearPin = () => {
  props.form.pin_code = '';
};

const handleSubmit = () => {
  if (props.form.pin_code.length === 6 && !shiftStore.isLoading) {
    emit('submit');
  }
};

usePinKeyboard({
  onDigit: appendPin,
  onBackspace: deletePin,
  onClear: clearPin,
  onSubmit: handleSubmit,
  isDisabled: () => shiftStore.isLoading
});
</script>

<template>
  <div class="w-full max-w-[420px] flex flex-col items-center animate-fade-in-up">
    
    <div class="w-full flex items-center justify-between mb-6">
      <button 
        @click="$emit('back')" 
        type="button"
        class="flex items-center gap-2 px-4 py-2 rounded-2xl bg-surface border border-custom-border hover:bg-background text-text-primary text-sm font-semibold transition-all cursor-pointer shadow-sm"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </button>

      <div class="text-right" v-if="!isClosing && !isHandover">
        <p class="text-xs font-bold text-text-secondary uppercase tracking-wider">Selected Shift</p>
        <p class="text-sm font-bold text-text-primary">{{ selectedShift?.name }}</p>
      </div>
    </div>

    <div class="w-full bg-surface border border-custom-border rounded-3xl p-4 mb-8 text-center shadow-sm">
      <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
        {{ balanceLabel }}
      </p>
      <p class="text-xl font-extrabold text-primary">{{ formatCurrency(displayBalance) }}</p>
    </div>

    <div class="flex items-center justify-center gap-5 mb-10">
      <div 
        v-for="i in 6" 
        :key="i"
        class="w-5 h-5 rounded-full transition-all duration-300 border-2"
        :class="i <= props.form.pin_code.length ? 'bg-primary border-primary scale-125 shadow-md shadow-primary/30' : 'bg-surface border-custom-border'"
      ></div>
    </div>

    <div class="grid grid-cols-3 gap-4 w-full">
      <button 
        v-for="num in 9" 
        :key="num"
        @click="appendPin(num)"
        type="button"
        class="h-20 rounded-[2rem] bg-surface border border-custom-border hover:bg-primary/5 hover:border-primary/30 active:bg-primary/10 text-3xl font-bold text-text-primary transition-all flex items-center justify-center shadow-sm cursor-pointer"
      >
        {{ num }}
      </button>
      
      <button 
        @click="clearPin"
        type="button"
        class="h-20 rounded-[2rem] bg-error/5 hover:bg-error/10 active:bg-error/20 text-error font-bold text-lg transition-all flex items-center justify-center cursor-pointer"
      >
        CLEAR
      </button>
      
      <button 
        @click="appendPin(0)"
        type="button"
        class="h-20 rounded-[2rem] bg-surface border border-custom-border hover:bg-primary/5 hover:border-primary/30 active:bg-primary/10 text-3xl font-bold text-text-primary transition-all flex items-center justify-center shadow-sm cursor-pointer"
      >
        0
      </button>
      
      <button 
        @click="deletePin"
        type="button"
        class="h-20 rounded-[2rem] bg-surface border border-custom-border hover:bg-surface active:bg-custom-border text-text-secondary hover:text-text-primary transition-all flex items-center justify-center shadow-sm cursor-pointer"
      >
        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
        </svg>
      </button>
    </div>

    <button 
      @click="handleSubmit"
      type="button"
      :disabled="props.form.pin_code.length !== 6 || shiftStore.isLoading"
      class="w-full mt-10 py-5 bg-primary text-white font-bold text-lg rounded-[2rem] hover:bg-primary/90 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-3 shadow-xl shadow-primary/30 cursor-pointer"
    >
      <svg v-if="shiftStore.isLoading" class="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{{ submitButtonText }}</span>
    </button>

  </div>
</template>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.3s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>