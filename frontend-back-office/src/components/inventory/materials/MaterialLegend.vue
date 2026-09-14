<script setup lang="ts">
// Legend items — data-driven so it's easy to add more states later.
interface LegendItem {
  label: string;
  swatchClass: string;
}

const items: LegendItem[] = [
  {
    label: 'Stock is healthy (stock > minimum)',
    swatchClass: 'bg-success/30 border border-success',
  },
  {
    label: 'Low stock (stock ≤ minimum)',
    swatchClass: 'bg-warning/30 border border-warning',
  },
  {
    label: 'Out of stock (0)',
    swatchClass: 'bg-error/30 border border-error',
  },
  {
    label: 'Inactive material',
    swatchClass: 'bg-disabled/30 border border-disabled',
  },
];
</script>

<template>
  <div class="flex flex-wrap gap-4 text-[11px] text-text-secondary">
    <span
      v-for="item in items"
      :key="item.label"
      class="flex items-center gap-2"
    >
      <span
        class="w-3 h-3 rounded shrink-0"
        :class="item.swatchClass"
      ></span>
      {{ item.label }}
    </span>
  </div>
</template>