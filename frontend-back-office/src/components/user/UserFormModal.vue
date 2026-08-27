<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserRole, UserPayload } from '@/types/user';

const props = defineProps<{
  isOpen: boolean;
  isLoading: boolean;
  userToEdit: User | null;
  errors: Record<string, string[]>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'submit', payload: UserPayload): void;
}>();

const authStore = useAuthStore();

// --- STATE FORM ---
const formData = ref<UserPayload & { pin_code?: string }>({
  name: '',
  username: '',
  password: '',
  role: 'cashier',
  is_active: true,
  pin_code: '', // Tambahan state untuk PIN baru
});

const showPassword = ref(false);
const showConfirmClose = ref(false);
const showConfirmPin = ref(false); // State untuk konfirmasi Reset PIN

const initialDataString = ref('');

// --- COMPUTED PROPERTIES ---
const isEditMode = computed(() => !!props.userToEdit);

const isDirty = computed(() => {
  return JSON.stringify(formData.value) !== initialDataString.value;
});

const isFormValid = computed(() => {
  if (!formData.value.name.trim() || !formData.value.username.trim() || !formData.value.role) return false;
  if (!isEditMode.value && !formData.value.password) return false;
  return true;
});

const availableRoles = computed(() => {
  const roles: { value: UserRole; label: string }[] = [
    { value: 'manager', label: 'Manager' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'cashier', label: 'Cashier' },
  ];
  if (authStore.user?.role === 'admin') {
    roles.unshift({ value: 'admin', label: 'Admin' });
  }
  return roles;
});

// --- WATCHERS ---
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.userToEdit) {
      formData.value = {
        name: props.userToEdit.name,
        username: props.userToEdit.username,
        role: props.userToEdit.role,
        is_active: props.userToEdit.is_active,
        password: '', 
        pin_code: '', // Kosongkan saat awal dibuka
      };
    } else {
      formData.value = {
        name: '',
        username: '',
        password: '',
        role: 'cashier',
        is_active: true,
        pin_code: '',
      };
    }
    showPassword.value = false;
    showConfirmClose.value = false;
    showConfirmPin.value = false;
    initialDataString.value = JSON.stringify(formData.value);
  }
});

// --- METHODS ---
const handleUsernameInput = (e: Event) => {
  const target = e.target as HTMLInputElement;
  formData.value.username = target.value.replace(/\s+/g, '');
};

const attemptClose = () => {
  if (isDirty.value && !showConfirmClose.value) {
    showConfirmClose.value = true; 
  } else {
    emit('close');
  }
};

// Fungsi untuk men-generate PIN 6 digit baru
const generateNewPin = () => {
  formData.value.pin_code = Math.floor(100000 + Math.random() * 900000).toString();
  showConfirmPin.value = false;
};

