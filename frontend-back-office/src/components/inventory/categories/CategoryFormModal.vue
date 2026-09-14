<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type {
  RawMaterialCategory,
  RawMaterialCategoryPayload,
} from '@/types/inventory';

const props = defineProps<{
  isOpen: boolean;
  isLoading: boolean;
  categoryToEdit: RawMaterialCategory | null;
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: RawMaterialCategoryPayload): void;
}>();

// ==========================================
// FORM STATE
// ==========================================
const form = ref<RawMaterialCategoryPayload>({
  name: '',
  description: '',
});

const isEditing = computed(() => !!props.categoryToEdit);

const isValid = computed(() => form.value.name.trim().length > 0);

// ==========================================
// RESET FORM ON OPEN
// ==========================================
watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return;

    if (props.categoryToEdit) {
      form.value = {
        name: props.categoryToEdit.name,
        description: props.categoryToEdit.description || '',
      };
    } else {
      form.value = { name: '', description: '' };
    }
  },
  { immediate: true }
);

// ==========================================
// HANDLERS
// ==========================================
const handleSubmit = () => {
  if (!isValid.value || props.isLoading) return;
  emit('submit', {
    name: form.value.name.trim(),
    description: form.value.description?.trim() || null,
  });
};

const handleClose = () => {
  if (props.isLoading) return;
  emit('close');
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
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        @click.self="handleClose"
      >
        <div class="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">

          <!-- ========================================== -->
          <!-- HEADER                                     -->
          <!-- ========================================== -->
          <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold">
                {{ isEditing ? 'Edit Category' : 'Add Category' }}
              </h3>
              <p class="text-xs text-text-secondary mt-0.5">
                {{
                  isEditing
                    ? 'Update the name or description of this category'
                    : 'Create a new category for raw materials'
                }}
              </p>
            </div>
            <button
              @click="handleClose"
              class="w-8 h-8 rounded-lg hover:bg-gray-100 text-text-secondary flex items-center justify-center"
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

            <!-- Name -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Name <span class="text-error">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g., Coffee Beans"
                maxlength="100"
                class="w-full px-4 py-2.5 rounded-xl bg-gray-50 border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                :class="errors.name ? 'border-error' : 'border-gray-200'"
              />
              <p v-if="errors.name" class="mt-1.5 text-[11px] text-error font-medium">
                {{ errors.name[0] }}
              </p>
              <p v-else class="mt-1.5 text-[10px] text-disabled">
                {{ form.name.length }}/100 characters
              </p>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-2">
                Description
                <span class="text-disabled font-normal normal-case">(optional)</span>
              </label>
              <textarea
                v-model="form.description"
                rows="3"
                placeholder="e.g., Single origin and house blend coffee beans"
                maxlength="500"
                class="w-full px-4 py-2.5 rounded-xl bg-gray-50 border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                :class="errors.description ? 'border-error' : 'border-gray-200'"
              ></textarea>
              <p v-if="errors.description" class="mt-1.5 text-[11px] text-error font-medium">
                {{ errors.description[0] }}
              </p>
              <p v-else class="mt-1.5 text-[10px] text-disabled">
                {{ form.description?.length || 0 }}/500 characters
              </p>
            </div>

          </div>

          <!-- ========================================== -->
          <!-- FOOTER                                     -->
          <!-- ========================================== -->
          <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              @click="handleClose"
              :disabled="isLoading"
              class="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              @click="handleSubmit"
              :disabled="isLoading || !isValid"
              class="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                v-if="isLoading"
                class="w-3.5 h-3.5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {{ isEditing ? 'Save Changes' : 'Create Category' }}
            </button>
          </div>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>