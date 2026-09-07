<script setup lang="ts">
import { computed } from 'vue';
import type { CashierShift } from '@/types/shift';
import { useDateFormat } from '@/composables/useDateFormat';
import { useCurrencyFormat } from '@/composables/useCurrencyFormat';

const { formatDateTime } = useDateFormat();
const { formatCurrency } = useCurrencyFormat();

const props = defineProps<{
  isOpen: boolean;
  shift: CashierShift | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const originalCashier = computed(() => {
  const shift = props.shift;
  if (!shift) return null;

  const handovers = shift.handovers;
  const firstHandover = handovers && handovers.length > 0 ? handovers[0] : undefined;

  if (firstHandover) {
    return firstHandover.from_user ?? null;
  }

  return shift.user ?? null;
});

const isVarianceMinus = computed(() => {
  if (!props.shift || props.shift.variance === null) return false;
  return props.shift.variance < 0;
});

const isVariancePlus = computed(() => {
  if (!props.shift || props.shift.variance === null) return false;
  return props.shift.variance > 0;
});
</script>

<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      @mousedown.self="$emit('close')"
    >
      <div class="bg-surface w-full max-w-2xl rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-custom-border">
        
        <div class="px-6 py-5 border-b border-custom-border flex justify-between items-center bg-surface/60">
          <div>
            <h3 class="text-xl font-bold text-text-primary">Shift Session Details</h3>
            <p class="text-xs text-text-secondary font-medium mt-0.5">
              {{ shift?.shift?.name || 'Custom Shift' }} • Ref: #{{ shift?.id }}
            </p>
          </div>
          <button 
            @click="$emit('close')" 
            class="text-text-secondary hover:text-text-primary hover:bg-custom-border/50 p-2 rounded-full transition-colors cursor-pointer"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="shift" class="p-6 overflow-y-auto custom-scrollbar flex-1 bg-background/30">
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div class="p-4 bg-surface border border-custom-border rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-1">Opening</p>
              <p class="text-sm font-bold text-text-primary">{{ formatCurrency(shift.opening_balance) }}</p>
            </div>
            
            <div class="p-4 bg-surface border border-custom-border rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-1">Expected</p>
              <p class="text-sm font-bold text-text-primary">{{ shift.expected_balance !== null ? formatCurrency(shift.expected_balance) : '-' }}</p>
            </div>

            <div class="p-4 bg-surface border border-custom-border rounded-2xl shadow-sm">
              <p class="text-[10px] uppercase font-bold tracking-wider text-text-secondary mb-1">Closing</p>
              <p class="text-sm font-bold text-text-primary">{{ shift.closing_balance !== null ? formatCurrency(shift.closing_balance) : '-' }}</p>
            </div>

            <div class="p-4 bg-surface border rounded-2xl shadow-sm" :class="{
              'border-error bg-error/5': isVarianceMinus,
              'border-success bg-success/5': isVariancePlus,
              'border-custom-border': !isVarianceMinus && !isVariancePlus
            }">
              <p class="text-[10px] uppercase font-bold tracking-wider mb-1" :class="{
                'text-error': isVarianceMinus,
                'text-success': isVariancePlus,
                'text-text-secondary': !isVarianceMinus && !isVariancePlus
              }">Variance</p>
              <p class="text-sm font-bold" :class="{
                'text-error': isVarianceMinus,
                'text-success': isVariancePlus,
                'text-text-primary': !isVarianceMinus && !isVariancePlus
              }">
                {{ shift.variance !== null ? formatCurrency(shift.variance) : '-' }}
              </p>
            </div>
          </div>

          <h4 class="text-sm font-bold text-text-primary uppercase tracking-wider mb-6">Audit Trail</h4>
          
          <div class="relative pl-4 border-l-2 border-custom-border ml-2 space-y-8 pb-4">
            
            <div class="relative">
              <div class="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-surface shadow-sm"></div>
              <p class="text-xs font-semibold text-text-secondary">{{ formatDateTime(shift.started_at) }}</p>
              <p class="text-base font-bold text-text-primary mt-0.5">Shift Opened</p>
              <p class="text-sm text-text-secondary mt-1">
                Laci dibuka oleh <span class="font-bold text-text-primary">{{ originalCashier?.name || 'Unknown' }}</span> dengan modal awal <span class="font-mono text-primary font-semibold">{{ formatCurrency(shift.opening_balance) }}</span>.
              </p>
            </div>

            <div v-for="handover in (shift.handovers || [])" :key="handover.id" class="relative">
              <div class="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-info ring-4 ring-surface shadow-sm"></div>
              <p class="text-xs font-semibold text-text-secondary">{{ formatDateTime(handover.created_at) }}</p>
              <p class="text-base font-bold text-text-primary mt-0.5">Handover</p>
              <div class="mt-2 p-3 bg-surface border border-custom-border rounded-xl">
                <p class="text-sm text-text-secondary mb-1">
                  Dari: <span class="font-bold text-text-primary">{{ handover.from_user?.name || 'Unknown' }}</span>
                </p>
                <p class="text-sm text-text-secondary mb-2">
                  Ke: <span class="font-bold text-text-primary">{{ handover.to_user?.name || 'Unknown' }}</span>
                </p>
                <p class="text-sm text-text-secondary">
                  Fisik Uang Terhitung: <span class="font-mono text-primary font-semibold">{{ formatCurrency(handover.amount_counted) }}</span>
                </p>
                <div v-if="handover.notes" class="mt-2 pt-2 border-t border-custom-border/50">
                  <p class="text-xs text-text-secondary italic">"{{ handover.notes }}"</p>
                </div>
              </div>
            </div>

            <div class="relative">
              <div 
                class="absolute -left-[25px] top-1 w-4 h-4 rounded-full ring-4 ring-surface shadow-sm"
                :class="shift.status === 'closed' ? (shift.closed_by_user ? 'bg-error' : 'bg-warning') : 'bg-custom-border animate-pulse'"
              ></div>
              <template v-if="shift.status === 'closed'">
                <p class="text-xs font-semibold text-text-secondary">{{ formatDateTime(shift.ended_at || '') }}</p>
                <p class="text-base font-bold text-error mt-0.5">Shift Closed</p>
                <p class="text-sm text-text-secondary mt-1">
                  Laci ditutup oleh <span class="font-bold text-text-primary">{{ shift.closed_by_user ? shift.closed_by_user.name : (shift.user?.name || 'Unknown') }}</span>.
                </p>
                <div v-if="shift.notes" class="mt-2 p-3 bg-error/5 border border-error/20 rounded-xl">
                  <p class="text-xs text-error font-medium">Closing Note:</p>
                  <p class="text-sm text-error/80 italic mt-0.5">"{{ shift.notes }}"</p>
                </div>
              </template>
              <template v-else>
                <p class="text-xs font-semibold text-text-secondary">Current Time</p>
                <p class="text-base font-bold text-text-primary mt-0.5">Session is still active</p>
                <p class="text-sm text-text-secondary mt-1">
                  Laci saat ini sedang dipegang oleh <span class="font-bold text-text-primary">{{ shift.user?.name || 'Unknown' }}</span>.
                </p>
              </template>
            </div>

          </div>
        </div>

        <div class="px-6 py-5 border-t border-custom-border bg-surface/60 flex justify-end">
          <button 
            @click="$emit('close')"
            class="px-6 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all shadow-md shadow-primary/20 cursor-pointer"
          >
            Close Detail
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

.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.3); border-radius: 10px; }
</style>