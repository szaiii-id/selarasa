import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialFilterBar from '../MaterialFilterBar.vue';
import type { CategoryOption } from '@/composables/useCategoryOptions';

describe('MaterialFilterBar.vue (Component Testing)', () => {
  // ==========================================================
  // HELPERS
  // ==========================================================
  const createCategoryOptions = (): CategoryOption[] => [
    { value: 1, label: 'Coffee' },
    { value: 2, label: 'Tea' },
    { value: 3, label: 'Sugar' },
  ];

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MaterialFilterBar, {
      props: {
        search: '',
        categoryId: '',
        isActive: '',
        isLowStock: '',
        isOutOfStock: '',
        categoryOptions: [],
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering — ✅ FIX non-null assertion
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender 1 input search + 3 select', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('input[type="text"]')).toHaveLength(1);
      expect(wrapper.findAll('select')).toHaveLength(3);
    });

    it('[Happy Path] merender 4 SVG icon (search + 3 chevron)', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('svg')).toHaveLength(4);
    });

    it('[Happy Path] input search punya placeholder yang benar', () => {
      const wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      expect(input.attributes('placeholder')).toBe('Search by SKU or name...');
    });

    it('[Happy Path] select category punya opsi "All Categories"', () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      const categorySelect = selects[0]!;
      expect(categorySelect.text()).toContain('All Categories');
    });

    it('[Happy Path] select status punya opsi "All Status", "Active", "Inactive"', () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      const statusSelect = selects[1]!;
      expect(statusSelect.text()).toContain('All Status');
      expect(statusSelect.text()).toContain('Active');
      expect(statusSelect.text()).toContain('Inactive');
    });

    it('[Happy Path] select stock punya opsi "All Stock Levels", "Low Stock Only", "Out of Stock"', () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      const stockSelect = selects[2]!;
      expect(stockSelect.text()).toContain('All Stock Levels');
      expect(stockSelect.text()).toContain('Low Stock Only');
      expect(stockSelect.text()).toContain('Out of Stock');
    });

    it('[Happy Path] select category render opsi dari categoryOptions prop', () => {
      const wrapper = createWrapper({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      const categorySelect = selects[0]!;
      expect(categorySelect.text()).toContain('Coffee');
      expect(categorySelect.text()).toContain('Tea');
      expect(categorySelect.text()).toContain('Sugar');
    });

    it('[Happy Path] root punya class glass rounded-3xl', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div.glass');
      expect(root.exists()).toBe(true);
      expect(root.classes()).toContain('rounded-3xl');
    });
  });

  // =========================================================================
  // 2. VALUE BINDING — props → select value — ✅ FIX non-null assertion
  // =========================================================================
  describe('Value Binding — props → select value', () => {
    it('[Happy Path] input search menampilkan value dari props.search', () => {
      const wrapper = createWrapper({ search: 'gula' });

      const input = wrapper.find('input[type="text"]');
      expect((input.element as HTMLInputElement).value).toBe('gula');
    });

    it('[Happy Path] select category menampilkan value dari props.categoryId', () => {
      const wrapper = createWrapper({
        categoryId: 2,
        categoryOptions: createCategoryOptions(),
      });

      const selects = wrapper.findAll('select');
      const categorySelect = selects[0]!;
      expect((categorySelect.element as HTMLSelectElement).value).toBe('2');
    });

    it('[Happy Path] select category value "" saat categoryId=""', () => {
      const wrapper = createWrapper({ categoryId: '' });

      const selects = wrapper.findAll('select');
      const categorySelect = selects[0]!;
      expect((categorySelect.element as HTMLSelectElement).value).toBe('');
    });

    it('[Happy Path] select status value "true" saat isActive=true', () => {
      const wrapper = createWrapper({ isActive: true });

      const selects = wrapper.findAll('select');
      const statusSelect = selects[1]!;
      expect((statusSelect.element as HTMLSelectElement).value).toBe('true');
    });

    it('[Happy Path] select status value "false" saat isActive=false', () => {
      const wrapper = createWrapper({ isActive: false });

      const selects = wrapper.findAll('select');
      const statusSelect = selects[1]!;
      expect((statusSelect.element as HTMLSelectElement).value).toBe('false');
    });

    it('[Happy Path] select status value "" saat isActive=""', () => {
      const wrapper = createWrapper({ isActive: '' });

      const selects = wrapper.findAll('select');
      const statusSelect = selects[1]!;
      expect((statusSelect.element as HTMLSelectElement).value).toBe('');
    });

    it('[Happy Path] select stock value "low_stock" saat isLowStock=true', () => {
      const wrapper = createWrapper({ isLowStock: true });

      const selects = wrapper.findAll('select');
      const stockSelect = selects[2]!;
      expect((stockSelect.element as HTMLSelectElement).value).toBe('low_stock');
    });

    it('[Happy Path] select stock value "out_of_stock" saat isOutOfStock=true', () => {
      const wrapper = createWrapper({ isOutOfStock: true });

      const selects = wrapper.findAll('select');
      const stockSelect = selects[2]!;
      expect((stockSelect.element as HTMLSelectElement).value).toBe('out_of_stock');
    });

    it('[Happy Path] out_of_stock menang atas low_stock', () => {
      const wrapper = createWrapper({
        isLowStock: true,
        isOutOfStock: true,
      });

      const selects = wrapper.findAll('select');
      const stockSelect = selects[2]!;
      expect((stockSelect.element as HTMLSelectElement).value).toBe('out_of_stock');
    });

    it('[Happy Path] select stock value "" saat keduanya bukan true', () => {
      const wrapper = createWrapper({ isLowStock: '', isOutOfStock: '' });

      const selects = wrapper.findAll('select');
      const stockSelect = selects[2]!;
      expect((stockSelect.element as HTMLSelectElement).value).toBe('');
    });
  });

  // =========================================================================
  // 3. EVENT EMISSION — search — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — search', () => {
    it('[Happy Path] emit "update:search" saat user mengetik', async () => {
      const wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue('gula');

      const emitted = wrapper.emitted('update:search');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['gula']);
    });

    it('[Happy Path] emit "update:search" karakter per karakter', async () => {
      const wrapper = createWrapper();

      const input = wrapper.find('input[type="text"]');
      await input.setValue('g');
      await input.setValue('gu');
      await input.setValue('gula');

      const emitted = wrapper.emitted('update:search');
      expect(emitted).toHaveLength(3);
      expect(emitted![0]).toEqual(['g']);
      expect(emitted![1]).toEqual(['gu']);
      expect(emitted![2]).toEqual(['gula']);
    });

    it('[Happy Path] emit "update:search" dengan string kosong', async () => {
      const wrapper = createWrapper({ search: 'gula' });

      const input = wrapper.find('input[type="text"]');
      await input.setValue('');

      const emitted = wrapper.emitted('update:search');
      expect(emitted![0]).toEqual(['']);
    });
  });

  // =========================================================================
  // 4. EVENT EMISSION — category — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — category', () => {
    it('[Happy Path] emit "update:categoryId" dengan number saat user pilih kategori', async () => {
      const wrapper = createWrapper({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('2');

      const emitted = wrapper.emitted('update:categoryId');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([2]);
    });

    it('[Happy Path] emit "update:categoryId" dengan string kosong saat pilih "All Categories"', async () => {
      const wrapper = createWrapper({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('');

      const emitted = wrapper.emitted('update:categoryId');
      expect(emitted![0]).toEqual(['']);
    });

    it('[Happy Path] emit number bukan string untuk kategori', async () => {
      const wrapper = createWrapper({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('3');

      const emitted = wrapper.emitted('update:categoryId');
      expect(typeof emitted![0]![0]).toBe('number');
      expect(emitted![0]).toEqual([3]);
    });
  });

  // =========================================================================
  // 5. EVENT EMISSION — status — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — status', () => {
    it('[Happy Path] emit "update:isActive" true saat pilih "Active"', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[1]!.setValue('true');

      const emitted = wrapper.emitted('update:isActive');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([true]);
    });

    it('[Happy Path] emit "update:isActive" false saat pilih "Inactive"', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[1]!.setValue('false');

      const emitted = wrapper.emitted('update:isActive');
      expect(emitted![0]).toEqual([false]);
    });

    it('[Happy Path] emit "update:isActive" string kosong saat pilih "All Status"', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[1]!.setValue('');

      const emitted = wrapper.emitted('update:isActive');
      expect(emitted![0]).toEqual(['']);
    });

    it('[Happy Path] emit boolean sejati, bukan string', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[1]!.setValue('true');

      const emitted = wrapper.emitted('update:isActive');
      expect(typeof emitted![0]![0]).toBe('boolean');
    });
  });

  // =========================================================================
  // 6. EVENT EMISSION — stock — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — stock', () => {
    it('[Happy Path] emit "update:stockFilter" "low_stock"', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[2]!.setValue('low_stock');

      const emitted = wrapper.emitted('update:stockFilter');
      expect(emitted![0]).toEqual(['low_stock']);
    });

    it('[Happy Path] emit "update:stockFilter" "out_of_stock"', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[2]!.setValue('out_of_stock');

      const emitted = wrapper.emitted('update:stockFilter');
      expect(emitted![0]).toEqual(['out_of_stock']);
    });

    it('[Happy Path] emit "update:stockFilter" "" saat pilih "All Stock Levels"', async () => {
      const wrapper = createWrapper();

      const selects = wrapper.findAll('select');
      await selects[2]!.setValue('');

      const emitted = wrapper.emitted('update:stockFilter');
      expect(emitted![0]).toEqual(['']);
    });
  });

  // =========================================================================
  // 7. PROPS REACTIVITY — ✅ FIX non-null assertion
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] input search ter-update saat prop search berubah', async () => {
      const wrapper = createWrapper({ search: 'gula' });

      await wrapper.setProps({ search: 'tepung' });

      const input = wrapper.find('input[type="text"]');
      expect((input.element as HTMLInputElement).value).toBe('tepung');
    });

    it('[Happy Path] select category ter-update saat categoryId berubah', async () => {
      const wrapper = createWrapper({
        categoryId: 1,
        categoryOptions: createCategoryOptions(),
      });

      await wrapper.setProps({ categoryId: 2 });

      const selects = wrapper.findAll('select');
      expect((selects[0]!.element as HTMLSelectElement).value).toBe('2');
    });

    it('[Happy Path] select status ter-update saat isActive berubah', async () => {
      const wrapper = createWrapper({ isActive: true });

      await wrapper.setProps({ isActive: false });

      const selects = wrapper.findAll('select');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('false');
    });

    it('[Happy Path] select stock ter-update saat isLowStock berubah', async () => {
      const wrapper = createWrapper({ isLowStock: '' });

      await wrapper.setProps({ isLowStock: true });

      const selects = wrapper.findAll('select');
      expect((selects[2]!.element as HTMLSelectElement).value).toBe('low_stock');
    });

    it('[Happy Path] opsi kategori ter-update saat categoryOptions berubah', async () => {
      const wrapper = createWrapper({ categoryOptions: [] });

      await wrapper.setProps({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      expect(selects[0]!.text()).toContain('Coffee');
    });
  });

  // =========================================================================
  // 8. BOUNDARY VALUE ANALYSIS (BVA) — ✅ FIX non-null assertion
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - categoryId=0] dianggap sebagai kategori "0" saat option tersedia', () => {
      const wrapper = createWrapper({
        categoryId: 0,
        categoryOptions: [{ value: 0, label: 'Zero Category' }],
      });

      const selects = wrapper.findAll('select');
      expect((selects[0]!.element as HTMLSelectElement).value).toBe('0');
    });

    it('[BVA - categoryOptions kosong] hanya "All Categories" yang tampil', () => {
      const wrapper = createWrapper({ categoryOptions: [] });

      const selects = wrapper.findAll('select');
      const options = selects[0]!.findAll('option');
      expect(options).toHaveLength(1);
      expect(options[0]!.text()).toBe('All Categories');
    });

    it('[BVA - categoryOptions banyak] render semua opsi', () => {
      const options = Array.from({ length: 50 }, (_, i) => ({
        value: i + 1,
        label: `Category ${i + 1}`,
      }));
      const wrapper = createWrapper({ categoryOptions: options });

      const selects = wrapper.findAll('select');
      const renderedOptions = selects[0]!.findAll('option');
      expect(renderedOptions).toHaveLength(51);
    });

    it('[BVA - search sangat panjang]', () => {
      const longSearch = 'a'.repeat(500);
      const wrapper = createWrapper({ search: longSearch });

      const input = wrapper.find('input[type="text"]');
      expect((input.element as HTMLInputElement).value).toBe(longSearch);
    });

    it('[BVA - categoryId besar] saat option tersedia', () => {
      const wrapper = createWrapper({
        categoryId: 999999,
        categoryOptions: [{ value: 999999, label: 'Big ID Category' }],
      });

      const selects = wrapper.findAll('select');
      expect((selects[0]!.element as HTMLSelectElement).value).toBe('999999');
    });

    it('[Edge Case] categoryId tidak ada di options → select fallback ke ""', () => {
      const wrapper = createWrapper({
        categoryId: 999,
        categoryOptions: createCategoryOptions(),
      });

      const selects = wrapper.findAll('select');
      expect((selects[0]!.element as HTMLSelectElement).value).toBe('');
    });
  });

  // =========================================================================
  // 9. EDGE CASES & CORNER CASES — ✅ FIX non-null assertion
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case - unknown trick] isActive="" TIDAK di-coerce jadi true', () => {
      const wrapper = createWrapper({ isActive: '' });

      const selects = wrapper.findAll('select');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Edge Case - unknown trick] isLowStock="" TIDAK di-coerce jadi true', () => {
      const wrapper = createWrapper({ isLowStock: '' });

      const selects = wrapper.findAll('select');
      expect((selects[2]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Edge Case - unknown trick] isOutOfStock="" TIDAK di-coerce jadi true', () => {
      const wrapper = createWrapper({ isOutOfStock: '' });

      const selects = wrapper.findAll('select');
      expect((selects[2]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Edge Case] isActive=undefined → statusValue=""', () => {
      const wrapper = createWrapper({ isActive: undefined });

      const selects = wrapper.findAll('select');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Edge Case] isActive=null → statusValue=""', () => {
      const wrapper = createWrapper({ isActive: null });

      const selects = wrapper.findAll('select');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Edge Case] isActive="false" (string) → statusValue=""', () => {
      const wrapper = createWrapper({ isActive: 'false' });

      const selects = wrapper.findAll('select');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Edge Case] isActive=1 (truthy number) → statusValue=""', () => {
      const wrapper = createWrapper({ isActive: 1 });

      const selects = wrapper.findAll('select');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Corner Case] semua filter kosong → semua value ""', () => {
      const wrapper = createWrapper({
        search: '',
        categoryId: '',
        isActive: '',
        isLowStock: '',
        isOutOfStock: '',
      });

      const input = wrapper.find('input[type="text"]');
      const selects = wrapper.findAll('select');
      expect((input.element as HTMLInputElement).value).toBe('');
      expect((selects[0]!.element as HTMLSelectElement).value).toBe('');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('');
      expect((selects[2]!.element as HTMLSelectElement).value).toBe('');
    });

    it('[Corner Case] semua filter terisi → semua value terisi', () => {
      const wrapper = createWrapper({
        search: 'gula',
        categoryId: 1,
        isActive: true,
        isLowStock: true,
        isOutOfStock: '',
        categoryOptions: createCategoryOptions(),
      });

      const input = wrapper.find('input[type="text"]');
      const selects = wrapper.findAll('select');
      expect((input.element as HTMLInputElement).value).toBe('gula');
      expect((selects[0]!.element as HTMLSelectElement).value).toBe('1');
      expect((selects[1]!.element as HTMLSelectElement).value).toBe('true');
      expect((selects[2]!.element as HTMLSelectElement).value).toBe('low_stock');
    });

    it('[Corner Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('update:search')).toBeUndefined();
      expect(wrapper.emitted('update:categoryId')).toBeUndefined();
      expect(wrapper.emitted('update:isActive')).toBeUndefined();
      expect(wrapper.emitted('update:stockFilter')).toBeUndefined();
    });

    it('[Edge Case] emit number bukan string untuk categoryId (value besar)', async () => {
      const wrapper = createWrapper({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('3');

      const emitted = wrapper.emitted('update:categoryId');
      expect(typeof emitted![0]![0]).toBe('number');
    });

    it('[Edge Case] categoryId string dengan spasi → Number() gagal tapi tidak crash', async () => {
      const wrapper = createWrapper({ categoryOptions: createCategoryOptions() });

      const selects = wrapper.findAll('select');
      await selects[0]!.setValue('');

      const emitted = wrapper.emitted('update:categoryId');
      expect(emitted![0]).toEqual(['']);
    });
  });

  // =========================================================================
  // 10. INTEGRATION — v-model Pattern — ✅ FIX non-null assertion + Parent type
  // =========================================================================
  describe('Integration — v-model pattern', () => {
    it('[Integration] parent handle update:search', async () => {
      const Parent = {
        components: { MaterialFilterBar },
        template: `
          <MaterialFilterBar
            :search="search"
            :category-id="categoryId"
            :is-active="isActive"
            :is-low-stock="isLowStock"
            :is-out-of-stock="isOutOfStock"
            :category-options="categoryOptions"
            @update:search="search = $event"
            @update:category-id="categoryId = $event"
            @update:is-active="isActive = $event"
            @update:stock-filter="onStockChange"
          />
          <span data-testid="search">{{ search }}</span>
          <span data-testid="category">{{ categoryId }}</span>
          <span data-testid="status">{{ isActive }}</span>
          <span data-testid="stock">{{ stockValue }}</span>
        `,
        // ✅ FIX: explicit return type
        data(): {
          search: string;
          categoryId: number | '';
          isActive: boolean | '';
          isLowStock: unknown;
          isOutOfStock: unknown;
          stockValue: string;
          categoryOptions: CategoryOption[];
        } {
          return {
            search: '',
            categoryId: '' as number | '',
            isActive: '' as boolean | '',
            isLowStock: '' as unknown,
            isOutOfStock: '' as unknown,
            stockValue: '' as string,
            categoryOptions: createCategoryOptions(),
          };
        },
        methods: {
          // ✅ FIX: explicit `this` type
          onStockChange(
            this: { stockValue: string; isLowStock: unknown; isOutOfStock: unknown },
            val: '' | 'low_stock' | 'out_of_stock'
          ) {
            this.stockValue = val;
            this.isLowStock = val === 'low_stock';
            this.isOutOfStock = val === 'out_of_stock';
          },
        },
      };

      const wrapper = mount(Parent as any);
      const input = wrapper.find('input[type="text"]');
      const selects = wrapper.findAll('select');

      // Type search
      await input.setValue('gula');
      expect(wrapper.find('[data-testid="search"]').text()).toBe('gula');

      // Change category
      await selects[0]!.setValue('2');
      expect(wrapper.find('[data-testid="category"]').text()).toBe('2');

      // Change status
      await selects[1]!.setValue('true');
      expect(wrapper.find('[data-testid="status"]').text()).toBe('true');

      // Change stock
      await selects[2]!.setValue('low_stock');
      expect(wrapper.find('[data-testid="stock"]').text()).toBe('low_stock');
    });
  });
});