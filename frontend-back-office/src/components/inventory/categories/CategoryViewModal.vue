<script setup lang="ts">
import type { RawMaterialCategory } from '@/types/inventory';

defineProps<{
  isOpen: boolean;
  category: RawMaterialCategory | null;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'edit', category: RawMaterialCategory): void;
}>();

/**
 * Format ISO date string to Indonesian full date-time (e.g., "20 Jan 2024, 14:30").
 */
const formatDateTime = (date: string | null): string => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Generate a display code from category ID (e.g., "CAT-001").
 */
const getCategoryCode = (id: number): string => {
  return `CAT-${String(id).padStart(3, '0')}`;
};
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
        v-if="isOpen && category"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="$emit('close')"
      >
        <div class="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

          <!-- ========================================== -->
          <!-- HEADER                                     -->
          <!-- ========================================== -->
          <div class="px-6 py-5 border-b border-gray-100 flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold">{{ category.name }}</h3>
                <p class="text-[10px] text-text-secondary font-mono mt-0.5">
                  {{ getCategoryCode(category.id) }}
                </p>
              </div>
            </div>
            <button
              @click="$emit('close')"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 text-text-secondary flex items-center justify-center shrink-0"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- ========================================== -->
          <!-- BODY                                       -->
          <!-- ========================================== -->
          <div class="px-6 py-5 space-y-4">

            <!-- Description -->
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-disabled mb-1">
                Description
              </p>
              <p class="text-sm leading-relaxed">
                {{ category.description || '—' }}
              </p>
            </div>

            <!-- Meta Info Grid -->
            <div class="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-disabled mb-1">
                  Created
                </p>
                <p class="text-xs font-semibold">
                  {{ formatDateTime(category.created_at) }}
                </p>
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-disabled mb-1">
                  Last Update
                </p>
                <p class="text-xs font-semibold">
                  {{ formatDateTime(category.updated_at) }}
                </p>
              </div>
            </div>

            <!-- Info Note -->
            <div class="p-3 rounded-xl bg-info/5 border border-info/20 text-[11px] text-info flex gap-2">
              <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Categories cannot be deleted if they still have raw materials assigned to them.
              </span>
            </div>

          </div>

          <!-- ========================================== -->
          <!-- FOOTER                                     -->
          <!-- ========================================== -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              @click="$emit('close')"
              class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white transition"
            >
              Close
            </button>
            <button
              @click="$emit('edit', category)"
              class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Category
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>