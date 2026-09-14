<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRawMaterialCategoryStore } from '@/stores/rawMaterialCategoryStore';
import { useTableFilters } from '@/composables/useTableFilters';
import { useModal } from '@/composables/useModal';
import type {
  RawMaterialCategory,
  RawMaterialCategoryPayload,
  RawMaterialCategoryFilterState,
} from '@/types/inventory';

// ==========================================
// COMPONENTS
// ==========================================
import CategoryPageHeader from '@/components/inventory/categories/CategoryPageHeader.vue';
import CategoryFilterBar from '@/components/inventory/categories/CategoryFilterBar.vue';
import CategoryTable from '@/components/inventory/categories/CategoryTable.vue';
import CategoryPagination from '@/components/inventory/categories/CategoryPagination.vue';
import CategoryFormModal from '@/components/inventory/categories/CategoryFormModal.vue';
import CategoryViewModal from '@/components/inventory/categories/CategoryViewModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import SuccessModal from '@/components/common/SuccessModal.vue';

// ==========================================
// STORES
// ==========================================
const categoryStore = useRawMaterialCategoryStore();
const { categories, isLoading, errorMessage, validationErrors, pagination } =
  storeToRefs(categoryStore);

// ==========================================
// FILTERS (URL-synced)
// ==========================================
const loadCategories = () => {
  categoryStore.fetchCategories({
    keyword: filters.keyword || undefined,   // ✅ FIX: bukan filters.value.keyword
    page: filters.page,                       // ✅ FIX: bukan filters.value.page
    per_page: pagination.value.per_page,
  });
};

const { filters, applyFilters, changePage } = useTableFilters<RawMaterialCategoryFilterState>(
  {
    keyword: '',
    page: 1,
  },
  loadCategories
);

// Watch keyword → trigger debounced filter
watch(
  () => filters.keyword,                      // ✅ FIX: bukan filters.value.keyword
  () => applyFilters()
);

// ==========================================
// MODALS
// ==========================================
const formModal = useModal<RawMaterialCategory | null>(null);
const viewModal = useModal<RawMaterialCategory | null>(null);

const confirmModal = useModal({
  category: null as RawMaterialCategory | null,
});

const successModal = useModal({
  title: '',
  message: '',
});

// ==========================================
// COMPUTED: Confirm modal content
// ==========================================
import { computed } from 'vue';

const confirmMessage = computed(() => {
  const name = confirmModal.data.value?.category?.name || 'this category';
  return `Are you sure you want to delete "${name}"? This action cannot be undone.`;
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
// ACTIONS: Modal
// ==========================================
const handleAddCategory = () => {
  categoryStore.clearErrors();
  formModal.open(null);
};

const handleEditCategory = (category: RawMaterialCategory) => {
  categoryStore.clearErrors();
  formModal.open(category);
};

const handleViewCategory = (category: RawMaterialCategory) => {
  viewModal.open(category);
};

const handleEditFromView = (category: RawMaterialCategory) => {
  viewModal.close();
  handleEditCategory(category);
};

const handleFormSubmit = async (payload: RawMaterialCategoryPayload) => {
  const isEditing = !!formModal.data.value;

  let success = false;
  if (isEditing) {
    success = await categoryStore.updateCategory(formModal.data.value!.id, payload);
  } else {
    const created = await categoryStore.createCategory(payload);
    success = !!created;
  }

  if (success) {
    const categoryName = payload.name;
    formModal.close();

    successModal.open({
      title: isEditing ? 'Category Updated' : 'Category Created',
      message: isEditing
        ? `Category "${categoryName}" has been successfully updated.`
        : `Category "${categoryName}" has been successfully created.`,
    });

    loadCategories();
  }
};

const handleDeleteClick = (category: RawMaterialCategory) => {
  confirmModal.open({ category });
};

const executeDelete = async () => {
  const category = confirmModal.data.value?.category;
  if (!category) return;

  const success = await categoryStore.deleteCategory(category.id);

  if (success) {
    confirmModal.close();
    successModal.open({
      title: 'Category Deleted',
      message: `Category "${category.name}" has been successfully deleted.`,
    });
    loadCategories();
  } else {
    confirmModal.close();
  }
};

const handleSuccessModalClose = () => {
  successModal.close();
};

// ==========================================
// LIFECYCLE
// ==========================================
onMounted(() => {
  loadCategories();
});
</script>

<template>
  <div class="flex flex-col gap-6 pb-12">

      <!-- ========================================== -->
      <!-- PAGE HEADER                                -->
      <!-- ========================================== -->
      <CategoryPageHeader @add="handleAddCategory" />

      <!-- ========================================== -->
      <!-- INFO BANNER: Restrict on Delete            -->
      <!-- ========================================== -->
      <div class="p-4 rounded-2xl bg-info/5 border border-info/20 text-xs text-info flex gap-3">
        <svg
          class="w-4 h-4 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <strong class="block mb-0.5">
            Categories cannot be deleted while they still contain raw materials.
          </strong>
          Move or delete the raw materials first before deleting this category.
        </div>
      </div>

      <!-- ========================================== -->
      <!-- FILTER BAR                                 -->
      <!-- ========================================== -->
      <CategoryFilterBar v-model:keyword="filters.keyword" />

      <!-- ========================================== -->
      <!-- TABLE CARD                                 -->
      <!-- ========================================== -->
      <div class="glass rounded-3xl shadow-sm flex flex-col relative min-h-[300px] overflow-hidden">

        <CategoryTable
          :categories="categories"
          :is-loading="isLoading"
          :error-message="errorMessage"
          @view="handleViewCategory"
          @edit="handleEditCategory"
          @delete="handleDeleteClick"
          @retry="loadCategories"
        />

        <CategoryPagination
          :current-page="pagination.current_page"
          :last-page="pagination.last_page"
          :total="pagination.total"
          @prev="prevPage"
          @next="nextPage"
        />
      </div>

      <!-- ========================================== -->
      <!-- FORM MODAL                                 -->
      <!-- ========================================== -->
      <CategoryFormModal
        :is-open="formModal.isOpen.value"
        :is-loading="isLoading"
        :category-to-edit="formModal.data.value"
        :errors="validationErrors"
        @close="formModal.close()"
        @submit="handleFormSubmit"
      />

      <!-- ========================================== -->
      <!-- VIEW MODAL                                 -->
      <!-- ========================================== -->
      <CategoryViewModal
        :is-open="viewModal.isOpen.value"
        :category="viewModal.data.value"
        @close="viewModal.close()"
        @edit="handleEditFromView"
      />

      <!-- ========================================== -->
      <!-- CONFIRM MODAL                              -->
      <!-- ========================================== -->
      <ConfirmModal
        :is-open="confirmModal.isOpen.value"
        title="Delete Category?"
        :message="confirmMessage"
        confirm-text="Yes, Delete"
        theme="danger"
        :is-loading="isLoading"
        @close="confirmModal.close()"
        @confirm="executeDelete"
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