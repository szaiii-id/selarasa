<script setup lang="ts">
import { ref, watch } from 'vue';
import type { CashierShift } from '@/types/shift';
import { useDateFormat } from '@/composables/useDateFormat';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';
import { useUserInitials } from '@/composables/useUserInitials';

const { formatDateTime } = useDateFormat();
const { formatCurrency } = useCurrencyFormat();
const { getInitials } = useUserInitials();

const props = defineProps<{
  isOpen: boolean;
  isLoading: boolean;
  shift: CashierShift | null;
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: { expected_balance: number; closing_balance?: number; notes: string }): void;
}>();

const formData = ref({
  expected_balance: 0,
  closing_balance: 0,
  notes: ''
});

watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal && props.shift) {
      formData.value = {
        expected_balance: props.shift.expected_balance || 0,
        closing_balance: props.shift.expected_balance || 0,
        notes: ''
      };
    }
  }
);

const handleSubmit = () => {
  emit('submit', {
    expected_balance: formData.value.expected_balance,
    closing_balance: formData.value.closing_balance,
    notes: formData.value.notes
  });
};
</script>

<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm"
      @mousedown.self="$emit('close')"
    >
      <div class="bg-surface w-full max-w-md rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-custom-border flex justify-between items-center bg-error/5">
          <div>
            <h3 class="text-xl font-bold text-text-primary">Force Close Shift</h3>
            <p class="text-xs text-error font-medium mt-1">This action will close the shift immediately</p>
          </div>
          <button 
            @click="$emit('close')" 
            class="text-text-secondary hover:text-text-primary hover:bg-custom-border/50 p-2 rounded-full transition-colors"
            :disabled="isLoading"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto">
          <!-- Shift Info Summary -->
          <div v-if="shift" class="mb-5 p-4 bg-background rounded-xl border border-custom-border">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span class="text-sm font-bold text-primary">
                  {{ getInitials(shift.user?.name) }}
                </span>
              </div>
              <div>
                <p class="font-medium text-text-primary">{{ shift.user?.name || 'Unknown' }}</p>
                <p class="text-xs text-text-secondary">{{ shift.shift?.name || '-' }} • Started {{ formatDateTime(shift.started_at) }}</p>
              </div>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-text-secondary">Opening Balance:</span>
              <span class="font-semibold text-text-primary">
                {{ formatCurrency(shift.opening_balance) }}
              </span>
            </div>
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-5">
            
            <!-- Expected Balance -->
            <div>
              <label class="block text-sm font-semibold text-text-primary mb-1.5">
                Expected Balance <span class="text-error">*</span>
              </label>
              <input 
                v-model.number="formData.expected_balance" 
                type="number" 
                step="0.01"
                min="0"
                placeholder="0"
                class="w-full px-4 py-2.5 bg-background border rounded-xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                :class="errors.expected_balance ? 'border-error focus:border-error' : 'border-custom-border focus:border-primary'"
                :disabled="isLoading"
                required
              />
              <p v-if="errors.expected_balance" class="mt-1.5 text-sm text-error font-medium">
                {{ errors.expected_balance[0] }}
              </p>
            </div>

            <!-- Closing Balance (Optional) -->
            <div>
              <label class="block text-sm font-semibold text-text-primary mb-1.5">
                Closing Balance <span class="text-text-secondary">(optional)</span>
              </label>
              <input 
                v-model.number="formData.closing_balance" 
                type="number" 
                step="0.01"
                min="0"
                placeholder="Leave empty to use expected balance"
                class="w-full px-4 py-2.5 bg-background border rounded-xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                :class="errors.closing_balance ? 'border-error focus:border-error' : 'border-custom-border focus:border-primary'"
                :disabled="isLoading"
              />
              <p v-if="errors.closing_balance" class="mt-1.5 text-sm text-error font-medium">
                {{ errors.closing_balance[0] }}
              </p>
            </div>

            <!-- Notes (Required) -->
            <div>
              <label class="block text-sm font-semibold text-text-primary mb-1.5">
                Reason for Force Close <span class="text-error">*</span>
              </label>
              <textarea 
                v-model="formData.notes" 
                rows="3"
                placeholder="e.g. Device crash, cashier unreachable, emergency..."
                class="w-full px-4 py-2.5 bg-background border rounded-xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                :class="errors.notes ? 'border-error focus:border-error' : 'border-custom-border focus:border-primary'"
                :disabled="isLoading"
                required
              ></textarea>
              <p v-if="errors.notes" class="mt-1.5 text-sm text-error font-medium">
                {{ errors.notes[0] }}
              </p>
            </div>

            <!-- Warning -->
            <div class="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-xl">
              <svg class="w-5 h-5 text-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-xs text-text-secondary leading-relaxed">
                This action is <span class="font-semibold text-warning">irreversible</span>. The shift will be marked as closed and recorded as "FORCE CLOSED BY MANAGER".
              </p>
            </div>

          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-5 border-t border-custom-border bg-background/50 flex justify-end gap-3">
          <button 
            type="button" 
            @click="$emit('close')"
            class="px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary bg-surface border border-custom-border hover:bg-custom-border/40 rounded-xl transition-all"
            :disabled="isLoading"
          >
            Cancel
          </button>
          <button 
            @click="handleSubmit"
            class="px-5 py-2.5 text-sm font-semibold text-white bg-error hover:bg-error/90 rounded-xl transition-all flex items-center shadow-md shadow-error/20"
            :disabled="isLoading"
          >
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Processing...' : 'Force Close Shift' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-surface,
.modal-leave-to .bg-surface {
  transform: scale(0.95) translateY(10px);
}
</style>