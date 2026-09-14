<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  isActive: boolean;
  isLowStock: boolean;
  currentStock: number;
}>();

/**
 * Determine display state. Priority:
 * 1. Inactive (if not active)
 * 2. Out of stock (current === 0)
 * 3. Low stock (isLowStock flag from backend)
 * 4. Active (healthy)
 */
const state = computed<'active' | 'low' | 'out' | 'inactive'>(() => {
  if (!props.isActive) return 'inactive';
  if (props.currentStock === 0) return 'out';
  if (props.isLowStock) return 'low';
  return 'active';
});

const classes = computed(() => {
  switch (state.value) {
    case 'active':
      return 'bg-success/10 text-success';
    case 'low':
      return 'bg-warning/15 text-warning';
    case 'out':
      return 'bg-error/15 text-error';
    case 'inactive':
      return 'bg-text-disabled/15 text-text-disabled';
  }
});

const label = computed(() => {
  switch (state.value) {
    case 'active': return 'Active';
    case 'low': return 'Low';
    case 'out': return 'Out';
    case 'inactive': return 'Inactive';
  }
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
    :class="classes"
  >
    <!-- Active indicator dot -->
    <span
      v-if="state === 'active'"
      class="w-1.5 h-1.5 rounded-full bg-success shrink-0"
    ></span>

    <!-- Warning icon for low stock -->
    <svg
      v-else-if="state === 'low'"
      class="w-3 h-3 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>

    <!-- Block icon for out of stock -->
    <svg
      v-else-if="state === 'out'"
      class="w-3 h-3 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>

    <!-- Inactive dot (hollow) -->
    <span
      v-else-if="state === 'inactive'"
      class="w-1.5 h-1.5 rounded-full border border-text-disabled shrink-0"
    ></span>

    {{ label }}
  </span>
</template>