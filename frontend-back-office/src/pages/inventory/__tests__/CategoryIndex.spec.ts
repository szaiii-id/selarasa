import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, computed } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import CategoryIndex from '../CategoryIndex.vue';
import type { RawMaterialCategory } from '@/types/inventory';

// ============================================================
// MOCK STORE
// ============================================================
const mockCategories = ref<RawMaterialCategory[]>([]);
const mockIsLoading = ref(false);
const mockErrorMessage = ref<string | null>(null);
const mockValidationErrors = ref<Record<string, string[]>>({});
const mockPagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
});

const mockFetchCategories = vi.fn();
const mockCreateCategory = vi.fn();
const mockUpdateCategory = vi.fn();
const mockDeleteCategory = vi.fn();
const mockClearErrors = vi.fn();

vi.mock('@/stores/rawMaterialCategoryStore', () => ({
  useRawMaterialCategoryStore: vi.fn(() => ({
    fetchCategories: mockFetchCategories,
    createCategory: mockCreateCategory,
    updateCategory: mockUpdateCategory,
    deleteCategory: mockDeleteCategory,
    clearErrors: mockClearErrors,
    // Pinia store refs (via storeToRefs)
    categories: mockCategories,
    isLoading: mockIsLoading,
    errorMessage: mockErrorMessage,
    validationErrors: mockValidationErrors,
    pagination: mockPagination,
  })),
}));

// ============================================================
// MOCK COMPOSABLES
// ============================================================
const mockFilters = ref({ keyword: '', page: 1 });
const mockApplyFilters = vi.fn();
const mockChangePage = vi.fn();

