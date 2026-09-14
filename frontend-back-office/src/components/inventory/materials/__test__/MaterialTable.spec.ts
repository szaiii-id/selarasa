import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialTable from '../MaterialTable.vue';
import type { RawMaterial } from '@/types/inventory';

describe('MaterialTable.vue (Component Testing)', () => {
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

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MaterialTable, {
      props: {
        materials: [],
        isLoading: false,
        errorMessage: null,
        ...props,
      },
      global: {
        stubs: {
          StockStatusBadge: true,
          UnitDisplay: true,
        },
      },
    });
  };

  // =========================================================================
  // 1. LOADING STATE
  // =========================================================================
  describe('Loading State', () => {
    it('[Happy Path] menampilkan spinner saat isLoading=true & materials kosong', () => {
      const wrapper = createWrapper({ isLoading: true, materials: [] });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading materials...');
    });

    it('[Happy Path] tidak render table saat loading', () => {
      const wrapper = createWrapper({ isLoading: true, materials: [] });

      expect(wrapper.find('table').exists()).toBe(false);
    });

    it('[Edge Case] isLoading=true + materials ada → render table, bukan loading', () => {
      const wrapper = createWrapper({
        isLoading: true,
        materials: [createMaterial()],
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
      expect(wrapper.find('table').exists()).toBe(true);
    });
  });

  // =========================================================================
  // 2. ERROR STATE
  // =========================================================================
  describe('Error State', () => {
    it('[Happy Path] menampilkan pesan error', () => {
      const wrapper = createWrapper({ errorMessage: 'Failed to fetch materials' });

      expect(wrapper.text()).toContain('Failed to fetch materials');
    });

    it('[Happy Path] menampilkan tombol "Try Again"', () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      const button = wrapper.find('button');
      expect(button.text()).toContain('Try Again');
    });

    it('[Happy Path] emit "retry" saat tombol Try Again diklik', async () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      await wrapper.find('button').trigger('click');

      expect(wrapper.emitted('retry')).toBeTruthy();
      expect(wrapper.emitted('retry')).toHaveLength(1);
    });

    it('[Edge Case] loading menang atas error saat isLoading=true', () => {
      const wrapper = createWrapper({
        isLoading: true,
        errorMessage: 'Error',
        materials: [],
      });

      expect(wrapper.text()).toContain('Loading materials...');
      expect(wrapper.text()).not.toContain('Error');
    });
  });

  // =========================================================================
  // 3. EMPTY STATE
  // =========================================================================
  describe('Empty State', () => {
    it('[Happy Path] menampilkan empty state saat materials kosong', () => {
      const wrapper = createWrapper({ materials: [] });

      expect(wrapper.text()).toContain('No materials found');
      expect(wrapper.text()).toContain('Try adjusting your filters');
    });

    it('[Happy Path] tidak render table saat empty', () => {
      const wrapper = createWrapper({ materials: [] });

      expect(wrapper.find('table').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 4. TABLE RENDERING — ✅ FIX non-null assertion
  // =========================================================================
  describe('Table Rendering', () => {
    it('[Happy Path] render table saat materials ada', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] render header kolom dengan benar', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      const headers = wrapper.findAll('thead th');
      expect(headers).toHaveLength(6);
      expect(headers[0]!.text()).toBe('SKU / Name');
      expect(headers[1]!.text()).toBe('Category');
      expect(headers[2]!.text()).toBe('Stock');
      expect(headers[3]!.text()).toBe('Min');
      expect(headers[4]!.text()).toBe('Status');
      expect(headers[5]!.text()).toBe('Actions');
    });

    it('[Happy Path] render N baris untuk N materials', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({ id: 1 }),
          createMaterial({ id: 2 }),
          createMaterial({ id: 3 }),
        ],
      });

      const rows = wrapper.findAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('[Happy Path] menampilkan name', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ name: 'Coffee Beans' })],
      });

      expect(wrapper.text()).toContain('Coffee Beans');
    });

    it('[Happy Path] menampilkan SKU dengan font-mono', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ sku: 'RM-TEST-001' })],
      });

      expect(wrapper.text()).toContain('RM-TEST-001');
    });

    it('[Happy Path] menampilkan category badge', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            category: { id: 1, name: 'Dairy' } as any,
          }),
        ],
      });

      expect(wrapper.text()).toContain('Dairy');
    });

    it('[Happy Path] menampilkan "—" jika category null', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ category: null as any })],
      });

      expect(wrapper.text()).toContain('—');
    });

    it('[Happy Path] minimum stock diformat 2 desimal', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ minimum_stock: 10 })],
      });

      expect(wrapper.text()).toContain('10.00');
    });

    it('[Happy Path] minimum stock desimal', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ minimum_stock: 5.5 })],
      });

      expect(wrapper.text()).toContain('5.50');
    });

    it('[Happy Path] render 2 tombol per row (View & Edit)', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0]!.findAll('button');
      expect(buttons).toHaveLength(2);
    });

    it('[Happy Path] tombol View punya title "View Details"', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0]!.findAll('button');
      expect(buttons[0]!.attributes('title')).toBe('View Details');
    });

    it('[Happy Path] tombol Edit punya title "Edit"', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      const rows = wrapper.findAll('tbody tr');
      const buttons = rows[0]!.findAll('button');
      expect(buttons[1]!.attributes('title')).toBe('Edit');
    });

    it('[Happy Path] tombol View punya hover:bg-info/10', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtn = rows[0]!.findAll('button')[0]!;
      expect(viewBtn.classes()).toContain('hover:bg-info/10');
    });

    it('[Happy Path] tombol Edit punya hover:bg-primary/10', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      const rows = wrapper.findAll('tbody tr');
      const editBtn = rows[0]!.findAll('button')[1]!;
      expect(editBtn.classes()).toContain('hover:bg-primary/10');
    });
  });

  // =========================================================================
  // 5. CHILD COMPONENTS — StockStatusBadge & UnitDisplay
  // =========================================================================
  describe('Child Components', () => {
    it('[Happy Path] render StockStatusBadge per row', () => {
      const wrapper = createWrapper({
        materials: [createMaterial()],
      });

      const badges = wrapper.findAllComponents({ name: 'StockStatusBadge' });
      expect(badges).toHaveLength(1);
    });

    it('[Happy Path] StockStatusBadge menerima props yang benar', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            is_active: true,
            is_low_stock: false,
            current_stock: 100,
          }),
        ],
      });

      const badge = wrapper.findComponent({ name: 'StockStatusBadge' });
      expect(badge.props('isActive')).toBe(true);
      expect(badge.props('isLowStock')).toBe(false);
      expect(badge.props('currentStock')).toBe(100);
    });

    it('[Happy Path] render UnitDisplay per row', () => {
      const wrapper = createWrapper({
        materials: [createMaterial()],
      });

      const displays = wrapper.findAllComponents({ name: 'UnitDisplay' });
      expect(displays).toHaveLength(1);
    });

    it('[Happy Path] UnitDisplay menerima props value & unit', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ current_stock: 50, unit: 'kg' })],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('value')).toBe(50);
      expect(display.props('unit')).toBe('kg');
    });

    it('[Happy Path] UnitDisplay state="danger" saat stock = 0', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ current_stock: 0 })],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('state')).toBe('danger');
    });

    it('[Happy Path] UnitDisplay state="warning" saat is_low_stock=true (stock > 0)', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 5,
            minimum_stock: 10,
            is_low_stock: true,
          }),
        ],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('state')).toBe('warning');
    });

    it('[Happy Path] UnitDisplay state="default" saat stock normal', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 100,
            minimum_stock: 10,
            is_low_stock: false,
          }),
        ],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('state')).toBe('default');
    });
  });

  // =========================================================================
  // 6. ROW STYLING — getRowClass()
  // =========================================================================
  describe('Row Styling — getRowClass()', () => {
    it('[Happy Path] row default (healthy stock) tidak punya class khusus', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 100,
            minimum_stock: 10,
            is_active: true,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).not.toContain('opacity-60');
      expect(row.classes()).not.toContain('bg-error/5');
      expect(row.classes()).not.toContain('bg-warning/5');
    });

    it('[Priority 1 - Inactive] row punya class opacity-60', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            is_active: false,
            current_stock: 100,
            minimum_stock: 10,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('opacity-60');
    });

    it('[Priority 2 - Out of Stock] row punya bg-error/5 + border-l-4 + border-error', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 0,
            minimum_stock: 10,
            is_active: true,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('bg-error/5');
      expect(row.classes()).toContain('border-l-4');
      expect(row.classes()).toContain('border-error');
    });

    it('[Priority 3 - Low Stock] row punya bg-warning/5 + border-l-4 + border-warning', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 5,
            minimum_stock: 10,
            is_active: true,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('bg-warning/5');
      expect(row.classes()).toContain('border-l-4');
      expect(row.classes()).toContain('border-warning');
    });

    it('[Priority - Inactive menang atas Out of Stock]', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            is_active: false,
            current_stock: 0,
            minimum_stock: 10,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('opacity-60');
      expect(row.classes()).not.toContain('bg-error/5');
    });

    it('[Priority - Out of Stock menang atas Low Stock] (stock=0 ≤ min)', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 0,
            minimum_stock: 10,
            is_active: true,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('bg-error/5');
      expect(row.classes()).not.toContain('bg-warning/5');
    });

    it('[Edge - stock = minimum] dianggap low stock (≤)', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 10,
            minimum_stock: 10,
            is_active: true,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('bg-warning/5');
    });

    it('[Edge - stock > minimum] default', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({
            current_stock: 11,
            minimum_stock: 10,
            is_active: true,
          }),
        ],
      });

      const row = wrapper.find('tbody tr');
      expect(row.classes()).not.toContain('bg-warning/5');
      expect(row.classes()).not.toContain('bg-error/5');
    });
  });

  // =========================================================================
  // 7. EVENT EMISSION — view, edit — ✅ FIX non-null assertion
  // =========================================================================
  describe('Event Emission — view', () => {
    it('[Happy Path] emit "view" dengan payload material', async () => {
      const material = createMaterial({ id: 5 });
      const wrapper = createWrapper({ materials: [material] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtn = rows[0]!.findAll('button')[0]!;
      await viewBtn.trigger('click');

      const emitted = wrapper.emitted('view');
      expect(emitted![0]).toEqual([material]);
    });

    it('[Happy Path] emit material yang benar dari multiple rows', async () => {
      const mat1 = createMaterial({ id: 1, name: 'First' });
      const mat2 = createMaterial({ id: 2, name: 'Second' });
      const wrapper = createWrapper({ materials: [mat1, mat2] });

      const rows = wrapper.findAll('tbody tr');
      const viewBtnRow2 = rows[1]!.findAll('button')[0]!;
      await viewBtnRow2.trigger('click');

      const emitted = wrapper.emitted('view');
      expect(emitted![0]).toEqual([mat2]);
    });
  });

  describe('Event Emission — edit', () => {
    it('[Happy Path] emit "edit" dengan payload material', async () => {
      const material = createMaterial({ id: 5 });
      const wrapper = createWrapper({ materials: [material] });

      const rows = wrapper.findAll('tbody tr');
      const editBtn = rows[0]!.findAll('button')[1]!;
      await editBtn.trigger('click');

      const emitted = wrapper.emitted('edit');
      expect(emitted![0]).toEqual([material]);
    });

    it('[Happy Path] emit material yang benar dari multiple rows', async () => {
      const mat1 = createMaterial({ id: 1 });
      const mat2 = createMaterial({ id: 2 });
      const mat3 = createMaterial({ id: 3 });
      const wrapper = createWrapper({ materials: [mat1, mat2, mat3] });

      const rows = wrapper.findAll('tbody tr');
      const editBtnRow3 = rows[2]!.findAll('button')[1]!;
      await editBtnRow3.trigger('click');

      const emitted = wrapper.emitted('edit');
      expect(emitted![0]).toEqual([mat3]);
    });

    it('[Negative Path] tidak emit edit saat mount', () => {
      const wrapper = createWrapper({ materials: [createMaterial()] });

      expect(wrapper.emitted('edit')).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] transisi loading → table', async () => {
      const wrapper = createWrapper({ isLoading: true, materials: [] });

      expect(wrapper.find('.animate-spin').exists()).toBe(true);

      await wrapper.setProps({
        isLoading: false,
        materials: [createMaterial()],
      });

      expect(wrapper.find('.animate-spin').exists()).toBe(false);
      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] transisi error → table', async () => {
      const wrapper = createWrapper({ errorMessage: 'Error' });

      expect(wrapper.text()).toContain('Error');

      await wrapper.setProps({
        errorMessage: null,
        materials: [createMaterial()],
      });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] transisi empty → table', async () => {
      const wrapper = createWrapper({ materials: [] });

      expect(wrapper.text()).toContain('No materials found');

      await wrapper.setProps({ materials: [createMaterial()] });

      expect(wrapper.find('table').exists()).toBe(true);
    });

    it('[Happy Path] table re-render saat materials berubah', async () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ name: 'First' })],
      });

      expect(wrapper.text()).toContain('First');

      await wrapper.setProps({
        materials: [createMaterial({ name: 'Second' })],
      });

      expect(wrapper.text()).toContain('Second');
      expect(wrapper.text()).not.toContain('First');
    });
  });

  // =========================================================================
  // 9. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - 1 material] render 1 row', () => {
      const wrapper = createWrapper({
        materials: [createMaterial()],
      });

      expect(wrapper.findAll('tbody tr')).toHaveLength(1);
    });

    it('[BVA - 100 materials] render 100 rows', () => {
      const materials = Array.from({ length: 100 }, (_, i) =>
        createMaterial({ id: i + 1, name: `Material ${i + 1}` })
      );
      const wrapper = createWrapper({ materials });

      expect(wrapper.findAll('tbody tr')).toHaveLength(100);
    });

    it('[BVA - current_stock = 0] danger state', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ current_stock: 0 })],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('state')).toBe('danger');
    });

    it('[BVA - minimum_stock = 0] tetap render 0.00', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ minimum_stock: 0 })],
      });

      expect(wrapper.text()).toContain('0.00');
    });

    it('[BVA - stock sangat besar] 999999', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ current_stock: 999999 })],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('value')).toBe(999999);
    });
  });

  // =========================================================================
  // 10. EDGE CASES & CORNER CASES — ✅ FIX non-null assertion
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] current_stock string → dikonversi ke number', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ current_stock: '50.5' as any })],
      });

      const display = wrapper.findComponent({ name: 'UnitDisplay' });
      expect(display.props('value')).toBe(50.5);
    });

    it('[Edge Case] minimum_stock string → dikonversi ke number', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ minimum_stock: '15' as any })],
      });

      expect(wrapper.text()).toContain('15.00');
    });

    it('[Edge Case] material dengan name unicode', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ name: 'Café ☕' })],
      });

      expect(wrapper.text()).toContain('Café ☕');
    });

    it('[Corner Case] material tanpa category → render "—"', () => {
      const wrapper = createWrapper({
        materials: [createMaterial({ category: null as any })],
      });

      expect(wrapper.text()).toContain('—');
    });

    it('[Corner Case] multiple rows dengan styling berbeda', () => {
      const wrapper = createWrapper({
        materials: [
          createMaterial({ id: 1, is_active: false, current_stock: 100, minimum_stock: 10 }),
          createMaterial({ id: 2, is_active: true, current_stock: 0, minimum_stock: 10 }),
          createMaterial({ id: 3, is_active: true, current_stock: 5, minimum_stock: 10 }),
          createMaterial({ id: 4, is_active: true, current_stock: 100, minimum_stock: 10 }),
        ],
      });

      const rows = wrapper.findAll('tbody tr');
      expect(rows[0]!.classes()).toContain('opacity-60');     // inactive
      expect(rows[1]!.classes()).toContain('bg-error/5');     // out of stock
      expect(rows[2]!.classes()).toContain('bg-warning/5');   // low stock
      expect(rows[3]!.classes()).not.toContain('opacity-60'); // default
    });

    it('[Edge Case] hover:bg-white/40 ada di setiap row', () => {
      const wrapper = createWrapper({
        materials: [createMaterial()],
      });

      const rows = wrapper.findAll('tbody tr');
      rows.forEach((row) => {
        expect(row.classes()).toContain('hover:bg-white/40');
      });
    });

    it('[Edge Case] klik di area non-button tidak emit apapun', async () => {
      const wrapper = createWrapper({
        materials: [createMaterial()],
      });

      const cell = wrapper.find('tbody tr td');
      await cell.trigger('click');

      expect(wrapper.emitted('view')).toBeUndefined();
      expect(wrapper.emitted('edit')).toBeUndefined();
    });
  });
});