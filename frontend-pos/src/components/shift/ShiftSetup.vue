<script setup lang="ts">
import { useShiftStore } from '@/stores/shiftStore';
import type { StartShiftPayload } from '@/types/shift';
import { useCurrencyInput } from '@/composables/useCurrencyInput';

const props = defineProps<{
  form: StartShiftPayload;
}>();

const emit = defineEmits(['next']);
const shiftStore = useShiftStore();

const formattedOpeningBalance = useCurrencyInput(
  () => props.form.opening_balance,
  (val) => { props.form.opening_balance = val; }
);

const handleNext = () => {
  shiftStore.clearErrors();
  if (!props.form.shift_id) {
    shiftStore.errorMessage = "Please select a shift schedule.";
    return;
  }
  emit('next');
};
</script>

<template>
  <div class="w-full max-w-2xl space-y-8 animate-fade-in">
    
    <div class="w-full">
      <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider text-left">1. Select Active Shift</label>
      
      <div class="flex flex-wrap justify-center gap-4">
        <button
          v-for="shift in shiftStore.masterShifts"
          :key="shift.id"
          @click="props.form.shift_id = shift.id; shiftStore.clearErrors()"
          type="button"
          class="flex flex-col items-center justify-center px-8 py-5 min-w-[160px] rounded-3xl border-2 transition-all duration-200 text-center"
          :class="props.form.shift_id === shift.id 
            ? 'border-primary bg-primary/10 shadow-md scale-[1.03]' 
            : 'border-custom-border bg-surface hover:border-primary/40'"
        >
          <span class="text-lg font-bold text-text-primary mb-1.5" :class="{'text-primary': props.form.shift_id === shift.id}">
            {{ shift.name }}
          </span>
          <span class="text-sm font-medium text-text-secondary">
            {{ shift.start_time.substring(0, 5) }} &mdash; {{ shift.end_time.substring(0, 5) }}
          </span>
        </button>
      </div>
      
      <p v-if="shiftStore.validationErrors?.shift_id" class="mt-2 text-xs text-error font-medium text-center">
        {{ shiftStore.validationErrors.shift_id[0] }}
      </p>
    </div>

    <div>
      <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">2. Count Cash Drawer</label>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 flex items-center pl-6 text-text-secondary text-xl font-bold">Rp</span>
        <input 
          v-model="formattedOpeningBalance"
          @input="shiftStore.clearErrors()"
          type="text"
          inputmode="numeric"
          class="w-full pl-16 pr-6 py-5 rounded-3xl bg-surface border-2 border-custom-border focus:outline-none focus:border-primary text-text-primary transition-all text-2xl font-bold shadow-sm"
          placeholder="0"
        />
      </div>
      <p v-if="shiftStore.validationErrors?.opening_balance" class="mt-2 text-xs text-error font-medium">
        {{ shiftStore.validationErrors.opening_balance[0] }}
      </p>
    </div>

    <div>
      <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">3. Notes <span class="text-text-secondary font-medium lowercase">(Optional)</span></label>
      <textarea 
        v-model="props.form.notes"
        rows="2"
        class="w-full px-6 py-4 rounded-3xl bg-surface border-2 border-custom-border focus:outline-none focus:border-primary text-text-primary resize-none transition-all text-lg shadow-sm"
        placeholder="Any specific instructions or notes?"
      ></textarea>
    </div>

    <button 
      @click="handleNext"
      type="button"
      class="w-full mt-4 py-5 bg-primary text-white font-bold text-lg rounded-[2rem] hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-3 shadow-xl shadow-primary/30"
    >
      <span>Continue</span>
    </button>

  </div>
</template>