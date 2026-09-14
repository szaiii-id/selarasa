<script setup lang="ts">
import { computed } from 'vue';
import type { StockMovement, MovementType } from '@/types/inventory';

const props = defineProps<{
  isOpen: boolean;
  movement: StockMovement | null;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

// ==========================================
// FORMATTING HELPERS
// ==========================================
const formatDateTime = (date: string | null): { date: string; time: string } => {
  if (!date) return { date: '-', time: '' };
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return { date: '-', time: '' };

  return {
    date: parsed.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  };
};

const formatQuantity = (movement: StockMovement): string => {
  const qty = Number(movement.quantity);
  if (movement.movement_type === 'IN') return `+${qty.toFixed(2)}`;
  if (movement.movement_type === 'OUT') {
    return qty < 0 ? qty.toFixed(2) : `-${qty.toFixed(2)}`;
  }
  return qty >= 0 ? `+${qty.toFixed(2)}` : qty.toFixed(2);
};

const getUserInitials = (name: string | null | undefined): string => {
  if (!name) return '??';
  const words = name.trim().split(/\s+/);
  const first = words[0]?.charAt(0) || '';
  const second = words[1]?.charAt(0) || '';
  return (first + second).toUpperCase() || '??';
};

// ==========================================
// COMPUTED
// ==========================================
const typeMeta = computed(() => {
  if (!props.movement) return null;
  return getTypeMeta(props.movement.movement_type);
});

const getTypeMeta = (type: MovementType) => {
  switch (type) {
    case 'IN':
      return {
        label: 'Stock In',
        shortLabel: 'IN',
        description: 'Material received into warehouse',
        bg: 'bg-success/10',
        text: 'text-success',
        border: 'border-success/20',
        arrow: 'M19 14l-7 7m0 0l-7-7m7 7V3',
      };
    case 'OUT':
      return {
        label: 'Stock Out',
        shortLabel: 'OUT',
        description: 'Material issued from warehouse',
        bg: 'bg-error/10',
        text: 'text-error',
        border: 'border-error/20',
        arrow: 'M5 10l7-7m0 0l7 7m-7-7v18',
      };
    case 'ADJUSTMENT':
      return {
        label: 'Adjustment',
        shortLabel: 'ADJ',
        description: 'Manual correction after stock opname',
        bg: 'bg-warning/10',
        text: 'text-warning',
        border: 'border-warning/20',
        arrow: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
      };
  }
};

const quantityClass = computed(() => {
  if (!props.movement) return '';
  const qty = Number(props.movement.quantity);
  if (props.movement.movement_type === 'IN') return 'text-success';
  if (props.movement.movement_type === 'OUT') return 'text-error';
  return qty >= 0 ? 'text-success' : 'text-error';
});

const createdAt = computed(() =>
  formatDateTime(props.movement?.created_at ?? null)
);
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen && movement && typeMeta"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto"
        @click.self="$emit('close')"
      >
        <div class="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-8">

          <!-- ========================================== -->
          <!-- HEADER                                     -->
          <!-- ========================================== -->
          <div class="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                :class="`${typeMeta.bg} ${typeMeta.text}`"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="typeMeta.arrow" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-lg font-bold">{{ typeMeta.label }}</h3>
                <p class="text-[10px] text-text-secondary mt-0.5">
                  Movement #{{ movement.id }}
                </p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 text-text-secondary flex items-center justify-center shrink-0 ml-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- ========================================== -->
          <!-- BODY                                       -->
          <!-- ========================================== -->
          <div class="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

            <!-- Material Info -->
            <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-2">
                Material
              </p>
              <p class="text-sm font-bold">
                {{ movement.raw_material?.name || 'Unknown Material' }}
              </p>
              <p class="text-[10px] text-text-secondary font-mono mt-0.5">
                {{ movement.raw_material?.sku || '—' }}
                <template v-if="movement.raw_material?.category">
                  · {{ movement.raw_material.category.name }}
                </template>
              </p>
            </div>

            <!-- Quantity Highlight -->
            <div
              class="p-4 rounded-2xl border-2 text-center"
              :class="`${typeMeta.bg} ${typeMeta.border}`"
            >
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">
                Quantity
              </p>
              <p class="text-3xl font-mono font-extrabold" :class="quantityClass">
                {{ formatQuantity(movement) }}
                <span class="text-base font-medium text-text-secondary ml-1">
                  {{ movement.raw_material?.unit || '' }}
                </span>
              </p>
              <p class="text-[11px] mt-1.5 text-text-secondary">
                {{ typeMeta.description }}
              </p>
            </div>

            <!-- Balance Flow -->
            <div class="p-4 rounded-2xl bg-white border border-gray-100">
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-3">
                Balance Flow
              </p>
              <div class="flex items-center justify-between gap-4">
                <!-- Before -->
                <div class="flex-1 text-center">
                  <p class="text-[10px] uppercase tracking-widest text-text-disabled mb-1">
                    Before
                  </p>
                  <p class="text-lg font-mono font-bold text-text-secondary">
                    {{ Number(movement.balance_before).toFixed(2) }}
                  </p>
                </div>

                <!-- Arrow -->
                <div class="shrink-0">
                  <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <!-- After -->
                <div class="flex-1 text-center">
                  <p class="text-[10px] uppercase tracking-widest text-text-disabled mb-1">
                    After
                  </p>
                  <p
                    class="text-lg font-mono font-bold"
                    :class="Number(movement.balance_after) === 0 ? 'text-error' : 'text-text-primary'"
                  >
                    {{ Number(movement.balance_after).toFixed(2) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Reason -->
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-1.5">
                Reason
              </p>
              <p class="text-sm leading-relaxed">
                {{ movement.reason }}
              </p>
            </div>

            <!-- Reference ID (only if present) -->
            <div v-if="movement.reference_id">
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-1.5">
                Reference ID
              </p>
              <p class="text-sm font-mono font-semibold">
                {{ movement.reference_id }}
              </p>
            </div>

            <!-- Performed By -->
            <div class="pt-4 border-t border-gray-100">
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-2">
                Performed By
              </p>
              <div class="flex items-center gap-3">
                <template v-if="movement.user">
                  <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {{ getUserInitials(movement.user.name) }}
                  </div>
                  <div>
                    <p class="text-sm font-bold">{{ movement.user.name }}</p>
                    <p class="text-[10px] text-text-secondary uppercase tracking-widest">
                      {{ movement.user.role }}
                    </p>
                  </div>
                </template>
                <template v-else>
                  <div class="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold">System</p>
                    <p class="text-[10px] text-text-secondary uppercase tracking-widest">
                      Automated (POS)
                    </p>
                  </div>
                </template>
              </div>
            </div>

            <!-- Timestamp -->
            <div class="pt-4 border-t border-gray-100">
              <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled mb-2">
                Recorded At
              </p>
              <p class="text-sm font-semibold">
                {{ createdAt.date }}
              </p>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ createdAt.time }} WIB
              </p>
            </div>

            <!-- Immutability Notice -->
            <div class="p-3 rounded-xl bg-info/5 border border-info/20 text-[11px] text-info flex gap-2">
              <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>
                This record is part of the immutable audit trail. It cannot be edited or deleted.
                If a correction is needed, create a new <strong>ADJUSTMENT</strong> movement.
              </span>
            </div>

          </div>

          <!-- ========================================== -->
          <!-- FOOTER                                     -->
          <!-- ========================================== -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              @click="$emit('close')"
              class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white transition"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>