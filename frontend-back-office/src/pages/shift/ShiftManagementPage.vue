<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import BackofficeLayout from '@/layouts/BackofficeLayout.vue';
import { useShiftStore } from '@/stores/shiftStore';
import { useModal } from '@/composables/useModal';
import type { MasterShift, CashierShift, ForceClosePayload } from '@/types/shift';

import MasterShiftTable from '@/components/shift/MasterShiftTable.vue';
import CashierShiftTable from '@/components/shift/CashierShiftTable.vue';
import MasterShiftFormModal from '@/components/shift/MasterShiftFormModal.vue';
import ForceCloseModal from '@/components/shift/ForceCloseModal.vue';
import SuccessModal from '@/components/common/SuccessModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';

const shiftStore = useShiftStore();

const activeTab = ref<'master' | 'cashier'>('master');

const formModal = useModal<MasterShift | null>(null);
const successModal = useModal({ title: '', message: '' });
const confirmModal = useModal({ type: 'delete' as 'delete', shift: null as MasterShift | null });
const forceCloseModal = useModal<CashierShift | null>(null);

const confirmTitle = computed(() => 'Delete Master Shift?');

const confirmMessage = computed(() => {
  const name = confirmModal.data.value?.shift?.name || 'this shift';
  return `Are you sure you want to PERMANENTLY delete "${name}"? This action cannot be undone.`;
});

const loadMasterShifts = () => {
  shiftStore.fetchMasterShifts();
};

const loadCashierShifts = () => {
  shiftStore.fetchCashierShifts();
};

const switchTab = (tab: 'master' | 'cashier') => {
  activeTab.value = tab;
  if (tab === 'master') {
    loadMasterShifts();
  } else {
    loadCashierShifts();
  }
};

const handleAddShift = () => {
  shiftStore.validationErrors = {}; 
  shiftStore.errorMessage = null;
  formModal.open(null);
};

const handleEditShift = (shift: MasterShift) => {
  shiftStore.validationErrors = {}; 
  shiftStore.errorMessage = null;
  formModal.open(shift);
};

const handleModalSubmit = async (payload: Partial<MasterShift>) => {
  const isEditing = !!formModal.data.value;
  let success = false;

  if (isEditing) {
    success = await shiftStore.updateMasterShift(formModal.data.value!.id, payload);
  } else {
    success = await shiftStore.createMasterShift(payload);
  }

  if (success) {
    formModal.close();
    
    const actionText = isEditing ? 'updated' : 'created';
    successModal.open({ 
      title: isEditing ? 'Shift Updated' : 'Shift Created', 
      message: `The master shift "${payload.name}" has been successfully ${actionText}.`
    });
  }
};

const executeConfirmAction = async () => {
  const { type, shift } = confirmModal.data.value || {};
  if (!shift || type !== 'delete') return;

  const success = await shiftStore.deleteMasterShift(shift.id);

  if (success) {
    confirmModal.close();
    successModal.open({ 
      title: 'Shift Deleted', 
      message: `The master shift "${shift.name}" has been permanently deleted.` 
    });
    loadMasterShifts(); 
  }
};

const handleForceClose = (shift: CashierShift) => {
  shiftStore.validationErrors = {};
  shiftStore.errorMessage = null;
  forceCloseModal.open(shift);
};

const handleForceCloseSubmit = async (payload: ForceClosePayload) => {
  const shift = forceCloseModal.data.value;
  if (!shift) return;

  const success = await shiftStore.forceCloseShift(shift.id, payload);

  if (success) {
    forceCloseModal.close();
    successModal.open({ 
      title: 'Shift Force Closed', 
      message: `The shift for "${shift.user?.name || 'cashier'}" has been forcefully closed.` 
    });
    loadCashierShifts();
  }
};

onMounted(() => {
  loadMasterShifts();
});
</script>

<template>
  <BackofficeLayout>
    <div class="flex flex-col gap-6 pb-12">
      
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface p-6 rounded-3xl border border-custom-border shadow-sm">
        <div>
          <h1 class="text-2xl font-bold text-text-primary">Shift Management</h1>
          <p class="text-sm text-text-secondary mt-1">Manage master shifts and monitor cashier shift sessions.</p>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="bg-surface rounded-2xl shadow-sm border border-custom-border p-1.5 flex gap-1.5">
        <button 
          @click="switchTab('master')"
          class="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          :class="activeTab === 'master' 
            ? 'bg-primary text-white shadow-md' 
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary'"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Master Shifts
          </div>
        </button>
        
        <button 
          @click="switchTab('cashier')"
          class="flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all"
          :class="activeTab === 'cashier' 
            ? 'bg-primary text-white shadow-md' 
            : 'text-text-secondary hover:bg-white/50 hover:text-text-primary'"
        >
          <div class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Cashier Shifts
          </div>
        </button>
      </div>

      <!-- Tab Content: Master Shifts -->
      <div v-if="activeTab === 'master'" class="bg-surface/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm flex flex-col relative min-h-[300px] overflow-hidden">
        
        <div class="px-6 py-4 border-b border-custom-border flex justify-between items-center bg-surface/60">
          <p class="text-sm font-semibold text-text-secondary">Total: {{ shiftStore.masterShifts.length }} master shifts</p>
          <button 
            @click="handleAddShift"
            class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary/20 flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add New Shift
          </button>
        </div>

        <MasterShiftTable 
          :shifts="shiftStore.masterShifts"
          :is-loading="shiftStore.isLoading"
          :error-message="shiftStore.errorMessage"
          @edit="handleEditShift"
          @delete="shift => confirmModal.open({ type: 'delete', shift })" 
          @retry="loadMasterShifts"
        />
      </div>

      <!-- Tab Content: Cashier Shifts -->
      <div v-if="activeTab === 'cashier'" class="bg-surface/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-sm flex flex-col relative min-h-[300px] overflow-hidden">
        
        <CashierShiftTable 
          :shifts="shiftStore.shiftHistory"
          :is-loading="shiftStore.isLoading"
          :error-message="shiftStore.errorMessage"
          :pagination="shiftStore.pagination"
          @force-close="handleForceClose"
          @retry="loadCashierShifts"
          @page-change="(page) => shiftStore.fetchCashierShifts({ page })"
          @filter-change="(filters) => shiftStore.fetchCashierShifts(filters)"
        />
      </div>
    </div>

    <!-- Modals -->
    <MasterShiftFormModal 
      :is-open="formModal.isOpen.value"
      :is-loading="shiftStore.isLoading"
      :shift-to-edit="formModal.data.value"
      :errors="shiftStore.validationErrors"
      @close="formModal.close()"
      @submit="handleModalSubmit"
    />

    <ForceCloseModal
      :is-open="forceCloseModal.isOpen.value"
      :is-loading="shiftStore.isLoading"
      :shift="forceCloseModal.data.value"
      :errors="shiftStore.validationErrors"
      @close="forceCloseModal.close()"
      @submit="handleForceCloseSubmit"
    />

    <ConfirmModal
      :is-open="confirmModal.isOpen.value"
      :title="confirmTitle"
      :message="confirmMessage"
      confirm-text="Yes, Delete"
      theme="danger"
      :is-loading="shiftStore.isLoading"
      @close="confirmModal.close()"
      @confirm="executeConfirmAction"
    />

    <SuccessModal 
      :is-open="successModal.isOpen.value"
      :title="successModal.data.value?.title || ''"
      :message="successModal.data.value?.message || ''"
      @close="successModal.close()" 
    />
    
  </BackofficeLayout>
</template>