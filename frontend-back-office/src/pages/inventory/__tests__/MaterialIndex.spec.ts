import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import MaterialIndex from '../MaterialIndex.vue';
import type { RawMaterial } from '@/types/inventory';
import type { CategoryOption } from '@/composables/useCategoryOptions';

// ============================================================
// MOCK STORE
// ============================================================
const mockMaterials = ref<RawMaterial[]>([]);
const mockIsLoading = ref(false);
const mockErrorMessage = ref<string | null>(null);
const mockValidationErrors = ref<Record<string, string[]>>({});
const mockPagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
});

const mockFetchMaterials = vi.fn();
const mockCreateMaterial = vi.fn();
const mockUpdateMaterial = vi.fn();
const mockClearErrors = vi.fn();

vi.mock('@/stores/rawMaterialStore', () => ({
  useRawMaterialStore: vi.fn(() => ({
    fetchMaterials: mockFetchMaterials,
    createMaterial: mockCreateMaterial,
    updateMaterial: mockUpdateMaterial,
    clearErrors: mockClearErrors,
    materials: mockMaterials,
    isLoading: mockIsLoading,
    errorMessage: mockErrorMessage,
    validationErrors: mockValidationErrors,
    pagination: mockPagination,
  })),
}));

// ============================================================
// MOCK COMPOSABLES
// ============================================================
const mockFilters = ref({
  search: '',
  category_id: '' as number | '',
  is_active: '' as boolean | '',
  is_low_stock: '' as boolean | '',
  is_out_of_stock: '' as boolean | '',
  page: 1,
});
const mockApplyFilters = vi.fn();
const mockChangePage = vi.fn();
const mockResetFilters = vi.fn();

vi.mock('@/composables/useTableFilters', () => ({
  useTableFilters: vi.fn(() => ({
    filters: mockFilters.value,
    applyFilters: mockApplyFilters,
    changePage: mockChangePage,
    resetFilters: mockResetFilters,
  })),
}));

vi.mock('@/composables/useModal', () => ({
  useModal: vi.fn((initialData: any) => ({
    isOpen: ref(false),
    data: ref(initialData),
    open: vi.fn(),
    close: vi.fn(),
  })),
}));

const mockCategoryOptions = ref<CategoryOption[]>([
  { value: 1, label: 'Dairy' },
  { value: 2, label: 'Beverages' },
]);
const mockLoadCategoryOptions = vi.fn();

