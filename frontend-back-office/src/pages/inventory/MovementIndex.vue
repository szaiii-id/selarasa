<script setup lang="ts">
import { onMounted, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useStockMovementStore } from '@/stores/stockMovementStore';
import { useRawMaterialStore } from '@/stores/rawMaterialStore';
import { useTableFilters } from '@/composables/useTableFilters';
import { useModal } from '@/composables/useModal';
import type {
  StockMovement,
  StockMovementPayload,
  StockMovementFilterState,
} from '@/types/inventory';

// ==========================================
// COMPONENTS
// ==========================================
import MovementPageHeader from '@/components/inventory/movements/MovementPageHeader.vue';
import MovementSummaryCards from '@/components/inventory/movements/MovementSummaryCards.vue';
import MovementFilterBar from '@/components/inventory/movements/MovementFilterBar.vue';
import MovementTable from '@/components/inventory/movements/MovementTable.vue';
import MovementPagination from '@/components/inventory/movements/MovementPagination.vue';
import MovementFormModal from '@/components/inventory/movements/MovementFormModal.vue';
import MovementDetailModal from '@/components/inventory/movements/MovementDetailModal.vue';
import SuccessModal from '@/components/common/SuccessModal.vue';

// ==========================================
// STORES
// ==========================================
const movementStore = useStockMovementStore();
const materialStore = useRawMaterialStore();

const { movements, isLoading, errorMessage, validationErrors, pagination } =
  storeToRefs(movementStore);

// ==========================================
// MATERIAL OPTIONS (for filter & form)
// ==========================================
const materialOptions = computed(() =>
  materialStore.materials.map((m) => ({
    value: m.id,
    label: m.name,
    sku: m.sku,
    unit: m.unit,
    currentStock: Number(m.current_stock),
    minimumStock: Number(m.minimum_stock),
    isLowStock: m.is_low_stock,
    isActive: m.is_active,
  }))
);

const loadMaterialOptions = async () => {
  if (materialStore.materials.length > 0) return; // Cached
  await materialStore.fetchMaterials({
    is_active: true,
    per_page: 100,
    page: 1,
  });
};

// ==========================================
// SUMMARY COMPUTED (page-scoped)
// ==========================================
const summary = computed(() => {
  let totalIn = 0;
  let totalOut = 0;
  let totalAdjustments = 0;

  movements.value.forEach((m) => {
    if (m.movement_type === 'IN') totalIn++;
    else if (m.movement_type === 'OUT') totalOut++;
    else if (m.movement_type === 'ADJUSTMENT') totalAdjustments++;
  });

  return {
    total: pagination.value.total,
    inToday: totalIn,
    outToday: totalOut,
    adjustments: totalAdjustments,
  };
});

// ==========================================
// FILTERS (URL-synced)
// ==========================================
const loadMovements = () => {
  movementStore.fetchMovements({
    raw_material_id: filters.raw_material_id || undefined,   // ✅ FIX: bukan filters.value.X
    movement_type: filters.movement_type || undefined,       // ✅
    start_date: filters.start_date || undefined,             // ✅
    end_date: filters.end_date || undefined,                 // ✅
    page: filters.page,                                       // ✅
    per_page: pagination.value.per_page,
  });
};

const { filters, applyFilters, changePage } = useTableFilters<StockMovementFilterState>(
  {
    raw_material_id: '',
    movement_type: '',
    start_date: '',
    end_date: '',
    page: 1,
  },
  loadMovements
);

// Watch filter changes → debounced apply
// Serialize to string so Vue compares by value (not by array reference)
watch(
  () =>
    [
      filters.raw_material_id,    // ✅ FIX
      filters.movement_type,      // ✅
      filters.start_date,         // ✅
      filters.end_date,           // ✅
    ].join('|'),
  () => applyFilters()
);

// ==========================================
// MODALS
// ==========================================
const formModal = useModal<StockMovement | null>(null);
const detailModal = useModal<StockMovement | null>(null);

const successModal = useModal({
  title: '',
  message: '',
});

// ==========================================
// PAGINATION
// ==========================================
const prevPage = () => {
  if (pagination.value.current_page > 1) {
    changePage(pagination.value.current_page - 1);
  }
};

const nextPage = () => {
  if (pagination.value.current_page < pagination.value.last_page) {
    changePage(pagination.value.current_page + 1);
  }
};

