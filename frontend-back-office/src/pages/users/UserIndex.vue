<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router'; 
import BackofficeLayout from '@/layouts/BackofficeLayout.vue';
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';
import { useTableFilters } from '@/composables/useTableFilters';
import { useModal } from '@/composables/useModal';
import type { UserRole, User, UserPayload, UserFilterState } from '@/types/user'; 

// Import komponen
import UserPageHeader from '@/components/user/UserPageHeader.vue';
import UserFilterBar from '@/components/user/UserFilterBar.vue';
import UserTable from '@/components/user/UserTable.vue';
import UserPagination from '@/components/user/UserPagination.vue';
import UserFormModal from '@/components/user/UserFormModal.vue';
import SuccessModal from '@/components/user/SuccessModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import UserViewModal from '@/components/user/UserViewModal.vue';

const userStore = useUserStore();
const authStore = useAuthStore();
const router = useRouter();   

// --- INISIALISASI COMPOSABLE PENCARIAN & FILTER ---
const loadUsers = () => {
  userStore.fetchUsers({
    search: filters.value.search,
    role: filters.value.role,
    is_active: filters.value.is_active,
    page: filters.value.page
  });
};

const { filters, applyFilters, changePage } = useTableFilters<UserFilterState>({
  search: '',
  role: '',
  is_active: '',
  page: 1
}, loadUsers);

watch(
  () => [filters.value.search, filters.value.role, filters.value.is_active],
  () => applyFilters()
);

// --- INISIALISASI COMPOSABLE MODAL (Sangat DRY!) ---
const formModal = useModal<User | null>(null);
const viewModal = useModal<User | null>(null);

const successModal = useModal({ title: '', message: '', pinCode: null as string | null, username: null as string | null });
const requiresRelogin = ref(false);

const confirmModal = useModal({ type: 'deactivate' as 'deactivate' | 'activate' | 'delete', user: null as User | null });

// --- COMPUTED PROPERTIES UNTUK CONFIRM MODAL ---
const confirmTitle = computed(() => {
  const type = confirmModal.data.value?.type;
  if (type === 'delete') return 'Delete User Permanently?';
  if (type === 'activate') return 'Activate User?';
  return 'Deactivate User?';
});

const confirmMessage = computed(() => {
  const name = confirmModal.data.value?.user?.name || 'this user';
  const type = confirmModal.data.value?.type;
  if (type === 'delete') return `Are you sure you want to PERMANENTLY delete ${name}? This action cannot be undone.`;
  if (type === 'activate') return `Are you sure you want to activate ${name}? They will regain access to the system.`;
  return `Are you sure you want to deactivate ${name}? They will no longer be able to log in.`;
});

const confirmText = computed(() => {
  const type = confirmModal.data.value?.type;
  if (type === 'delete') return 'Yes, Delete';
  if (type === 'activate') return 'Yes, Activate';
  return 'Yes, Deactivate';
});

const confirmTheme = computed(() => confirmModal.data.value?.type === 'activate' ? 'primary' : 'danger');

// --- METHODS: PAGINATION ---
const prevPage = () => {
  if (userStore.pagination.current_page > 1) changePage(userStore.pagination.current_page - 1);
};
const nextPage = () => {
  if (userStore.pagination.current_page < userStore.pagination.last_page) changePage(userStore.pagination.current_page + 1);
};

// --- METHODS: MODAL ACTIONS ---
const handleAddUser = () => {
  userStore.validationErrors = {}; 
  userStore.errorMessage = null;
  formModal.open(null);
};

const handleEditUser = (user: User) => {
  userStore.validationErrors = {}; 
  userStore.errorMessage = null;
  formModal.open(user);
};

const handleViewUser = async (user: User) => {
  viewModal.open(user); // Buka langsung agar UI responsif
  const detailedUser = await userStore.fetchUserById(user.id);
  if (detailedUser) viewModal.data.value = detailedUser; // Update dengan data lengkap
};

