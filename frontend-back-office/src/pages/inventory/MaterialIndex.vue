<script setup lang="ts">
import { onMounted, watch, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useRawMaterialStore } from '@/stores/rawMaterialStore';
import { useTableFilters } from '@/composables/useTableFilters';
import { useModal } from '@/composables/useModal';
import { useCategoryOptions } from '@/composables/useCategoryOptions';
import type {
  RawMaterial,
  RawMaterialPayload,
  RawMaterialFilterState,
} from '@/types/inventory';

import MaterialPageHeader from '@/components/inventory/materials/MaterialPageHeader.vue';
import MaterialSummaryCards from '@/components/inventory/materials/MaterialSummaryCards.vue';
import MaterialFilterBar from '@/components/inventory/materials/MaterialFilterBar.vue';
import MaterialTable from '@/components/inventory/materials/MaterialTable.vue';
import MaterialPagination from '@/components/inventory/materials/MaterialPagination.vue';
import MaterialFormModal from '@/components/inventory/materials/MaterialFormModal.vue';
import MaterialViewDrawer from '@/components/inventory/materials/MaterialViewDrawer.vue';
import MaterialLegend from '@/components/inventory/materials/MaterialLegend.vue';
import SuccessModal from '@/components/common/SuccessModal.vue';

const DEFAULT_PER_PAGE = 15;

// ==========================================
// STORES
// ==========================================
const materialStore = useRawMaterialStore();
const { materials, isLoading, errorMessage, validationErrors, pagination } =
  storeToRefs(materialStore);

const { options: categoryOptions, load: loadCategoryOptions } = useCategoryOptions();

// ==========================================
// SUMMARY (page-scoped)
// ==========================================
const summary = computed(() => {
  const total = pagination.value.total;
  let active = 0;
  let lowStock = 0;
  let outOfStock = 0;

  materials.value.forEach((m) => {
    if (m.is_active) active++;
    if (!m.is_active) return;
    const stock = Number(m.current_stock);
    const minimum = Number(m.minimum_stock);
    if (stock === 0) outOfStock++;
    else if (stock <= minimum) lowStock++;
  });

  return { total, active, lowStock, outOfStock };
});

// ==========================================
// FETCH CALLBACK
// ==========================================
const loadMaterials = () => {
  const params: Record<string, any> = {
    page: filters.page,
    per_page: DEFAULT_PER_PAGE,
  };

  if (filters.search) params.search = filters.search;
  if (filters.category_id !== '') params.category_id = filters.category_id;

  // Boolean filters: only send when explicitly set (not default '')
  if (filters.is_active !== '') params.is_active = filters.is_active;
  if (filters.is_low_stock !== '') params.is_low_stock = filters.is_low_stock;
  if (filters.is_out_of_stock !== '') params.is_out_of_stock = filters.is_out_of_stock;

  materialStore.fetchMaterials(params);
};

// ==========================================
// FILTERS (URL-synced, restored from URL)
// ==========================================
const { filters, applyFilters, changePage, resetFilters } = useTableFilters<RawMaterialFilterState>(
  {
    search: '',
    category_id: '',
    is_active: '',
    is_low_stock: '',
    is_out_of_stock: '',
    page: 1,
  },
  loadMaterials
);

// ==========================================
// WATCH: DEBOUNCED FILTER APPLY
// ==========================================
// Serialize filter values to a string so Vue compares by value,
// not by array reference (which always differs → infinite loop).
watch(
  () =>
    [
      filters.search,
      filters.category_id,
      filters.is_active,
      filters.is_low_stock,
      filters.is_out_of_stock,
    ].join('|'),
  () => applyFilters()
);

// ==========================================
// MODALS
// ==========================================
const formModal = useModal<RawMaterial | null>(null);
const drawer = useModal<RawMaterial | null>(null);
const successModal = useModal({ title: '', message: '' });

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
// STOCK FILTER (batched mutation)
// ==========================================
const handleStockFilterChange = (value: '' | 'low_stock' | 'out_of_stock') => {
  // Single-pass assignment — Vue batches these into one reactive update,
  // so the watcher fires only once.
  filters.is_low_stock = value === 'low_stock' ? true : '';
  filters.is_out_of_stock = value === 'out_of_stock' ? true : '';
};