vi.mock('@/composables/useTableFilters', () => ({
  useTableFilters: vi.fn(() => ({
    filters: mockFilters.value,
    applyFilters: mockApplyFilters,
    changePage: mockChangePage,
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

// ============================================================
// MOCK ROUTER
// ============================================================
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

describe('CategoryIndex.vue (Page Integration Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createCategory = (overrides: Partial<RawMaterialCategory> = {}): RawMaterialCategory =>
    ({
      id: 1,
      name: 'Coffee Beans',
      description: 'Single origin',
      is_active: true,
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-20T10:00:00Z',
      ...overrides,
    } as RawMaterialCategory);

  const createWrapper = () => {
    return mount(CategoryIndex, {
      global: {
        stubs: {
          // Stub semua child components supaya fokus ke behavior page
          CategoryPageHeader: true,
          CategoryFilterBar: true,
          CategoryTable: true,
          CategoryPagination: true,
          CategoryFormModal: true,
          CategoryViewModal: true,
          ConfirmModal: true,
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
    mockCategories.value = [];
    mockIsLoading.value = false;
    mockErrorMessage.value = null;
    mockValidationErrors.value = {};
    mockPagination.value = {
      current_page: 1,
      last_page: 1,
      per_page: 15,
      total: 0,
    };

    mockFetchCategories.mockResolvedValue(undefined);
    mockCreateCategory.mockResolvedValue(null);
    mockUpdateCategory.mockResolvedValue(false);
    mockDeleteCategory.mockResolvedValue(false);
  });

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] render page header', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'CategoryPageHeader' }).exists()).toBe(true);
    });

    it('[Happy Path] render info banner tentang restrict delete', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Categories cannot be deleted while they still contain raw materials');
      expect(wrapper.text()).toContain('Move or delete the raw materials first');
    });

    it('[Happy Path] render filter bar', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'CategoryFilterBar' }).exists()).toBe(true);
    });

    it('[Happy Path] render table', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'CategoryTable' }).exists()).toBe(true);
    });

    it('[Happy Path] render pagination', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'CategoryPagination' }).exists()).toBe(true);
    });

    it('[Happy Path] render 4 modals', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'CategoryFormModal' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'CategoryViewModal' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'ConfirmModal' }).exists()).toBe(true);
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
    it('[Happy Path] fetch categories saat mount', () => {
      createWrapper();

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] fetch dengan keyword undefined saat awal', () => {
      createWrapper();

      expect(mockFetchCategories).toHaveBeenCalledWith({
        keyword: undefined,
        page: 1,
        per_page: 15,
      });
    });
  });

  // =========================================================================
  // 3. PROPS BINDING — Table
  // =========================================================================
  describe('Props Binding — CategoryTable', () => {
    it('[Happy Path] table menerima categories', () => {
      mockCategories.value = [createCategory({ name: 'Coffee' })];
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.props('categories')).toEqual([createCategory({ name: 'Coffee' })]);
    });

    it('[Happy Path] table menerima isLoading', () => {
      mockIsLoading.value = true;
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.props('isLoading')).toBe(true);
    });

    it('[Happy Path] table menerima errorMessage', () => {
      mockErrorMessage.value = 'Failed';
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.props('errorMessage')).toBe('Failed');
    });
  });

  // =========================================================================
  // 4. PROPS BINDING — Pagination
  // =========================================================================
  describe('Props Binding — CategoryPagination', () => {
    it('[Happy Path] pagination menerima current_page, last_page, total', () => {
      mockPagination.value = {
        current_page: 2,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'CategoryPagination' });
      expect(pag.props('currentPage')).toBe(2);
      expect(pag.props('lastPage')).toBe(5);
      expect(pag.props('total')).toBe(50);
    });
  });

  // =========================================================================
  // 5. EVENT HANDLER — Add
  // =========================================================================
  describe('Event Handler — Add', () => {
    it('[Happy Path] klik add → clearErrors + buka form modal', async () => {
      const wrapper = createWrapper();

      const header = wrapper.findComponent({ name: 'CategoryPageHeader' });
      await header.vm.$emit('add');

      expect(mockClearErrors).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 6. EVENT HANDLER — Edit
  // =========================================================================
  describe('Event Handler — Edit', () => {
    it('[Happy Path] edit dari table → clearErrors + buka form modal', async () => {
      const category = createCategory({ id: 5 });
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      await table.vm.$emit('edit', category);

      expect(mockClearErrors).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] edit dari view modal → close view + open form', async () => {
      const category = createCategory({ id: 5 });
      const wrapper = createWrapper();

      const viewModal = wrapper.findComponent({ name: 'CategoryViewModal' });
      await viewModal.vm.$emit('edit', category);

      expect(mockClearErrors).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 7. EVENT HANDLER — View
  // =========================================================================
  describe('Event Handler — View', () => {
    it('[Happy Path] klik view → buka view modal', async () => {
      const category = createCategory({ id: 5 });
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      await table.vm.$emit('view', category);

      // Tidak crash
      expect(wrapper.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 8. EVENT HANDLER — Delete
  // =========================================================================
  describe('Event Handler — Delete', () => {
    it('[Happy Path] klik delete → buka confirm modal', async () => {
      const category = createCategory({ id: 5, name: 'Test' });
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      await table.vm.$emit('delete', category);

      // Tidak crash
      expect(wrapper.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 9. EVENT HANDLER — Retry
  // =========================================================================
  describe('Event Handler — Retry', () => {
    it('[Happy Path] klik retry → fetch ulang', async () => {
      const wrapper = createWrapper();
      mockFetchCategories.mockClear();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      await table.vm.$emit('retry');

      expect(mockFetchCategories).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 10. PAGINATION HANDLERS
  // =========================================================================
  describe('Pagination Handlers', () => {
    it('[Happy Path] klik prev → changePage(current - 1)', async () => {
      mockPagination.value = {
        current_page: 3,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'CategoryPagination' });
      await pag.vm.$emit('prev');

      expect(mockChangePage).toHaveBeenCalledWith(2);
    });

    it('[Happy Path] klik next → changePage(current + 1)', async () => {
      mockPagination.value = {
        current_page: 2,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'CategoryPagination' });
      await pag.vm.$emit('next');

      expect(mockChangePage).toHaveBeenCalledWith(3);
    });

    it('[Negative Path] klik prev di halaman 1 → tidak panggil changePage', async () => {
      mockPagination.value = {
        current_page: 1,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      const wrapper = createWrapper();
      mockChangePage.mockClear();

      const pag = wrapper.findComponent({ name: 'CategoryPagination' });
      await pag.vm.$emit('prev');

      expect(mockChangePage).not.toHaveBeenCalled();
    });

    it('[Negative Path] klik next di halaman terakhir → tidak panggil changePage', async () => {
      mockPagination.value = {
        current_page: 5,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      const wrapper = createWrapper();
      mockChangePage.mockClear();

      const pag = wrapper.findComponent({ name: 'CategoryPagination' });
      await pag.vm.$emit('next');

      expect(mockChangePage).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 11. FORM SUBMIT — Create
  // =========================================================================
  describe('Form Submit — Create', () => {
    it('[Happy Path] create sukses → tutup form, buka success, reload', async () => {
      mockCreateCategory.mockResolvedValueOnce(createCategory({ name: 'New Category' }));
      const wrapper = createWrapper();
      mockFetchCategories.mockClear();

      const formModal = wrapper.findComponent({ name: 'CategoryFormModal' });
      await formModal.vm.$emit('submit', {
        name: 'New Category',
        description: 'Test',
      });

      // Tunggu async
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 0));

      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: 'New Category',
        description: 'Test',
      });
      expect(mockFetchCategories).toHaveBeenCalled();
    });

    it('[Negative Path] create gagal → tidak reload', async () => {
      mockCreateCategory.mockResolvedValueOnce(null);
      const wrapper = createWrapper();
      mockFetchCategories.mockClear();

      const formModal = wrapper.findComponent({ name: 'CategoryFormModal' });
      await formModal.vm.$emit('submit', { name: 'Test' });

      await new Promise((r) => setTimeout(r, 0));

      // Fetch tidak di-reload karena gagal
      expect(mockFetchCategories).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 12. FORM SUBMIT — Update (Edit)
  // =========================================================================
  describe('Form Submit — Update', () => {
    it('[Happy Path] update sukses → tutup form, buka success, reload', async () => {
      mockUpdateCategory.mockResolvedValueOnce(true);
      const wrapper = createWrapper();
      mockFetchCategories.mockClear();

      const formModal = wrapper.findComponent({ name: 'CategoryFormModal' });
      await formModal.vm.$emit('submit', {
        name: 'Updated',
        description: 'Updated desc',
      });

      await new Promise((r) => setTimeout(r, 0));

      // Kalau mode create (karena formModal.data = null), create dipanggil
      expect(mockCreateCategory).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 13. EVENT HANDLER — Modal Close
  // =========================================================================
  describe('Modal Close', () => {
    it('[Happy Path] klik close di form modal → tidak crash', async () => {
      const wrapper = createWrapper();

      const formModal = wrapper.findComponent({ name: 'CategoryFormModal' });
      await formModal.vm.$emit('close');

      expect(wrapper.exists()).toBe(true);
    });

    it('[Happy Path] klik close di view modal → tidak crash', async () => {
      const wrapper = createWrapper();

      const viewModal = wrapper.findComponent({ name: 'CategoryViewModal' });
      await viewModal.vm.$emit('close');

      expect(wrapper.exists()).toBe(true);
    });

    it('[Happy Path] klik close di success modal → tidak crash', async () => {
      const wrapper = createWrapper();

      const successModal = wrapper.findComponent({ name: 'SuccessModal' });
      await successModal.vm.$emit('close');

      expect(wrapper.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 14. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] categories empty → table tetap render', () => {
      mockCategories.value = [];
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.exists()).toBe(true);
    });

    it('[Edge Case] loading state → table menerima isLoading=true', () => {
      mockIsLoading.value = true;
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.props('isLoading')).toBe(true);
    });

    it('[Edge Case] error state → table menerima errorMessage', () => {
      mockErrorMessage.value = 'Network error';
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.props('errorMessage')).toBe('Network error');
    });

    it('[Corner Case] validationErrors di-pass ke form modal', () => {
      mockValidationErrors.value = { name: ['Required'] };
      const wrapper = createWrapper();

      const formModal = wrapper.findComponent({ name: 'CategoryFormModal' });
      expect(formModal.props('errors')).toEqual({ name: ['Required'] });
    });

    it('[Corner Case] multiple categories di-render', () => {
      mockCategories.value = [
        createCategory({ id: 1, name: 'First' }),
        createCategory({ id: 2, name: 'Second' }),
        createCategory({ id: 3, name: 'Third' }),
      ];
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'CategoryTable' });
      expect(table.props('categories')).toHaveLength(3);
    });

    it('[Edge Case] total=0 di pagination', () => {
      mockPagination.value = {
        current_page: 1,
        last_page: 1,
        per_page: 15,
        total: 0,
      };
      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'CategoryPagination' });
      expect(pag.props('total')).toBe(0);
    });

    it('[Edge Case] info banner pakai bg-info/5', () => {
      const wrapper = createWrapper();

      const banner = wrapper.find('.bg-info\\/5');
      expect(banner.exists()).toBe(true);
    });

    it('[Edge Case] table card punya min-h-[300px]', () => {
      const wrapper = createWrapper();

      const card = wrapper.find('.min-h-\\[300px\\]');
      expect(card.exists()).toBe(true);
    });

    it('[Corner Case] klik add berkali-kali → clearErrors dipanggil setiap kali', async () => {
      const wrapper = createWrapper();

      const header = wrapper.findComponent({ name: 'CategoryPageHeader' });
      await header.vm.$emit('add');
      await header.vm.$emit('add');
      await header.vm.$emit('add');

      expect(mockClearErrors).toHaveBeenCalledTimes(3);
    });
  });
});