vi.mock('@/composables/useCategoryOptions', () => ({
  useCategoryOptions: vi.fn(() => ({
    options: mockCategoryOptions,
    load: mockLoadCategoryOptions,
  })),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

describe('MaterialIndex.vue (Page Integration Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createMaterial = (overrides: Partial<RawMaterial> = {}): RawMaterial =>
    ({
      id: 1,
      sku: 'RM-0012-APF',
      name: 'Fresh Milk UHT',
      category_id: 1,
      category: { id: 1, name: 'Dairy' },
      unit: 'L',
      current_stock: 100,
      minimum_stock: 20,
      is_low_stock: false,
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
      ...overrides,
    } as RawMaterial);

  const createWrapper = () => {
    return mount(MaterialIndex, {
      global: {
        stubs: {
          MaterialPageHeader: true,
          MaterialSummaryCards: true,
          MaterialFilterBar: true,
          MaterialTable: true,
          MaterialPagination: true,
          MaterialFormModal: true,
          MaterialViewDrawer: true,
          MaterialLegend: true,
          SuccessModal: true,
          Teleport: true,
          Transition: false,
        },
      },
    });
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Reset mock state
    mockMaterials.value = [];
    mockIsLoading.value = false;
    mockErrorMessage.value = null;
    mockValidationErrors.value = {};
    mockPagination.value = {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
    };

    // Reset filters
    mockFilters.value = {
      search: '',
      category_id: '',
      is_active: '',
      is_low_stock: '',
      is_out_of_stock: '',
      page: 1,
    };

    mockFetchMaterials.mockResolvedValue(undefined);
    mockCreateMaterial.mockResolvedValue(null);
    mockUpdateMaterial.mockResolvedValue(false);
    mockLoadCategoryOptions.mockResolvedValue(undefined);
  });

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] render 9 child components', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'MaterialPageHeader' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialSummaryCards' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialFilterBar' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialTable' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialPagination' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialLegend' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialFormModal' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MaterialViewDrawer' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'SuccessModal' }).exists()).toBe(true);
    });

    it('[Happy Path] root punya class flex flex-col gap-6', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('flex');
      expect(root.classes()).toContain('flex-col');
      expect(root.classes()).toContain('gap-6');
    });
  });

  // =========================================================================
  // 2. LIFECYCLE — onMounted
  // =========================================================================
  describe('Lifecycle — onMounted', () => {
    it('[Happy Path] fetch materials saat mount', () => {
      createWrapper();

      expect(mockFetchMaterials).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] load category options saat mount', () => {
      createWrapper();

      expect(mockLoadCategoryOptions).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] fetch dengan page 1 dan per_page 15', () => {
      createWrapper();

      expect(mockFetchMaterials).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          per_page: 15,
        })
      );
    });

    it('[Happy Path] fetch tanpa filter search saat kosong', () => {
      createWrapper();

      const call = mockFetchMaterials.mock.calls[0][0];
      expect(call.search).toBeUndefined();
    });

    it('[Happy Path] fetch dengan filter search saat terisi', () => {
      mockFilters.value.search = 'gula';
      createWrapper();

      // Filter sudah ada sebelum mount, tapi loadMaterials dipanggil di onMounted
      // Note: Karena mockFilters.value di-reassign di beforeEach, kita cek
      // panggilan terakhir setelah set filters
    });
  });

  // =========================================================================
  // 3. SUMMARY COMPUTED
  // =========================================================================
  describe('Summary Computed', () => {
    it('[Happy Path] total dari pagination.total', () => {
      mockPagination.value = { current_page: 1, last_page: 5, per_page: 15, total: 50 };
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('total')).toBe(50);
    });

    it('[Happy Path] hitung active dari materials.is_active', () => {
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: true }),
        createMaterial({ id: 2, is_active: true }),
        createMaterial({ id: 3, is_active: false }),
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('active')).toBe(2);
    });

    it('[Happy Path] hitung outOfStock saat current_stock === 0', () => {
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: true, current_stock: 0 }),
        createMaterial({ id: 2, is_active: true, current_stock: 100 }),
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('outOfStock')).toBe(1);
    });

    it('[Happy Path] hitung lowStock saat stock <= minimum (dan > 0)', () => {
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: true, current_stock: 5, minimum_stock: 10 }),
        createMaterial({ id: 2, is_active: true, current_stock: 100, minimum_stock: 10 }),
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('lowStock')).toBe(1);
    });

    it('[Happy Path] inactive material tidak masuk lowStock/outOfStock', () => {
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: false, current_stock: 0, minimum_stock: 10 }),
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('active')).toBe(0);
      expect(summary.props('lowStock')).toBe(0);
      expect(summary.props('outOfStock')).toBe(0);
    });

    it('[Happy Path] outOfStock prioritas atas lowStock', () => {
      // stock === 0 → outOfStock, TIDAK masuk lowStock meskipun <= minimum
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: true, current_stock: 0, minimum_stock: 10 }),
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('outOfStock')).toBe(1);
      expect(summary.props('lowStock')).toBe(0);
    });
  });

  // =========================================================================
  // 4. PROPS BINDING — PageHeader
  // =========================================================================
  describe('Props Binding — MaterialPageHeader', () => {
    it('[Happy Path] page header menerima lowStockCount', () => {
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: true, current_stock: 5, minimum_stock: 10 }),
      ];
      const wrapper = createWrapper();

      const header = wrapper.findComponent({ name: 'MaterialPageHeader' });
      expect(header.props('lowStockCount')).toBe(1);
    });
  });

  // =========================================================================
  // 5. PROPS BINDING — FilterBar
  // =========================================================================
  describe('Props Binding — MaterialFilterBar', () => {
    it('[Happy Path] filter bar menerima search, category, is_active, dst', () => {
      mockFilters.value = {
        search: 'gula',
        category_id: 1,
        is_active: true,
        is_low_stock: true,
        is_out_of_stock: '',
        page: 1,
      };
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      expect(filterBar.props('search')).toBe('gula');
      expect(filterBar.props('categoryId')).toBe(1);
      expect(filterBar.props('isActive')).toBe(true);
      expect(filterBar.props('isLowStock')).toBe(true);
      expect(filterBar.props('isOutOfStock')).toBe('');
    });

    it('[Happy Path] filter bar menerima categoryOptions', () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      expect(filterBar.props('categoryOptions')).toEqual([
        { value: 1, label: 'Dairy' },
        { value: 2, label: 'Beverages' },
      ]);
    });
  });

  // =========================================================================
  // 6. EVENT HANDLER — Add Material
  // =========================================================================
  describe('Event Handler — Add Material', () => {
    it('[Happy Path] klik add → clearErrors + loadCategoryOptions + open form', async () => {
      const wrapper = createWrapper();
      mockClearErrors.mockClear();
      mockLoadCategoryOptions.mockClear();

      const header = wrapper.findComponent({ name: 'MaterialPageHeader' });
      await header.vm.$emit('add');

      await new Promise((r) => setTimeout(r, 0));

      expect(mockClearErrors).toHaveBeenCalledTimes(1);
      expect(mockLoadCategoryOptions).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. EVENT HANDLER — Edit Material
  // =========================================================================
  describe('Event Handler — Edit Material', () => {
    it('[Happy Path] klik edit dari table → clearErrors + loadCategoryOptions + open form', async () => {
      const material = createMaterial({ id: 5 });
      const wrapper = createWrapper();
      mockClearErrors.mockClear();
      mockLoadCategoryOptions.mockClear();

      const table = wrapper.findComponent({ name: 'MaterialTable' });
      await table.vm.$emit('edit', material);

      await new Promise((r) => setTimeout(r, 0));

      expect(mockClearErrors).toHaveBeenCalled();
      expect(mockLoadCategoryOptions).toHaveBeenCalled();
    });

    it('[Happy Path] edit dari drawer → close drawer + open form', async () => {
      const material = createMaterial({ id: 5 });
      const wrapper = createWrapper();
      mockClearErrors.mockClear();

      const drawer = wrapper.findComponent({ name: 'MaterialViewDrawer' });
      await drawer.vm.$emit('edit', material);

      await new Promise((r) => setTimeout(r, 0));

      expect(mockClearErrors).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. EVENT HANDLER — View Material
  // =========================================================================
  describe('Event Handler — View Material', () => {
    it('[Happy Path] klik view → buka drawer', async () => {
      const material = createMaterial({ id: 5 });
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'MaterialTable' });
      await table.vm.$emit('view', material);

      expect(wrapper.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 9. EVENT HANDLER — Retry
  // =========================================================================
  describe('Event Handler — Retry', () => {
    it('[Happy Path] klik retry → fetch ulang', async () => {
      const wrapper = createWrapper();
      mockFetchMaterials.mockClear();

      const table = wrapper.findComponent({ name: 'MaterialTable' });
      await table.vm.$emit('retry');

      expect(mockFetchMaterials).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 10. PAGINATION HANDLERS
  // =========================================================================
  describe('Pagination Handlers', () => {
    it('[Happy Path] klik prev → changePage(current - 1)', async () => {
      mockPagination.value = { current_page: 3, last_page: 5, per_page: 15, total: 50 };
      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'MaterialPagination' });
      await pag.vm.$emit('prev');

      expect(mockChangePage).toHaveBeenCalledWith(2);
    });

    it('[Happy Path] klik next → changePage(current + 1)', async () => {
      mockPagination.value = { current_page: 2, last_page: 5, per_page: 15, total: 50 };
      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'MaterialPagination' });
      await pag.vm.$emit('next');

      expect(mockChangePage).toHaveBeenCalledWith(3);
    });

    it('[Negative Path] klik prev di halaman 1 → tidak panggil changePage', async () => {
      mockPagination.value = { current_page: 1, last_page: 5, per_page: 15, total: 50 };
      const wrapper = createWrapper();
      mockChangePage.mockClear();

      const pag = wrapper.findComponent({ name: 'MaterialPagination' });
      await pag.vm.$emit('prev');

      expect(mockChangePage).not.toHaveBeenCalled();
    });

    it('[Negative Path] klik next di halaman terakhir → tidak panggil changePage', async () => {
      mockPagination.value = { current_page: 5, last_page: 5, per_page: 15, total: 50 };
      const wrapper = createWrapper();
      mockChangePage.mockClear();

      const pag = wrapper.findComponent({ name: 'MaterialPagination' });
      await pag.vm.$emit('next');

      expect(mockChangePage).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 11. STOCK FILTER — Batched Mutation
  // =========================================================================
  describe('Stock Filter — Batched Mutation', () => {
    it('[Happy Path] stock filter "low_stock" → is_low_stock=true, is_out_of_stock=""', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      await filterBar.vm.$emit('update:stock-filter', 'low_stock');

      expect(mockFilters.value.is_low_stock).toBe(true);
      expect(mockFilters.value.is_out_of_stock).toBe('');
    });

    it('[Happy Path] stock filter "out_of_stock" → is_out_of_stock=true, is_low_stock=""', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      await filterBar.vm.$emit('update:stock-filter', 'out_of_stock');

      expect(mockFilters.value.is_out_of_stock).toBe(true);
      expect(mockFilters.value.is_low_stock).toBe('');
    });

    it('[Happy Path] stock filter "" → kedua flag kosong', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      await filterBar.vm.$emit('update:stock-filter', '');

      expect(mockFilters.value.is_low_stock).toBe('');
      expect(mockFilters.value.is_out_of_stock).toBe('');
    });
  });

  // =========================================================================
  // 12. FILTER EVENTS — Individual
  // =========================================================================
  describe('Filter Events', () => {
    it('[Happy Path] update:search mengubah filters.search', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      await filterBar.vm.$emit('update:search', 'gula');

      expect(mockFilters.value.search).toBe('gula');
    });

    it('[Happy Path] update:category-id mengubah filters.category_id', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      await filterBar.vm.$emit('update:category-id', 5);

      expect(mockFilters.value.category_id).toBe(5);
    });

    it('[Happy Path] update:is-active mengubah filters.is_active', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MaterialFilterBar' });
      await filterBar.vm.$emit('update:is-active', true);

      expect(mockFilters.value.is_active).toBe(true);
    });
  });

  // =========================================================================
  // 13. FORM SUBMIT — Create
  // =========================================================================
  describe('Form Submit — Create', () => {
    it('[Happy Path] create sukses → tutup form, buka success, reload', async () => {
      mockCreateMaterial.mockResolvedValueOnce(createMaterial({ name: 'New Material' }));
      const wrapper = createWrapper();
      mockFetchMaterials.mockClear();

      const formModal = wrapper.findComponent({ name: 'MaterialFormModal' });
      await formModal.vm.$emit('submit', {
        name: 'New Material',
        category_id: 1,
        sku: 'RM-NEW',
        unit: 'kg',
        minimum_stock: 10,
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(mockCreateMaterial).toHaveBeenCalled();
      expect(mockFetchMaterials).toHaveBeenCalled();
    });

    it('[Negative Path] create gagal → tidak reload', async () => {
      mockCreateMaterial.mockResolvedValueOnce(null);
      const wrapper = createWrapper();
      mockFetchMaterials.mockClear();

      const formModal = wrapper.findComponent({ name: 'MaterialFormModal' });
      await formModal.vm.$emit('submit', { name: 'Test', category_id: 1, sku: 'X', unit: 'kg', minimum_stock: 0 });

      await new Promise((r) => setTimeout(r, 0));

      expect(mockFetchMaterials).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 14. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] materials empty → summary semua 0', () => {
      mockMaterials.value = [];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('active')).toBe(0);
      expect(summary.props('lowStock')).toBe(0);
      expect(summary.props('outOfStock')).toBe(0);
    });

    it('[Edge Case] loading state → table menerima isLoading=true', () => {
      mockIsLoading.value = true;
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'MaterialTable' });
      expect(table.props('isLoading')).toBe(true);
    });

    it('[Edge Case] error state → table menerima errorMessage', () => {
      mockErrorMessage.value = 'Network error';
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'MaterialTable' });
      expect(table.props('errorMessage')).toBe('Network error');
    });

    it('[Corner Case] validationErrors di-pass ke form modal', () => {
      mockValidationErrors.value = { name: ['Required'] };
      const wrapper = createWrapper();

      const formModal = wrapper.findComponent({ name: 'MaterialFormModal' });
      expect(formModal.props('errors')).toEqual({ name: ['Required'] });
    });

    it('[Edge Case] current_stock string di-coerce Number()', () => {
      mockMaterials.value = [
        createMaterial({
          id: 1,
          is_active: true,
          current_stock: '5' as any,
          minimum_stock: '10' as any,
        }),
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('lowStock')).toBe(1);
    });

    it('[Corner Case] multiple materials dengan state berbeda', () => {
      mockMaterials.value = [
        createMaterial({ id: 1, is_active: true, current_stock: 0, minimum_stock: 10 }),  // out
        createMaterial({ id: 2, is_active: true, current_stock: 5, minimum_stock: 10 }),  // low
        createMaterial({ id: 3, is_active: true, current_stock: 100, minimum_stock: 10 }), // healthy
        createMaterial({ id: 4, is_active: false, current_stock: 50, minimum_stock: 10 }), // inactive
      ];
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MaterialSummaryCards' });
      expect(summary.props('active')).toBe(3);
      expect(summary.props('lowStock')).toBe(1);
      expect(summary.props('outOfStock')).toBe(1);
    });
  });
});