const handleModalSubmit = async (payload: UserPayload & { pin_code?: string }) => {
  const isEditing = !!formModal.data.value;
  let success = false;
  let responseData = null;

  if (isEditing) {
    success = await userStore.updateUser(formModal.data.value!.id, payload);
  } else {
    responseData = await userStore.createUser(payload);
    success = !!responseData;
  }

  if (success) {
    formModal.close();
    
    // Auto-Logout Detection
    const isSelf = isEditing && authStore.user?.id === formModal.data.value?.id;
    const isChangingCredentials = !!payload.password || !!payload.pin_code;
    requiresRelogin.value = isSelf && isChangingCredentials;

    const isPinReset = !!payload.pin_code;
    let message = isEditing
      ? (isPinReset ? `Account for ${payload.name} updated. Please copy the NEW PIN below.` : `Account for ${payload.name} has been successfully updated.`)
      : `Account for ${payload.name} is ready. Please copy the PIN below.`;

    if (requiresRelogin.value) {
      message += ' For security reasons, your session will end and you must log in again with your new credentials.';
    }

    successModal.open({ 
      title: isEditing ? 'User Updated' : 'User Created!', 
      message, 
      pinCode: payload.pin_code || responseData?.pin_code || null, 
      username: (isPinReset || !isEditing) ? (payload.username || responseData?.username) : null 
    });
  }
};

const handleSuccessModalClose = async () => {
  successModal.close();
  if (requiresRelogin.value) {
    await authStore.logout(); 
    router.push('/login'); 
  }
};

const executeConfirmAction = async () => {
  const { type, user } = confirmModal.data.value || {};
  if (!user || !type) return;

  let success = false;
  let successTitle = '';
  let successMessage = '';

  if (type === 'deactivate') {
    success = await userStore.deactivateUser(user.id);
    successTitle = 'User Deactivated';
    successMessage = `Account for ${user.name} has been successfully deactivated.`;
  } else if (type === 'activate') {
    success = await userStore.activateUser(user.id); 
    successTitle = 'User Activated';
    successMessage = `Account for ${user.name} is now active.`;
  } else if (type === 'delete') {
    success = await userStore.deleteUser(user.id);
    successTitle = 'User Deleted';
    successMessage = `Account for ${user.name} has been permanently deleted.`;
  }

  if (success) {
    confirmModal.close();
    successModal.open({ title: successTitle, message: successMessage, pinCode: null, username: null });
    loadUsers(); 
  }
};

// --- LIFECYCLE ---
onMounted(() => {
  loadUsers();
});
</script>

<template>
  <BackofficeLayout>
    <div class="flex flex-col gap-6 pb-12">
      <!-- ... (Bagian Header & Filter tetap sama) ... -->
      <UserPageHeader @add="handleAddUser" />

      <UserFilterBar 
        v-model:search="filters.search"
        v-model:role="filters.role"
        v-model:isActive="filters.is_active"
      />

      <div class="bg-surface/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm flex flex-col relative min-h-[300px] overflow-hidden">
        <UserTable 
          :users="userStore.users"
          :is-loading="userStore.isLoading"
          :error-message="userStore.errorMessage"
          @view="handleViewUser"
          @edit="handleEditUser"
          @deactivate="id => confirmModal.open({ type: 'deactivate', user: userStore.users.find(u => u.id === id) || null })" 
          @activate="id => confirmModal.open({ type: 'activate', user: userStore.users.find(u => u.id === id) || null })" 
          @delete="id => confirmModal.open({ type: 'delete', user: userStore.users.find(u => u.id === id) || null })" 
          @retry="loadUsers"
        />

        <UserPagination 
          :current-page="userStore.pagination.current_page"
          :last-page="userStore.pagination.last_page"
          :total="userStore.pagination.total"
          @prev="prevPage"
          @next="nextPage"
        />
      </div>
    </div>

    <!-- Modals dengan pemanggilan properti yang jauh lebih bersih -->
    <UserFormModal 
      :is-open="formModal.isOpen.value"
      :is-loading="userStore.isLoading"
      :user-to-edit="formModal.data.value"
      :errors="userStore.validationErrors"
      @close="formModal.close()"
      @submit="handleModalSubmit"
    />

    <ConfirmModal
      :is-open="confirmModal.isOpen.value"
      :title="confirmTitle"
      :message="confirmMessage"
      :confirm-text="confirmText"
      :theme="confirmTheme"
      :is-loading="userStore.isLoading"
      @close="confirmModal.close()"
      @confirm="executeConfirmAction"
    />

    <SuccessModal 
      :is-open="successModal.isOpen.value"
      :title="successModal.data.value?.title || ''"
      :message="successModal.data.value?.message || ''"
      :pin-code="successModal.data.value?.pinCode || null"
      :username="successModal.data.value?.username || null"
      @close="handleSuccessModalClose" 
    />

    <UserViewModal 
      :is-open="viewModal.isOpen.value"
      :user="viewModal.data.value"
      @close="viewModal.close()"
    />
  </BackofficeLayout>
</template>