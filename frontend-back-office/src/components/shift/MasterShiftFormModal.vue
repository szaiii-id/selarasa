
<script setup lang="ts">
import { ref, watch } from 'vue';
import type { MasterShift } from '@/types/shift';

const props = defineProps<{
  isOpen: boolean;
  isLoading: boolean;
  shiftToEdit: MasterShift | null;
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: Partial<MasterShift>): void;
}>();

// Form State
const formData = ref({
  name: '',
  start_time: '',
  end_time: '',
  is_active: true
});

// Watcher untuk mereset atau mengisi form setiap kali modal dibuka
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      if (props.shiftToEdit) {
        // Mode Edit: Isi form dengan data yang ada
        formData.value = {
          name: props.shiftToEdit.name,
          // Format time ke 'HH:mm' jika dari backend datang sebagai 'HH:mm:ss'
          start_time: props.shiftToEdit.start_time.substring(0, 5),
          end_time: props.shiftToEdit.end_time.substring(0, 5),
          is_active: props.shiftToEdit.is_active
        };
      } else {
        // Mode Tambah Baru: Kosongkan form
        formData.value = {
          name: '',
          start_time: '08:00',
          end_time: '16:00',
          is_active: true
        };
      }
    }
  }
);

const handleSubmit = () => {
  emit('submit', { ...formData.value });
};
</script>

<template>
  <Transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-text-primary/40 backdrop-blur-sm"
      @mousedown.self="$emit('close')"
    >
      <div class="bg-surface w-full max-w-md rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="px-6 py-5 border-b border-custom-border flex justify-between items-center bg-background/50">
          <h3 class="text-xl font-bold text-text-primary">
            {{ shiftToEdit ? 'Edit Master Shift' : 'Create Master Shift' }}
          </h3>
          <button 
            @click="$emit('close')" 
            class="text-text-secondary hover:text-text-primary hover:bg-custom-border/50 p-2 rounded-full transition-colors"
            :disabled="isLoading"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto">
          <form @submit.prevent="handleSubmit" class="space-y-5">
            
            <!-- Shift Name -->
            <div>
              <label class="block text-sm font-semibold text-text-primary mb-1.5">
                Shift Name <span class="text-error">*</span>
              </label>
              <input 
                v-model="formData.name" 
                type="text" 
                placeholder="e.g. Morning Shift"
                class="w-full px-4 py-2.5 bg-background border rounded-xl text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                :class="errors.name ? 'border-error focus:border-error' : 'border-custom-border focus:border-primary'"
                :disabled="isLoading"
                required
              />
              <p v-if="errors.name" class="mt-1.5 text-sm text-error font-medium">
                {{ errors.name[0] }}
              </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <!-- Start Time -->
              <div>
                <label class="block text-sm font-semibold text-text-primary mb-1.5">
                  Start Time <span class="text-error">*</span>
                </label>
                <input 
                  v-model="formData.start_time" 
                  type="time" 
                  class="w-full px-4 py-2.5 bg-background border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  :class="errors.start_time ? 'border-error focus:border-error' : 'border-custom-border focus:border-primary'"
                  :disabled="isLoading"
                  required
                />
                <p v-if="errors.start_time" class="mt-1.5 text-sm text-error font-medium">
                  {{ errors.start_time[0] }}
                </p>
              </div>

              <!-- End Time -->
              <div>
                <label class="block text-sm font-semibold text-text-primary mb-1.5">
                  End Time <span class="text-error">*</span>
                </label>
                <input 
                  v-model="formData.end_time" 
                  type="time" 
                  class="w-full px-4 py-2.5 bg-background border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  :class="errors.end_time ? 'border-error focus:border-error' : 'border-custom-border focus:border-primary'"
                  :disabled="isLoading"
                  required
                />
                <p v-if="errors.end_time" class="mt-1.5 text-sm text-error font-medium">
                  {{ errors.end_time[0] }}
                </p>
              </div>
            </div>

            <!-- Active Status Toggle -->
            <div class="pt-2">
              <label class="flex items-center cursor-pointer p-4 border border-custom-border rounded-xl hover:bg-background transition-colors" :class="{'opacity-50': isLoading}">
                <div class="relative">
                  <input 
                    v-model="formData.is_active" 
                    type="checkbox" 
                    class="sr-only" 
                    :disabled="isLoading"
                  />
                  <div class="block bg-disabled/50 w-12 h-7 rounded-full transition-colors" :class="{'bg-success': formData.is_active}"></div>
                  <div class="dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform" :class="{'transform translate-x-5': formData.is_active}"></div>
                </div>
                <div class="ml-4">
                  <p class="text-sm font-semibold text-text-primary">Active Status</p>
                  <p class="text-xs text-text-secondary">Inactive shifts cannot be selected by cashiers.</p>
                </div>
              </label>
              <p v-if="errors.is_active" class="mt-1.5 text-sm text-error font-medium">
                {{ errors.is_active[0] }}
              </p>
            </div>

          </form>
        </div>

        <!-- Footer -->
        <div class="px-6 py-5 border-t border-custom-border bg-background/50 flex justify-end gap-3">
          <button 
            type="button" 
            @click="$emit('close')"
            class="px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-text-primary bg-surface border border-custom-border hover:bg-custom-border/40 rounded-xl transition-all"
            :disabled="isLoading"
          >
            Cancel
          </button>
          <button 
            @click="handleSubmit"
            class="px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-all flex items-center shadow-md shadow-primary/20"
            :disabled="isLoading"
          >
            <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ isLoading ? 'Saving...' : 'Save Shift' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .bg-surface,
.modal-leave-to .bg-surface {
  transform: scale(0.95) translateY(10px);
}
</style>