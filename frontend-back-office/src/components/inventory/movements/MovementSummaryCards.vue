<script setup lang="ts">
defineProps<{
  total: number;
  inCount: number;
  outCount: number;
  adjustmentCount: number;
}>();
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

    <!-- Total Movements -->
    <div class="glass-soft rounded-2xl p-4">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-text-disabled">
          Total Movements
        </p>
        <div class="w-7 h-7 rounded-lg bg-text-disabled/10 text-text-secondary flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2">{{ total }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">All time records</p>
    </div>

    <!-- IN Movements -->
    <div class="glass-soft rounded-2xl p-4">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-success">
          IN
        </p>
        <div class="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2 text-success">{{ inCount }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Stock received</p>
    </div>

    <!-- OUT Movements -->
    <div class="glass-soft rounded-2xl p-4">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-error">
          OUT
        </p>
        <div class="w-7 h-7 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2 text-error">{{ outCount }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Stock issued</p>
    </div>

    <!-- ADJUSTMENT Movements -->
    <div class="glass-soft rounded-2xl p-4">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-warning">
          Adjustments
        </p>
        <div class="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2 text-warning">{{ adjustmentCount }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Manual corrections</p>
    </div>

  </div>
</template>