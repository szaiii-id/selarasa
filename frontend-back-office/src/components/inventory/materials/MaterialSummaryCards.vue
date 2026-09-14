<script setup lang="ts">
defineProps<{
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
}>();
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

    <!-- Total Materials -->
    <div class="glass-soft rounded-2xl p-4 border border-white/60 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-disabled">
          Total Materials
        </p>
        <div class="w-7 h-7 rounded-lg bg-disabled/10 text-text-secondary flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2">{{ total }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Across all categories</p>
    </div>

    <!-- Active -->
    <div class="glass-soft rounded-2xl p-4 border border-success/20 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-success">
          Active
        </p>
        <div class="w-7 h-7 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2 text-success">{{ active }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Ready to use</p>
    </div>

    <!-- Low Stock -->
    <div class="glass-soft rounded-2xl p-4 border border-warning/25 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-warning">
          Low Stock
        </p>
        <div class="w-7 h-7 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2 text-warning">{{ lowStock }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Needs restocking</p>
    </div>

    <!-- Out of Stock -->
    <div class="glass-soft rounded-2xl p-4 border border-error/25 shadow-sm hover:shadow-md transition-shadow">
      <div class="flex items-start justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest text-error">
          Out of Stock
        </p>
        <div class="w-7 h-7 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
          </svg>
        </div>
      </div>
      <p class="text-2xl font-extrabold mt-2 text-error">{{ outOfStock }}</p>
      <p class="text-[10px] text-text-secondary mt-0.5">Urgent action</p>
    </div>

  </div>
</template>