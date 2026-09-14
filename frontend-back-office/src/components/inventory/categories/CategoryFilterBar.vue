<script setup lang="ts">
defineProps<{
  keyword: string;
}>();

defineEmits<{
  (e: 'update:keyword', value: string): void;
}>();
</script>

<template>
  <div class="glass rounded-3xl p-5 shadow-sm">
    <div class="flex flex-wrap gap-3">
      <div class="flex-1 min-w-[240px] relative">
        <svg
          class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-disabled pointer-events-none"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          :value="keyword"
          @input="$emit('update:keyword', ($event.target as HTMLInputElement).value)"
          placeholder="Search category name..."
          class="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/60 border border-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  </div>
</template>