// ==========================================
// DATE PRESET HELPERS
// ==========================================
const setDatePreset = (preset: 'today' | '7d' | '30d') => {
  const today = new Date();
  const endDate = today.toISOString().slice(0, 10);
  let startDate = endDate;

  if (preset === '7d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 6);
    startDate = d.toISOString().slice(0, 10);
  } else if (preset === '30d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    startDate = d.toISOString().slice(0, 10);
  }

  filters.start_date = startDate;   // ✅ FIX
  filters.end_date = endDate;       // ✅
};

const clearDateFilter = () => {
  filters.start_date = '';          // ✅ FIX
  filters.end_date = '';            // ✅
};

// ==========================================
// ACTIONS: MODAL
// ==========================================
const handleAddMovement = async () => {
  movementStore.clearErrors();
  await loadMaterialOptions();
  formModal.open(null);
};

const handleViewMovement = (movement: StockMovement) => {
  detailModal.open(movement);
};

const handleFormSubmit = async (payload: StockMovementPayload) => {
  const success = await movementStore.createMovement(payload);

  if (success) {
    formModal.close();

    const typeLabel =
      payload.movement_type === 'IN'
        ? 'Stock In'
        : payload.movement_type === 'OUT'
        ? 'Stock Out'
        : 'Adjustment';

    successModal.open({
      title: 'Movement Recorded',
      message: `${typeLabel} of ${payload.quantity} has been recorded successfully.`,
    });

    loadMovements();
  }
};

const handleSuccessModalClose = () => {
  successModal.close();
};

// ==========================================
// LIFECYCLE
// ==========================================
onMounted(() => {
  loadMovements();
  loadMaterialOptions();
});
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">

    <!-- ========================================== -->
    <!-- PAGE HEADER                                -->
    <!-- ========================================== -->
    <MovementPageHeader @add="handleAddMovement" />

    <!-- ========================================== -->
    <!-- IMMUTABLE BANNER                           -->
    <!-- ========================================== -->
    <div class="p-4 rounded-2xl bg-info/5 border border-info/20 text-xs text-info flex gap-3">
      <span class="text-lg">🔒</span>
      <div>
        <strong class="block mb-0.5">Immutable Audit Trail</strong>
        Data mutasi tidak dapat diedit atau dihapus. Koreksi kesalahan dilakukan dengan membuat
        <strong>ADJUSTMENT</strong> baru.
      </div>
    </div>

    <!-- ========================================== -->
    <!-- SUMMARY CARDS                              -->
    <!-- ========================================== -->
    <MovementSummaryCards
      :total="summary.total"
      :in-count="summary.inToday"
      :out-count="summary.outToday"
      :adjustment-count="summary.adjustments"
    />

    <!-- ========================================== -->
    <!-- FILTER BAR                                 -->
    <!-- ========================================== -->
    <MovementFilterBar
      v-model:raw-material-id="filters.raw_material_id"
      v-model:movement-type="filters.movement_type"
      v-model:start-date="filters.start_date"
      v-model:end-date="filters.end_date"
      :material-options="materialOptions"
      @preset-today="setDatePreset('today')"
      @preset-7d="setDatePreset('7d')"
      @preset-30d="setDatePreset('30d')"
      @clear-dates="clearDateFilter"
    />

    <!-- ========================================== -->
    <!-- TABLE CARD                                 -->
    <!-- ========================================== -->
    <div class="glass rounded-3xl shadow-sm flex flex-col relative min-h-[300px] overflow-hidden">

      <MovementTable
        :movements="movements"
        :is-loading="isLoading"
        :error-message="errorMessage"
        @view="handleViewMovement"
        @retry="loadMovements"
      />

      <MovementPagination
        :current-page="pagination.current_page"
        :last-page="pagination.last_page"
        :total="pagination.total"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <!-- ========================================== -->
    <!-- FORM MODAL (CREATE ONLY)                   -->
    <!-- ========================================== -->
    <MovementFormModal
      :is-open="formModal.isOpen.value"
      :is-loading="isLoading"
      :material-options="materialOptions"
      :errors="validationErrors"
      @close="formModal.close()"
      @submit="handleFormSubmit"
    />

    <!-- ========================================== -->
    <!-- DETAIL MODAL (READ-ONLY)                   -->
    <!-- ========================================== -->
    <MovementDetailModal
      :is-open="detailModal.isOpen.value"
      :movement="detailModal.data.value"
      @close="detailModal.close()"
    />

    <!-- ========================================== -->
    <!-- SUCCESS MODAL                              -->
    <!-- ========================================== -->
    <SuccessModal
      :is-open="successModal.isOpen.value"
      :title="successModal.data.value?.title || ''"
      :message="successModal.data.value?.message || ''"
      @close="handleSuccessModalClose"
    />

  </div>
</template>