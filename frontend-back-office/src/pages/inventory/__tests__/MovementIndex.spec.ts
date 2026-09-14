import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MovementIndex from '../MovementIndex.vue';
import { useStockMovementStore } from '@/stores/stockMovementStore';
import { useRawMaterialStore } from '@/stores/rawMaterialStore';
import type { StockMovement, RawMaterial } from '@/types/inventory';

// ============================================================
// MOCK COMPOSABLES (bukan store)
// ============================================================
const mockFilters = ref({
  raw_material_id: '' as number | '',
  movement_type: '' as string,
  start_date: '',
  end_date: '',
  page: 1,
});
const mockApplyFilters = vi.fn();
const mockChangePage = vi.fn();

vi.mock('@/composables/useTableFilters', () => ({
  useTableFilters: vi.fn(() => ({
    get filters() { return mockFilters.value; },
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

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn() }),
}));

// ⚠️ TIDAK MOCK STORE — pakai store asli dari Pinia
// Kita spy method-nya setelah setActivePinia

import { ref } from 'vue'; // ← WAJIB import di atas

describe('MovementIndex.vue (Page Integration Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createMovement = (overrides: Partial<StockMovement> = {}): StockMovement =>
    ({
      id: 1,
      movement_type: 'IN',
      quantity: 50,
      reason: 'Restock',
      reference_id: null,
      balance_before: 100,
      balance_after: 150,
      created_at: '2024-01-20T10:30:45Z',
      raw_material: {
        id: 1,
        name: 'Fresh Milk UHT',
        sku: 'RM-0012-APF',
        unit: 'L',
        category: { id: 1, name: 'Dairy' },
      },
      user: { id: '1', name: 'John Doe', role: 'admin' },
      ...overrides,
    } as StockMovement);

  const createMaterial = (overrides: Partial<RawMaterial> = {}): RawMaterial =>
    ({
      id: 1,
      sku: 'RM-001',
      name: 'Fresh Milk',
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
    return mount(MovementIndex, {
      global: {
        stubs: {
          MovementPageHeader: true,
          MovementSummaryCards: true,
          MovementFilterBar: true,
          MovementTable: true,
          MovementPagination: true,
          MovementFormModal: true,
          MovementDetailModal: true,
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

    // Reset filter state
    mockFilters.value = {
      raw_material_id: '',
      movement_type: '',
      start_date: '',
      end_date: '',
      page: 1,
    };
  });

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] render 8 child components', () => {
      const wrapper = createWrapper();

      expect(wrapper.findComponent({ name: 'MovementPageHeader' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MovementSummaryCards' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MovementFilterBar' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MovementTable' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MovementPagination' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MovementFormModal' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'MovementDetailModal' }).exists()).toBe(true);
      expect(wrapper.findComponent({ name: 'SuccessModal' }).exists()).toBe(true);
    });

    it('[Happy Path] render immutable banner dengan lock icon', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Immutable Audit Trail');
      expect(wrapper.text()).toContain('🔒');
    });

    it('[Happy Path] immutable banner mengandung kata ADJUSTMENT', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('ADJUSTMENT');
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
    it('[Happy Path] fetch movements saat mount', () => {
      const movementStore = useStockMovementStore();
      const spy = vi.spyOn(movementStore, 'fetchMovements').mockResolvedValue(undefined);

      createWrapper();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] fetch material options saat mount', () => {
      const materialStore = useRawMaterialStore();
      const spy = vi.spyOn(materialStore, 'fetchMaterials').mockResolvedValue(undefined);

      createWrapper();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('[Happy Path] fetch materials dengan filter is_active: true', () => {
      const materialStore = useRawMaterialStore();
      const spy = vi.spyOn(materialStore, 'fetchMaterials').mockResolvedValue(undefined);

      createWrapper();

      expect(spy).toHaveBeenCalledWith({
        is_active: true,
        per_page: 100,
        page: 1,
      });
    });

    it('[Happy Path] fetch movements dengan page 1 & per_page 15', () => {
      const movementStore = useStockMovementStore();
      const spy = vi.spyOn(movementStore, 'fetchMovements').mockResolvedValue(undefined);

      createWrapper();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          per_page: 15,
        })
      );
    });
  });

  // =========================================================================
  // 3. MATERIAL OPTIONS
  // =========================================================================
  describe('Material Options', () => {
    it('[Happy Path] materialOptions computed dari materialStore.materials', () => {
      const materialStore = useRawMaterialStore();
      materialStore.materials = [
        createMaterial({ id: 1, name: 'Milk', sku: 'RM-001', unit: 'L' }),
        createMaterial({ id: 2, name: 'Coffee', sku: 'RM-002', unit: 'kg' }),
      ];

      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      const options = filterBar.props('materialOptions') as any[];

      expect(options).toHaveLength(2);
      expect(options[0]).toMatchObject({
        value: 1,
        label: 'Milk',
        sku: 'RM-001',
        unit: 'L',
      });
    });

    it('[Happy Path] materialOptions coercing Number', () => {
      const materialStore = useRawMaterialStore();
      materialStore.materials = [
        createMaterial({
          id: 1,
          current_stock: '50.5' as any,
          minimum_stock: '10' as any,
        }),
      ];

      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      const options = filterBar.props('materialOptions') as any[];

      expect(options[0].currentStock).toBe(50.5);
      expect(options[0].minimumStock).toBe(10);
    });

    it('[Happy Path] loadMaterialOptions skip fetch jika materials sudah ada', async () => {
      const materialStore = useRawMaterialStore();
      materialStore.materials = [createMaterial({ id: 1 })];
      const spy = vi.spyOn(materialStore, 'fetchMaterials').mockResolvedValue(undefined);

      const wrapper = createWrapper();
      spy.mockClear();

      const header = wrapper.findComponent({ name: 'MovementPageHeader' });
      await header.vm.$emit('add');
      await new Promise((r) => setTimeout(r, 0));

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. SUMMARY COMPUTED
  // =========================================================================
  describe('Summary Computed', () => {
    it('[Happy Path] total dari pagination.total', () => {
      const movementStore = useStockMovementStore();
      movementStore.pagination = {
        current_page: 1,
        last_page: 5,
        per_page: 15,
        total: 100,
      };

      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('total')).toBe(100);
    });

    it('[Happy Path] hitung IN count', () => {
      const movementStore = useStockMovementStore();
      movementStore.movements = [
        createMovement({ id: 1, movement_type: 'IN' }),
        createMovement({ id: 2, movement_type: 'IN' }),
        createMovement({ id: 3, movement_type: 'OUT' }),
      ];

      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('inCount')).toBe(2);
    });

    it('[Happy Path] hitung OUT count', () => {
      const movementStore = useStockMovementStore();
      movementStore.movements = [
        createMovement({ id: 1, movement_type: 'OUT' }),
        createMovement({ id: 2, movement_type: 'IN' }),
      ];

      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('outCount')).toBe(1);
    });

    it('[Happy Path] hitung ADJUSTMENT count', () => {
      const movementStore = useStockMovementStore();
      movementStore.movements = [
        createMovement({ id: 1, movement_type: 'ADJUSTMENT' }),
        createMovement({ id: 2, movement_type: 'ADJUSTMENT' }),
        createMovement({ id: 3, movement_type: 'IN' }),
      ];

      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('adjustmentCount')).toBe(2);
    });

    it('[Happy Path] movements empty → semua count 0', () => {
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('inCount')).toBe(0);
      expect(summary.props('outCount')).toBe(0);
      expect(summary.props('adjustmentCount')).toBe(0);
    });
  });

  // =========================================================================
  // 5. EVENT HANDLER — Add
  // =========================================================================
  describe('Event Handler — Add', () => {
    it('[Happy Path] klik add → clearErrors + load material + buka form', async () => {
      const movementStore = useStockMovementStore();
      const materialStore = useRawMaterialStore();
      const clearSpy = vi.spyOn(movementStore, 'clearErrors');
      const fetchSpy = vi.spyOn(materialStore, 'fetchMaterials').mockResolvedValue(undefined);

      const wrapper = createWrapper();
      clearSpy.mockClear();
      fetchSpy.mockClear();

      const header = wrapper.findComponent({ name: 'MovementPageHeader' });
      await header.vm.$emit('add');
      await new Promise((r) => setTimeout(r, 0));

      expect(clearSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. EVENT HANDLER — View
  // =========================================================================
  describe('Event Handler — View', () => {
    it('[Happy Path] klik view → buka detail modal', async () => {
      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'MovementTable' });
      await table.vm.$emit('view', createMovement({ id: 5 }));

      expect(wrapper.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 7. EVENT HANDLER — Retry
  // =========================================================================
  describe('Event Handler — Retry', () => {
    it('[Happy Path] klik retry → fetch movements ulang', async () => {
      const movementStore = useStockMovementStore();
      const spy = vi.spyOn(movementStore, 'fetchMovements').mockResolvedValue(undefined);

      const wrapper = createWrapper();
      spy.mockClear();

      const table = wrapper.findComponent({ name: 'MovementTable' });
      await table.vm.$emit('retry');

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 8. PAGINATION HANDLERS
  // =========================================================================
  describe('Pagination Handlers', () => {
    it('[Happy Path] klik prev → changePage(current - 1)', async () => {
      const movementStore = useStockMovementStore();
      movementStore.pagination = {
        current_page: 3,
        last_page: 5,
        per_page: 15,
        total: 50,
      };

      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'MovementPagination' });
      await pag.vm.$emit('prev');

      expect(mockChangePage).toHaveBeenCalledWith(2);
    });

    it('[Happy Path] klik next → changePage(current + 1)', async () => {
      const movementStore = useStockMovementStore();
      movementStore.pagination = {
        current_page: 2,
        last_page: 5,
        per_page: 15,
        total: 50,
      };

      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'MovementPagination' });
      await pag.vm.$emit('next');

      expect(mockChangePage).toHaveBeenCalledWith(3);
    });

    it('[Negative Path] prev di halaman 1 → tidak panggil changePage', async () => {
      const movementStore = useStockMovementStore();
      movementStore.pagination = {
        current_page: 1,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      mockChangePage.mockClear();

      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'MovementPagination' });
      await pag.vm.$emit('prev');

      expect(mockChangePage).not.toHaveBeenCalled();
    });

    it('[Negative Path] next di halaman terakhir → tidak panggil changePage', async () => {
      const movementStore = useStockMovementStore();
      movementStore.pagination = {
        current_page: 5,
        last_page: 5,
        per_page: 15,
        total: 50,
      };
      mockChangePage.mockClear();

      const wrapper = createWrapper();

      const pag = wrapper.findComponent({ name: 'MovementPagination' });
      await pag.vm.$emit('next');

      expect(mockChangePage).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. DATE PRESETS
  // =========================================================================
  describe('Date Presets', () => {
    it('[Happy Path] preset-today → set start_date = end_date = today', async () => {
      const wrapper = createWrapper();
      const today = new Date().toISOString().slice(0, 10);

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('preset-today');

      expect(mockFilters.value.start_date).toBe(today);
      expect(mockFilters.value.end_date).toBe(today);
    });

    it('[Happy Path] preset-7d', async () => {
      const wrapper = createWrapper();
      const today = new Date();
      const expectedEnd = today.toISOString().slice(0, 10);
      const expectedStart = new Date(today);
      expectedStart.setDate(expectedStart.getDate() - 6);

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('preset-7d');

      expect(mockFilters.value.start_date).toBe(expectedStart.toISOString().slice(0, 10));
      expect(mockFilters.value.end_date).toBe(expectedEnd);
    });

    it('[Happy Path] preset-30d', async () => {
      const wrapper = createWrapper();
      const today = new Date();
      const expectedEnd = today.toISOString().slice(0, 10);
      const expectedStart = new Date(today);
      expectedStart.setDate(expectedStart.getDate() - 29);

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('preset-30d');

      expect(mockFilters.value.start_date).toBe(expectedStart.toISOString().slice(0, 10));
      expect(mockFilters.value.end_date).toBe(expectedEnd);
    });

    it('[Happy Path] clear-dates', async () => {
      mockFilters.value.start_date = '2024-01-01';
      mockFilters.value.end_date = '2024-01-31';

      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('clear-dates');

      expect(mockFilters.value.start_date).toBe('');
      expect(mockFilters.value.end_date).toBe('');
    });
  });

  // =========================================================================
  // 10. FILTER EVENTS
  // =========================================================================
  describe('Filter Events', () => {
    it('[Happy Path] update:raw-material-id', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('update:raw-material-id', 5);

      expect(mockFilters.value.raw_material_id).toBe(5);
    });

    it('[Happy Path] update:movement-type', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('update:movement-type', 'IN');

      expect(mockFilters.value.movement_type).toBe('IN');
    });

    it('[Happy Path] update:start-date', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('update:start-date', '2024-01-01');

      expect(mockFilters.value.start_date).toBe('2024-01-01');
    });

    it('[Happy Path] update:end-date', async () => {
      const wrapper = createWrapper();

      const filterBar = wrapper.findComponent({ name: 'MovementFilterBar' });
      await filterBar.vm.$emit('update:end-date', '2024-01-31');

      expect(mockFilters.value.end_date).toBe('2024-01-31');
    });
  });

  // =========================================================================
  // 11. FORM SUBMIT
  // =========================================================================
  describe('Form Submit', () => {
    it('[Happy Path] submit IN sukses', async () => {
      const movementStore = useStockMovementStore();
      const createSpy = vi.spyOn(movementStore, 'createMovement').mockResolvedValue(true);
      const fetchSpy = vi.spyOn(movementStore, 'fetchMovements').mockResolvedValue(undefined);

      const wrapper = createWrapper();
      fetchSpy.mockClear();

      const formModal = wrapper.findComponent({ name: 'MovementFormModal' });
      await formModal.vm.$emit('submit', {
        raw_material_id: 1,
        movement_type: 'IN',
        quantity: 50,
        reason: 'Test',
        reference_id: null,
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(createSpy).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalled();
    });

    it('[Negative Path] submit gagal → tidak reload', async () => {
      const movementStore = useStockMovementStore();
      vi.spyOn(movementStore, 'createMovement').mockResolvedValue(false);
      const fetchSpy = vi.spyOn(movementStore, 'fetchMovements').mockResolvedValue(undefined);

      const wrapper = createWrapper();
      fetchSpy.mockClear();

      const formModal = wrapper.findComponent({ name: 'MovementFormModal' });
      await formModal.vm.$emit('submit', {
        raw_material_id: 1,
        movement_type: 'IN',
        quantity: 50,
        reason: 'Test',
        reference_id: null,
      });

      await new Promise((r) => setTimeout(r, 0));

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 12. MODAL CLOSE
  // =========================================================================
  describe('Modal Close', () => {
    it('[Happy Path] close form modal → tidak crash', async () => {
      const wrapper = createWrapper();

      const formModal = wrapper.findComponent({ name: 'MovementFormModal' });
      await formModal.vm.$emit('close');

      expect(wrapper.exists()).toBe(true);
    });

    it('[Happy Path] close detail modal → tidak crash', async () => {
      const wrapper = createWrapper();

      const detailModal = wrapper.findComponent({ name: 'MovementDetailModal' });
      await detailModal.vm.$emit('close');

      expect(wrapper.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 13. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] movements empty → summary semua 0', () => {
      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('inCount')).toBe(0);
      expect(summary.props('outCount')).toBe(0);
      expect(summary.props('adjustmentCount')).toBe(0);
    });

    it('[Edge Case] loading state → table menerima isLoading=true', () => {
      const movementStore = useStockMovementStore();
      movementStore.isLoading = true;

      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'MovementTable' });
      expect(table.props('isLoading')).toBe(true);
    });

    it('[Edge Case] error state → table menerima errorMessage', () => {
      const movementStore = useStockMovementStore();
      movementStore.errorMessage = 'Network error';

      const wrapper = createWrapper();

      const table = wrapper.findComponent({ name: 'MovementTable' });
      expect(table.props('errorMessage')).toBe('Network error');
    });

    it('[Corner Case] validationErrors di-pass ke form modal', () => {
      const movementStore = useStockMovementStore();
      movementStore.validationErrors = { quantity: ['Required'] };

      const wrapper = createWrapper();

      const formModal = wrapper.findComponent({ name: 'MovementFormModal' });
      expect(formModal.props('errors')).toEqual({ quantity: ['Required'] });
    });

    it('[Corner Case] mixed movement types di summary', () => {
      const movementStore = useStockMovementStore();
      movementStore.movements = [
        createMovement({ id: 1, movement_type: 'IN' }),
        createMovement({ id: 2, movement_type: 'IN' }),
        createMovement({ id: 3, movement_type: 'OUT' }),
        createMovement({ id: 4, movement_type: 'OUT' }),
        createMovement({ id: 5, movement_type: 'OUT' }),
        createMovement({ id: 6, movement_type: 'ADJUSTMENT' }),
      ];

      const wrapper = createWrapper();

      const summary = wrapper.findComponent({ name: 'MovementSummaryCards' });
      expect(summary.props('inCount')).toBe(2);
      expect(summary.props('outCount')).toBe(3);
      expect(summary.props('adjustmentCount')).toBe(1);
    });

    it('[Edge Case] immutable banner pakai bg-info/5', () => {
      const wrapper = createWrapper();

      const banner = wrapper.find('.bg-info\\/5');
      expect(banner.exists()).toBe(true);
    });

    it('[Corner Case] klik add berkali-kali tetap konsisten', async () => {
      const movementStore = useStockMovementStore();
      const clearSpy = vi.spyOn(movementStore, 'clearErrors');
      const materialStore = useRawMaterialStore();
      vi.spyOn(materialStore, 'fetchMaterials').mockResolvedValue(undefined);

      const wrapper = createWrapper();
      clearSpy.mockClear();

      const header = wrapper.findComponent({ name: 'MovementPageHeader' });
      await header.vm.$emit('add');
      await header.vm.$emit('add');
      await header.vm.$emit('add');

      await new Promise((r) => setTimeout(r, 0));

      expect(clearSpy).toHaveBeenCalledTimes(3);
    });

    it('[Edge Case] table & pagination di-wrap dalam glass card', () => {
      const wrapper = createWrapper();

      const card = wrapper.find('.glass.rounded-3xl');
      expect(card.exists()).toBe(true);
      expect(card.classes()).toContain('min-h-[300px]');
    });
  });
});