// ==========================================
// MATERIAL ACTIONS
// ==========================================
const handleAddMaterial = async () => {
  materialStore.clearErrors();
  await loadCategoryOptions();
  formModal.open(null);
};

const handleEditMaterial = async (material: RawMaterial) => {
  materialStore.clearErrors();
  await loadCategoryOptions();
  formModal.open(material);
};

const handleViewMaterial = (material: RawMaterial) => {
  drawer.open(material);
};

const handleFormSubmit = async (payload: RawMaterialPayload) => {
  const isEditing = !!formModal.data.value;

  let success = false;
  if (isEditing) {
    success = await materialStore.updateMaterial(formModal.data.value!.id, payload);
  } else {
    const created = await materialStore.createMaterial(payload);
    success = !!created;
  }

  if (success) {
    const materialName = payload.name;
    formModal.close();

    successModal.open({
      title: isEditing ? 'Material Updated' : 'Material Created',
      message: isEditing
        ? `Material "${materialName}" has been successfully updated.`
        : `Material "${materialName}" has been successfully created with 0 stock. Use Stock Movements to add stock.`,
    });

    loadMaterials();
  }
};

const handleSuccessModalClose = () => {
  successModal.close();
};

// ==========================================
// LIFECYCLE
// ==========================================
onMounted(() => {
  // Filters are already hydrated from URL inside useTableFilters.
  // Just trigger the initial fetch.
  loadMaterials();
  loadCategoryOptions();
});
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">

    <!-- ========================================== -->
    <!-- PAGE HEADER                                -->
    <!-- ========================================== -->
    <MaterialPageHeader
      :low-stock-count="summary.lowStock"
      @add="handleAddMaterial"
    />

    <!-- ========================================== -->
    <!-- SUMMARY CARDS                              -->
    <!-- ========================================== -->
    <MaterialSummaryCards
      :total="summary.total"
      :active="summary.active"
      :low-stock="summary.lowStock"
      :out-of-stock="summary.outOfStock"
    />

    <!-- ========================================== -->
    <!-- FILTER BAR                                 -->
    <!-- ========================================== -->
    <MaterialFilterBar
      :search="filters.search"
      :category-id="filters.category_id"
      :is-active="filters.is_active"
      :is-low-stock="filters.is_low_stock"
      :is-out-of-stock="filters.is_out_of_stock"
      :category-options="categoryOptions"
      @update:search="(val: string) => filters.search = val"
      @update:category-id="(val: number | '') => filters.category_id = val"
      @update:is-active="(val: boolean | '') => filters.is_active = val"
      @update:stock-filter="handleStockFilterChange"
    />

    <!-- ========================================== -->
    <!-- TABLE CARD                                 -->
    <!-- ========================================== -->
    <div class="glass rounded-3xl shadow-sm flex flex-col relative min-h-[300px] overflow-hidden">

      <MaterialTable
        :materials="materials"
        :is-loading="isLoading"
        :error-message="errorMessage"
        @view="handleViewMaterial"
        @edit="handleEditMaterial"
        @retry="loadMaterials"
      />

      <MaterialPagination
        :current-page="pagination.current_page"
        :last-page="pagination.last_page"
        :total="pagination.total"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <!-- ========================================== -->
    <!-- LEGEND                                     -->
    <!-- ========================================== -->
    <MaterialLegend />

    <!-- ========================================== -->
    <!-- FORM MODAL                                 -->
    <!-- ========================================== -->
    <MaterialFormModal
      :is-open="formModal.isOpen.value"
      :is-loading="isLoading"
      :material-to-edit="formModal.data.value"
      :category-options="categoryOptions"
      :errors="validationErrors"
      @close="formModal.close()"
      @submit="handleFormSubmit"
    />

    <!-- ========================================== -->
    <!-- VIEW DRAWER                                -->
    <!-- ========================================== -->
    <MaterialViewDrawer
      :is-open="drawer.isOpen.value"
      :material="drawer.data.value"
      @close="drawer.close()"
      @edit="(mat) => { drawer.close(); handleEditMaterial(mat); }"
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