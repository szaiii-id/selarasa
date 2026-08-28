<script setup lang="ts">
import type { MasterShift } from '@/types/shift';
import { useDateFormat } from '@/composables/useDateFormat';

const { formatTime } = useDateFormat();

defineProps<{
  shifts: MasterShift[];
  isLoading: boolean;
  errorMessage: string | null;
}>();

defineEmits<{
  (e: 'edit', shift: MasterShift): void;
  (e: 'delete', shift: MasterShift): void;
  (e: 'retry'): void;
}>();
</script>

<template>
  <div class="w-full overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-surface/60 border-b border-custom-border text-sm font-semibold text-text-secondary uppercase tracking-wider">
          <th class="px-6 py-4 rounded-tl-2xl">Shift Name</th>
          <th class="px-6 py-4">Start Time</th>
          <th class="px-6 py-4">End Time</th>
          <th class="px-6 py-4">Status</th>
          <th class="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="isLoading && shifts.length === 0">
          <td colspan="5" class="px-6 py-12 text-center">
            <div class="flex flex-col items-center justify-center space-y-3">
              <div class="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <p class="text-text-secondary text-sm font-medium">Loading shifts data...</p>
            </div>
          </td>
        </tr>

        <tr v-else-if="errorMessage">
          <td colspan="5" class="px-6 py-12 text-center">
            <div class="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
              <svg class="w-12 h-12 text-error/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-error font-medium">{{ errorMessage }}</p>
              <button 
                @click="$emit('retry')" 
                class="px-4 py-2 mt-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          </td>
        </tr>

        <tr v-else-if="shifts.length === 0">
          <td colspan="5" class="px-6 py-16 text-center">
            <div class="flex flex-col items-center justify-center space-y-3">
              <div class="w-16 h-16 bg-disabled/20 rounded-full flex items-center justify-center mb-2">
                <svg class="w-8 h-8 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p class="text-text-primary font-medium text-lg">No Shifts Found</p>
              <p class="text-text-secondary text-sm">There are no master shifts configured yet.</p>
            </div>
          </td>
        </tr>

        <tr 
          v-for="shift in shifts" 
          v-else
          :key="shift.id"
          class="border-b border-custom-border/60 hover:bg-white/50 transition-colors group"
          :class="{ 'opacity-60': !shift.is_active && !isLoading }"
        >
          <td class="px-6 py-4">
            <span class="font-medium text-text-primary">{{ shift.name }}</span>
          </td>

          <td class="px-6 py-4">
            <span class="text-text-secondary bg-surface px-3 py-1 rounded-lg border border-custom-border shadow-sm">
              {{ formatTime(shift.start_time) }}
            </span>
          </td>

          <td class="px-6 py-4">
            <span class="text-text-secondary bg-surface px-3 py-1 rounded-lg border border-custom-border shadow-sm">
              {{ formatTime(shift.end_time) }}
            </span>
          </td>

          <td class="px-6 py-4">
            <span 
              v-if="shift.is_active" 
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/20"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
              Active
            </span>
            <span 
              v-else 
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-disabled/30 text-text-secondary border border-disabled/40"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-text-secondary mr-1.5"></span>
              Inactive
            </span>
          </td>

          <td class="px-6 py-4">
            <div class="flex items-center justify-end gap-2">
              <button 
                @click="$emit('edit', shift)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-info bg-info/10 hover:bg-info/20 rounded-lg transition-colors"
                title="Edit Shift"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>

              <button 
                @click="$emit('delete', shift)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors"
                title="Delete Shift"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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