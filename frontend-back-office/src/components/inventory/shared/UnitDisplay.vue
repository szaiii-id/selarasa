<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    value: number;
    unit: string;
    state?: 'default' | 'warning' | 'danger';
    decimals?: number;
  }>(),
  {
    state: 'default',
    decimals: 2,
  }
);

/**
 * Format the numeric value.
 * - If integer, show without decimals (e.g., "320" not "320.00")
 * - Otherwise, show with configured decimals (default 2)
 */
const formatted = computed(() => {
  if (Number.isInteger(props.value)) {
    return String(props.value);
  }
  return props.value.toFixed(props.decimals);
});

/**
 * Value color class based on state.
 */
const valueClass = computed(() => {
  switch (props.state) {
    case 'danger':
      return 'text-error';
    case 'warning':
      return 'text-warning';
    default:
      return 'text-text-primary';
  }
});
</script>

<template>
  <span class="inline-flex items-baseline gap-1">
    <span class="font-mono font-bold text-base" :class="valueClass">
      {{ formatted }}
    </span>
    <span class="text-text-secondary text-xs">
      {{ unit }}
    </span>
  </span>
</template>