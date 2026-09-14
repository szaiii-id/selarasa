<script setup lang="ts">
import type { RawMaterialCategory } from '@/types/inventory';

defineProps<{
  categories: RawMaterialCategory[];
  isLoading: boolean;
  errorMessage: string | null;
}>();

defineEmits<{
  (e: 'view', category: RawMaterialCategory): void;
  (e: 'edit', category: RawMaterialCategory): void;
  (e: 'delete', category: RawMaterialCategory): void;
  (e: 'retry'): void;
}>();

/**
 * Format ISO date string to Indonesian short date (e.g., "20 Jan 2024").
 */
const formatDate = (date: string | null): string => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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
  <!-- ========================================== -->
  <!-- LOADING STATE                              -->
  <!-- ========================================== -->
  <div v-if="isLoading && categories.length === 0" class="p-12 text-center">
    <div class="inline-block w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
    <p class="text-xs text-text-secondary mt-3">Loading categories...</p>
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
  <div v-else-if="categories.length === 0" class="p-12 text-center">
    <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
      <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    </div>
    <p class="text-sm font-bold">No categories yet</p>
    <p class="text-xs text-text-secondary mt-1">
      Get started by creating your first category
    </p>
  </div>

  <!-- ========================================== -->
  <!-- TABLE                                      -->
  <!-- ========================================== -->
  <div v-else class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-white/40 text-text-secondary text-[10px] uppercase tracking-widest">
          <th class="text-left px-6 py-4 font-bold">Name</th>
          <th class="text-left px-6 py-4 font-bold">Description</th>
          <th class="text-left px-6 py-4 font-bold">Created</th>
          <th class="text-right px-6 py-4 font-bold w-48">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-white/60">
        <tr
          v-for="category in categories"
          :key="category.id"
          class="hover:bg-white/40 transition"
        >
          <!-- Name + Code -->
          <td class="px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <p class="font-bold">{{ category.name }}</p>
                <p class="text-[10px] text-disabled font-mono mt-0.5">
                  {{ getCategoryCode(category.id) }}
                </p>
              </div>
            </div>
          </td>

          <!-- Description -->
          <td class="px-6 py-4 text-text-secondary text-xs max-w-md">
            {{ category.description || '—' }}
          </td>

          <!-- Created -->
          <td class="px-6 py-4 text-xs text-text-secondary whitespace-nowrap">
            {{ formatDate(category.created_at) }}
          </td>

          <!-- Actions with Labels -->
          <td class="px-6 py-4">
            <div class="flex items-center justify-end gap-1.5">

              <!-- View -->
              <button
                @click="$emit('view', category)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:bg-info/10 hover:text-info transition-colors"
                title="View Details"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View
              </button>

              <!-- Edit -->
              <button
                @click="$emit('edit', category)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors"
                title="Edit"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>

              <!-- Delete -->
              <button
                @click="$emit('delete', category)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:bg-error/10 hover:text-error transition-colors"
                title="Delete"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>

            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>