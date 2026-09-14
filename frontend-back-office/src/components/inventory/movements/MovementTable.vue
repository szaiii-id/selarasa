<script setup lang="ts">
import type { StockMovement, MovementType } from '@/types/inventory';

defineProps<{
  movements: StockMovement[];
  isLoading: boolean;
  errorMessage: string | null;
}>();

defineEmits<{
  (e: 'view', movement: StockMovement): void;
  (e: 'retry'): void;
}>();

/**
 * Format ISO date string to short date + time (e.g., "27 Jan 2024" / "09:45").
 */
const formatDateTime = (date: string | null): { date: string; time: string } => {
  if (!date) return { date: '-', time: '' };
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return { date: '-', time: '' };

  return {
    date: parsed.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    time: parsed.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
};

/**
 * Get type badge styling based on movement type.
 */
const getTypeBadge = (type: MovementType) => {
  switch (type) {
    case 'IN':
      return {
        class: 'bg-success/10 text-success',
        label: 'IN',
        arrow: 'M19 14l-7 7m0 0l-7-7m7 7V3', // down arrow
      };
    case 'OUT':
      return {
        class: 'bg-error/10 text-error',
        label: 'OUT',
        arrow: 'M5 10l7-7m0 0l7 7m-7-7v18', // up arrow
      };
    case 'ADJUSTMENT':
      return {
        class: 'bg-warning/10 text-warning',
        label: 'ADJ',
        arrow: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', // swap
      };
  }
};

/**
 * Format quantity with explicit sign based on movement type.
 */
const formatQuantity = (movement: StockMovement): string => {
  const qty = Number(movement.quantity);
  if (movement.movement_type === 'IN') return `+${qty.toFixed(2)}`;
  if (movement.movement_type === 'OUT') return qty < 0 ? qty.toFixed(2) : `-${qty.toFixed(2)}`;
  // ADJUSTMENT can be positive or negative
  return qty >= 0 ? `+${qty.toFixed(2)}` : qty.toFixed(2);
};

/**
 * Get quantity color based on sign.
 */
const getQuantityClass = (movement: StockMovement): string => {
  const qty = Number(movement.quantity);
  if (movement.movement_type === 'IN') return 'text-success';
  if (movement.movement_type === 'OUT') return 'text-error';
  return qty >= 0 ? 'text-success' : 'text-error';
};

/**
 * Get balance-after color based on whether it went below minimum.
 * We don't have minimum_stock here directly — this uses a simplified approach.
 */
const getBalanceAfterClass = (movement: StockMovement): string => {
  const after = Number(movement.balance_after);
  if (after === 0) return 'text-error font-bold';
  return 'font-bold';
};

/**
 * Get user initials for avatar.
 */
const getUserInitials = (name: string | null | undefined): string => {
  if (!name) return '??';
  const words = name.trim().split(/\s+/);
  const first = words[0]?.charAt(0) || '';
  const second = words[1]?.charAt(0) || '';
  return (first + second).toUpperCase() || '??';
};

/**
 * Get avatar color based on name hash.
 */
const getAvatarColor = (name: string | null | undefined): string => {
  if (!name) return 'bg-text-disabled/20 text-text-disabled';
  const colors = [
    'bg-primary/10 text-primary',
    'bg-info/10 text-info',
    'bg-success/10 text-success',
    'bg-warning/10 text-warning',
    'bg-error/10 text-error',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length]!;
};
</script>

<template>
  <!-- ========================================== -->
  <!-- LOADING STATE                              -->
  <!-- ========================================== -->
  <div v-if="isLoading && movements.length === 0" class="p-12 text-center">
    <div class="inline-block w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    <p class="text-xs text-text-secondary mt-3">Loading stock movements...</p>
  </div>

  <!-- ========================================== -->
  <!-- ERROR STATE                                -->
  <!-- ========================================== -->
  <div v-else-if="errorMessage" class="p-12 text-center">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-error/10 text-error mb-3">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <p class="text-sm font-semibold text-error">{{ errorMessage }}</p>
    <button
      @click="$emit('retry')"
      class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition"
    >
      Try Again
    </button>
  </div>

  <!-- ========================================== -->
  <!-- EMPTY STATE                                -->
  <!-- ========================================== -->
  <div v-else-if="movements.length === 0" class="p-12 text-center">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    </div>
    <p class="text-sm font-bold">No movements found</p>
    <p class="text-xs text-text-secondary mt-1">
      Try adjusting your filters or record a new movement
    </p>
  </div>

  <!-- ========================================== -->
  <!-- TABLE                                      -->
  <!-- ========================================== -->
  <div v-else class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-white/40 text-text-secondary text-[10px] uppercase tracking-widest">
          <th class="text-left px-6 py-4 font-bold">When</th>
          <th class="text-left px-6 py-4 font-bold">Material</th>
          <th class="text-center px-6 py-4 font-bold">Type</th>
          <th class="text-right px-6 py-4 font-bold">Qty</th>
          <th class="text-right px-6 py-4 font-bold">Balance Flow</th>
          <th class="text-left px-6 py-4 font-bold">Reason</th>
          <th class="text-left px-6 py-4 font-bold">By</th>
          <th class="text-right px-6 py-4 font-bold w-16">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/60">
        <tr
          v-for="movement in movements"
          :key="movement.id"
          class="hover:bg-white/40 transition"
        >
          <!-- When -->
          <td class="px-6 py-4 whitespace-nowrap">
            <p class="text-xs font-semibold">{{ formatDateTime(movement.created_at).date }}</p>
            <p class="text-[10px] text-text-disabled">{{ formatDateTime(movement.created_at).time }}</p>
          </td>

          <!-- Material -->
          <td class="px-6 py-4">
            <p class="font-bold text-xs">
              {{ movement.raw_material?.name || 'Unknown Material' }}
            </p>
            <p class="text-[10px] text-text-disabled font-mono mt-0.5">
              {{ movement.raw_material?.sku || '—' }}
            </p>
          </td>

          <!-- Type Badge -->
          <td class="px-6 py-4 text-center">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
              :class="getTypeBadge(movement.movement_type).class"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" :d="getTypeBadge(movement.movement_type).arrow" />
              </svg>
              {{ getTypeBadge(movement.movement_type).label }}
            </span>
          </td>

          <!-- Quantity -->
          <td class="px-6 py-4 text-right">
            <span
              class="font-mono font-bold text-sm"
              :class="getQuantityClass(movement)"
            >
              {{ formatQuantity(movement) }}
            </span>
            <span class="text-text-secondary text-xs ml-1">
              {{ movement.raw_material?.unit || '' }}
            </span>
          </td>

          <!-- Balance Flow -->
          <td class="px-6 py-4 text-right whitespace-nowrap">
            <div class="flex items-center justify-end gap-2 font-mono text-xs">
              <span class="text-text-secondary">
                {{ Number(movement.balance_before).toFixed(2) }}
              </span>
              <svg class="w-3 h-3 text-primary" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span :class="getBalanceAfterClass(movement)">
                {{ Number(movement.balance_after).toFixed(2) }}
              </span>
            </div>
          </td>

          <!-- Reason -->
          <td class="px-6 py-4 max-w-xs">
            <p class="text-xs truncate">{{ movement.reason }}</p>
            <p v-if="movement.reference_id" class="text-[10px] text-text-disabled font-mono mt-0.5 truncate">
              {{ movement.reference_id }}
            </p>
          </td>

          <!-- User -->
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              <template v-if="movement.user">
                <div
                  class="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0"
                  :class="getAvatarColor(movement.user.name)"
                >
                  {{ getUserInitials(movement.user.name) }}
                </div>
                <span class="text-xs truncate max-w-[100px]">
                  {{ movement.user.name }}
                </span>
              </template>
              <template v-else>
                <div class="w-6 h-6 rounded-md bg-info/10 text-info flex items-center justify-center shrink-0">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span class="text-xs italic text-text-disabled">System</span>
              </template>
            </div>
          </td>

          <!-- Actions -->
          <td class="px-6 py-4 text-right">
            <button
              @click="$emit('view', movement)"
              class="w-8 h-8 rounded-lg hover:bg-info/10 text-text-secondary hover:text-info transition-colors flex items-center justify-center"
              title="View Details"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>