const handleSubmit = () => {
  if (!isFormValid.value || props.isLoading) return;

  const payload: UserPayload & { pin_code?: string } = { ...formData.value };

  // Hapus password jika kosong (agar tidak terupdate di backend)
  if (isEditMode.value && !payload.password) {
    delete payload.password;
  }

  // Hapus pin_code dari payload jika tidak ada reset PIN
  if (!payload.pin_code) {
    delete payload.pin_code;
  }

  emit('submit', payload);
};

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.isOpen) {
    attemptClose();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="isOpen" 
        class="fixed inset-0 bg-background/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6"
        @click.self="attemptClose"
      >
        <Transition name="modal-zoom" appear>
          <div 
            v-if="isOpen"
            class="w-full max-w-lg bg-surface/80 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-2xl flex flex-col relative max-h-[90vh] overflow-hidden"
          >
            <!-- Overlay Konfirmasi Tutup (Unsaved Changes) -->
            <div v-if="showConfirmClose" class="absolute inset-0 z-50 bg-surface/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center rounded-2xl">
              <div class="w-16 h-16 rounded-full bg-warning/20 text-warning flex items-center justify-center mb-4">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 class="text-xl font-bold text-text-primary mb-2">Unsaved Changes</h3>
              <p class="text-sm text-text-secondary mb-6">You have unsaved changes. Are you sure you want to close this form? All your progress will be lost.</p>
              <div class="flex gap-3 w-full">
                <button @click="showConfirmClose = false" class="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-text-primary font-bold hover:bg-white/20 transition-colors">Resume Editing</button>
                <button @click="$emit('close')" class="flex-1 px-4 py-2 rounded-xl bg-error text-surface font-bold hover:bg-error/90 shadow-md transition-colors">Discard</button>
              </div>
            </div>

            <!-- Overlay Konfirmasi Reset PIN -->
            <div v-if="showConfirmPin" class="absolute inset-0 z-50 bg-surface/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center rounded-2xl">
              <div class="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center mb-4">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
              </div>
              <h3 class="text-xl font-bold text-text-primary mb-2">Reset PIN Code?</h3>
              <p class="text-sm text-text-secondary mb-6">This will automatically generate a new 6-digit PIN. The new PIN will take effect once you click <strong>Save Changes</strong>.</p>
              <div class="flex gap-3 w-full">
                <button @click="showConfirmPin = false" class="flex-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-text-primary font-bold hover:bg-white/20 transition-colors">Cancel</button>
                <button @click="generateNewPin" class="flex-1 px-4 py-2 rounded-xl bg-primary text-surface font-bold hover:bg-primary/90 shadow-md transition-colors">Yes, Generate</button>
              </div>
            </div>

            <!-- Header -->
            <div class="p-5 sm:p-6 border-b border-white/20 flex items-center justify-between shrink-0 bg-white/5">
              <div>
                <h2 class="text-xl font-bold text-primary">{{ isEditMode ? 'Edit User' : 'Add New User' }}</h2>
                <p class="text-xs text-text-secondary mt-1">{{ isEditMode ? 'Update user credentials and role' : 'Create a new access account' }}</p>
              </div>
              <button @click="attemptClose" class="p-2 rounded-full hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <!-- Body (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">

              <!-- Full Name & Username -->
              <div>
                <label class="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Full Name <span class="text-error">*</span></label>
                <input v-model="formData.name" type="text" placeholder="e.g. John Doe" class="w-full px-4 py-2.5 bg-background/50 border border-white/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl text-sm font-medium text-text-primary outline-none transition-all placeholder:text-text-secondary/50" :class="{'border-error': errors.name}">
                <p v-if="errors.name" class="mt-1.5 text-xs text-error font-medium">{{ errors.name[0] }}</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Username <span class="text-error">*</span></label>
                <input v-model="formData.username" @input="handleUsernameInput" type="text" placeholder="No spaces allowed" class="w-full px-4 py-2.5 bg-background/50 border border-white/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl text-sm font-medium text-text-primary outline-none transition-all placeholder:text-text-secondary/50" :class="{'border-error': errors.username}">
                <p v-if="errors.username" class="mt-1.5 text-xs text-error font-medium">{{ errors.username[0] }}</p>
              </div>

              <!-- Password -->
              <div>
                <label class="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Password <span v-if="!isEditMode" class="text-error">*</span>
                </label>
                <div class="relative">
                  <input v-model="formData.password" :type="showPassword ? 'text' : 'password'" :placeholder="isEditMode ? 'Leave blank to keep current password' : 'Min. 8 characters'" class="w-full pl-4 pr-12 py-2.5 bg-background/50 border border-white/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl text-sm font-medium text-text-primary outline-none transition-all placeholder:text-text-secondary/50" :class="{'border-error': errors.password}">
                  <button @click="showPassword = !showPassword" type="button" class="absolute inset-y-0 right-0 px-3 flex items-center text-text-secondary hover:text-primary transition-colors">
                    <svg v-if="!showPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  </button>
                </div>
              </div>

              <!-- PIN Code Reset Section (Hanya Muncul Saat Edit) -->
              <div v-if="isEditMode" class="bg-white/5 border border-white/10 rounded-xl p-4">
                <label class="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">PIN Code</label>
                
                <!-- Jika PIN Belum Di-Reset -->
                <div v-if="!formData.pin_code" class="flex items-center justify-between">
                  <span class="text-sm font-mono text-text-secondary tracking-widest">••••••</span>
                  <button 
                    @click="showConfirmPin = true" 
                    type="button" 
                    class="px-3 py-1.5 bg-white/10 hover:bg-primary/20 text-text-secondary hover:text-primary transition-colors rounded-lg text-xs font-bold border border-white/20"
                  >
                    Reset PIN
                  </button>
                </div>

                <!-- Jika PIN Sudah Di-Generate (Siap Disimpan) -->
                <div v-else class="flex items-center justify-between bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg">
                  <span class="text-sm font-mono font-bold text-primary tracking-[0.2em]">{{ formData.pin_code }}</span>
                  <button 
                    @click="formData.pin_code = ''" 
                    type="button" 
                    class="text-[10px] font-bold text-error hover:text-error/80 uppercase tracking-wider underline transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
                <!-- Helper Text -->
                <p class="mt-2 text-[10px] text-text-secondary flex items-start gap-1.5">
                  <svg class="w-3 h-3 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span v-if="!formData.pin_code">Click reset to generate a new PIN. It will be hidden otherwise.</span>
                  <span v-else class="text-primary font-medium">New PIN generated! It will be applied once you Save Changes.</span>
                </p>
              </div>

              <!-- Role & Status -->
              <div>
                <label class="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">Role <span class="text-error">*</span></label>
                <select v-model="formData.role" class="w-full px-4 py-2.5 bg-background/50 border border-white/20 focus:border-primary/40 focus:ring-2 focus:ring-primary/20 rounded-xl text-sm font-medium text-text-primary outline-none transition-all appearance-none" :class="{'border-error': errors.role}">
                  <option v-for="role in availableRoles" :key="role.value" :value="role.value">{{ role.label }}</option>
                </select>
                <p v-if="errors.role" class="mt-1.5 text-xs text-error font-medium">{{ errors.role[0] }}</p>
              </div>

              <div v-if="isEditMode" class="pt-2 border-t border-white/10">
                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative">
                    <input type="checkbox" v-model="formData.is_active" class="sr-only">
                    <div class="block w-12 h-6 rounded-full transition-colors duration-300" :class="formData.is_active ? 'bg-emerald-500' : 'bg-surface border border-white/20'"></div>
                    <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm" :class="formData.is_active ? 'translate-x-6' : 'translate-x-0'"></div>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">Account Active</p>
                    <p class="text-xs text-text-secondary">Users can log in and use the system</p>
                  </div>
                </label>
              </div>

            </div>

            <!-- Footer / Actions -->
            <div class="p-5 sm:p-6 border-t border-white/20 bg-white/5 shrink-0 flex gap-3">
              <button @click="attemptClose" type="button" class="px-5 py-2.5 rounded-xl border border-white/20 text-text-primary font-bold hover:bg-white/10 transition-colors disabled:opacity-50" :disabled="isLoading">
                Cancel
              </button>
              <button @click="handleSubmit" type="button" class="flex-1 px-5 py-2.5 rounded-xl bg-primary text-surface font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2" :disabled="!isFormValid || isLoading">
                <div v-if="isLoading" class="w-5 h-5 border-2 border-surface border-t-transparent rounded-full animate-spin"></div>
                <span>{{ isLoading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create User') }}</span>
              </button>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.modal-zoom-enter-active, .modal-zoom-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-zoom-enter-from, .modal-zoom-leave-to { opacity: 0; transform: scale(0.95) translateY(10px); }
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.2); border-radius: 10px; }
</style>