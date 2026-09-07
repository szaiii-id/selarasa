<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import type { HandoverShiftPayload } from '@/types/shift';
import ShiftPin from '@/components/shift/ShiftPin.vue';
import AlertBanner from '@/components/common/AlertBanner.vue';
import { useCurrencyInput } from '@/composables/useCurrencyInput';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits(['close', 'success']);
const shiftStore = useShiftStore();
const authStore = useAuthStore();

const currentStep = ref<1 | 2>(1);
const isLoadingCashiers = ref<boolean>(false);

const form = ref<HandoverShiftPayload>({
  to_user_id: '',
  to_user_pin: '',
  pin_code: '',
  amount_counted: 0,
  notes: ''
});

const availableCashiers = computed(() => {
  const activeShiftUserId = shiftStore.currentShift?.user_id 
    ? String(shiftStore.currentShift.user_id).trim() 
    : null;

  return shiftStore.activeCashiers.filter(user => {
    const userId = user.id ? String(user.id).trim() : '';
    return userId !== activeShiftUserId;
  });
});

watch(() => props.isOpen, async (newValue) => {
  if (newValue && shiftStore.activeCashiers.length === 0) {
    isLoadingCashiers.value = true;
    await shiftStore.fetchActiveCashiers();
    isLoadingCashiers.value = false;
  }
});

const formattedAmountCounted = useCurrencyInput(
  () => form.value.amount_counted,
  (val) => { form.value.amount_counted = val; }
);

const closeModal = () => {
  shiftStore.clearErrors();
  currentStep.value = 1;
  form.value = {
    to_user_id: '',
    to_user_pin: '',
    pin_code: '',
    amount_counted: 0,
    notes: ''
  };
  emit('close');
};

const goToStep2 = () => {
  shiftStore.clearErrors();
  if (!form.value.to_user_id) {
    shiftStore.errorMessage = "Please select a receiver cashier from the list.";
    return;
  }
  if (!form.value.to_user_pin || form.value.to_user_pin.length !== 6) {
    shiftStore.errorMessage = "Please enter the receiver PIN code (6 digits).";
    return;
  }
  if (!form.value.amount_counted || form.value.amount_counted <= 0) {
    shiftStore.errorMessage = "Please enter the counted cash amount.";
    return;
  }
  currentStep.value = 2;
  form.value.pin_code = '';
};

const handleHandoverShift = async () => {
  if (form.value.pin_code.length !== 6) {
    shiftStore.errorMessage = "PIN must be 6 digits.";
    return;
  }

  const success = await shiftStore.handoverShift(form.value);
  if (success) {
    closeModal();
    emit('success');
  } else {
    form.value.pin_code = '';
  }
};
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background px-6 overflow-y-auto py-10 min-h-screen w-full">
      
      <div class="absolute top-6 right-6 z-10 animate-fade-in">
        <button 
          @click="closeModal"
          class="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-error bg-surface hover:bg-error/10 border border-custom-border hover:border-error/30 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Cancel</span>
        </button>
      </div>

      <div class="text-center mb-10 flex flex-col items-center animate-fade-in-down">
        <h1 class="text-3xl font-extrabold text-text-primary tracking-tight">Shift Handover</h1>
        <p class="text-lg text-text-secondary mt-2">
          {{ currentStep === 1 ? 'Transfer active register to another cashier' : 'Verify your authorization' }}
        </p>
      </div>

      <AlertBanner 
        v-if="shiftStore.errorMessage" 
        :message="shiftStore.errorMessage" 
        type="error" 
      />

      <div v-if="currentStep === 1" class="w-full max-w-2xl space-y-8 animate-fade-in">
        <div>
          <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">
            Receiver Cashier <span v-if="isLoadingCashiers" class="text-xs text-text-secondary font-normal">(Loading...)</span>
          </label>
          <div class="relative">
            <select 
              v-model="form.to_user_id"
              @change="shiftStore.clearErrors()"
              class="w-full px-6 py-5 rounded-3xl bg-surface border-2 border-custom-border focus:outline-none focus:border-primary text-text-primary transition-all text-xl font-medium shadow-sm appearance-none cursor-pointer"
            >
              <option value="" disabled>-- Select receiver cashier --</option>
              <option v-for="user in availableCashiers" :key="user.id" :value="user.id">
                {{ user.name }} (@{{ user.username }})
              </option>
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none text-text-secondary">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <p v-if="shiftStore.validationErrors?.to_user_id" class="mt-2 text-xs text-error font-medium">
            {{ shiftStore.validationErrors.to_user_id[0] }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Receiver PIN Code</label>
          <input 
            v-model="form.to_user_pin"
            @input="shiftStore.clearErrors()"
            type="password"
            inputmode="numeric"
            maxlength="6"
            class="w-full px-6 py-5 rounded-3xl bg-surface border-2 border-custom-border focus:outline-none focus:border-primary text-text-primary transition-all text-xl font-bold tracking-[0.5em] shadow-sm text-center"
            placeholder="••••••"
          />
          <p v-if="shiftStore.validationErrors?.to_user_pin" class="mt-2 text-xs text-error font-medium">
            {{ shiftStore.validationErrors.to_user_pin[0] }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Counted Cash Amount</label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 flex items-center pl-6 text-text-secondary text-xl font-bold">Rp</span>
            <input 
              v-model="formattedAmountCounted"
              @input="shiftStore.clearErrors()"
              type="text"
              inputmode="numeric"
              class="w-full pl-16 pr-6 py-5 rounded-3xl bg-surface border-2 border-custom-border focus:outline-none focus:border-primary text-text-primary transition-all text-2xl font-bold shadow-sm"
              placeholder="0"
            />
          </div>
          <p v-if="shiftStore.validationErrors?.amount_counted" class="mt-2 text-xs text-error font-medium">
            {{ shiftStore.validationErrors.amount_counted[0] }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-text-primary mb-3 uppercase tracking-wider">Notes <span class="text-text-secondary font-medium lowercase">(Optional)</span></label>
          <textarea 
            v-model="form.notes"
            rows="2"
            class="w-full px-6 py-4 rounded-3xl bg-surface border-2 border-custom-border focus:outline-none focus:border-primary text-text-primary resize-none transition-all text-lg shadow-sm"
            placeholder="Handover notes..."
          ></textarea>
        </div>

        <button 
          @click="goToStep2"
          type="button"
          class="w-full mt-4 py-5 bg-primary text-white font-bold text-lg rounded-[2rem] hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 flex justify-center items-center gap-3 shadow-xl shadow-primary/30 cursor-pointer"
        >
          <span>Continue to Verification</span>
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>

      <ShiftPin 
        v-else-if="currentStep === 2" 
        :form="form"
        :isHandover="true"
        @back="currentStep = 1; form.pin_code = ''; shiftStore.clearErrors()" 
        @submit="handleHandoverShift" 
      />

    </div>
  </Teleport>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
.animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
</style>