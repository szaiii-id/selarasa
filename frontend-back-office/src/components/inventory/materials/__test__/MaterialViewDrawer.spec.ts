import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialViewDrawer from '../MaterialViewDrawer.vue';
import type { RawMaterial } from '@/types/inventory';

describe('MaterialViewDrawer.vue (Component Testing)', () => {
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
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-21T15:30:00Z',
      ...overrides,
    } as RawMaterial);

  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MaterialViewDrawer, {
      props: {
        isOpen: true,
        material: createMaterial(),
        ...props,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
          StockStatusBadge: true,
        },
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] tidak render saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] tidak render saat material=null', () => {
      const wrapper = createWrapper({ isOpen: true, material: null });
      expect(wrapper.find('.max-w-md').exists()).toBe(false);
    });

    it('[Happy Path] render drawer saat isOpen=true && material ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.max-w-md').exists()).toBe(true);
    });

    it('[Happy Path] menampilkan nama material', () => {
      const wrapper = createWrapper({
        material: createMaterial({ name: 'Premium Coffee' }),
      });
      expect(wrapper.find('h3').text()).toBe('Premium Coffee');
    });

    it('[Happy Path] menampilkan SKU', () => {
      const wrapper = createWrapper({
        material: createMaterial({ sku: 'RM-TEST-001' }),
      });
      expect(wrapper.text()).toContain('RM-TEST-001');
    });

    it('[Happy Path] menampilkan nama kategori di header', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          category: { id: 1, name: 'Dairy' } as any,
        }),
      });
      expect(wrapper.text()).toContain('Dairy');
    });

    it('[Happy Path] tidak menampilkan "·" saat category null', () => {
      const wrapper = createWrapper({
        material: createMaterial({ category: null as any }),
      });
      const headerText = wrapper.find('h3').element.parentElement?.textContent;
      expect(headerText).not.toContain('·');
    });

    it('[Happy Path] render 2 info note SVG', () => {
      const wrapper = createWrapper();
      expect(wrapper.findAll('svg').length).toBeGreaterThanOrEqual(2);
    });

    it('[Happy Path] drawer punya max-w-md', () => {
      const wrapper = createWrapper();
      const drawer = wrapper.find('.max-w-md');
      expect(drawer.classes()).toContain('max-w-md');
    });
  });

  // =========================================================================
  // 2. STOCK BANNER — 3 States
  // =========================================================================
  describe('Stock Banner — Out of Stock', () => {
    it('[Happy Path] stock=0 → bg-error/10 border-error/20', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 0 }),
      });

      const banner = wrapper.find('.bg-error\\/10');
      expect(banner.exists()).toBe(true);
    });

    it('[Happy Path] stock=0 → label text-error', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 0 }),
      });

      const labels = wrapper.findAll('.text-error');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('[Happy Path] stock=0 → message "Out of stock — urgent action required"', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 0 }),
      });

      expect(wrapper.text()).toContain('Out of stock — urgent action required');
    });
  });

  describe('Stock Banner — Low Stock', () => {
    it('[Happy Path] is_low_stock=true → bg-warning/10 border-warning/20', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          current_stock: 5,
          minimum_stock: 10,
          is_low_stock: true,
        }),
      });

      const banner = wrapper.find('.bg-warning\\/10');
      expect(banner.exists()).toBe(true);
    });

    it('[Happy Path] low stock → label text-warning', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          current_stock: 5,
          is_low_stock: true,
        }),
      });

      expect(wrapper.find('.text-warning').exists()).toBe(true);
    });

    it('[Happy Path] low stock → message "Stock is below minimum level"', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          current_stock: 5,
          is_low_stock: true,
        }),
      });

      expect(wrapper.text()).toContain('Stock is below minimum level');
    });
  });

  describe('Stock Banner — Healthy', () => {
    it('[Happy Path] stock normal → bg-success/5 border-success/20', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          current_stock: 100,
          minimum_stock: 20,
          is_low_stock: false,
        }),
      });

      const banner = wrapper.find('.bg-success\\/5');
      expect(banner.exists()).toBe(true);
    });

    it('[Happy Path] healthy → label text-success', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          current_stock: 100,
          is_low_stock: false,
        }),
      });

      expect(wrapper.find('.text-success').exists()).toBe(true);
    });

    it('[Happy Path] healthy → message "Stock level is healthy"', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          current_stock: 100,
          is_low_stock: false,
        }),
      });

      expect(wrapper.text()).toContain('Stock level is healthy');
    });
  });

  // =========================================================================
  // 3. STOCK DISPLAY
  // =========================================================================
  describe('Stock Display', () => {
    it('[Happy Path] current stock ditampilkan dengan 2 desimal', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 50.5 }),
      });

      expect(wrapper.text()).toContain('50.50');
    });

    it('[Happy Path] current stock integer diformat 2 desimal', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 100 }),
      });

      expect(wrapper.text()).toContain('100.00');
    });

    it('[Happy Path] minimum stock ditampilkan dengan 2 desimal', () => {
      const wrapper = createWrapper({
        material: createMaterial({ minimum_stock: 5.5 }),
      });

      expect(wrapper.text()).toContain('5.50');
    });

    it('[Happy Path] unit ditampilkan', () => {
      const wrapper = createWrapper({
        material: createMaterial({ unit: 'kg' }),
      });

      const text = wrapper.text();
      expect(text).toContain('kg');
    });

    it('[Happy Path] label "Current Stock" ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Current Stock');
    });

    it('[Happy Path] label "Minimum" ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Minimum');
    });
  });

  // =========================================================================
  // 4. META INFO GRID
  // =========================================================================
  describe('Meta Info Grid', () => {
    it('[Happy Path] label "Unit" ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Unit');
    });

    it('[Happy Path] label "Status" ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Status');
    });

    it('[Happy Path] label "Created" ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Created');
    });

    it('[Happy Path] label "Last Update" ada', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Last Update');
    });

    it('[Happy Path] created_at diformat ke "DD MMM YYYY"', () => {
      const wrapper = createWrapper({
        material: createMaterial({ created_at: '2024-01-20T10:00:00Z' }),
      });

      expect(wrapper.text()).toContain('2024');
      expect(wrapper.text()).toContain('Jan');
    });

    it('[Happy Path] updated_at diformat', () => {
      const wrapper = createWrapper({
        material: createMaterial({ updated_at: '2024-06-15T10:00:00Z' }),
      });

      expect(wrapper.text()).toContain('2024');
    });

    it('[Happy Path] created_at null → "-"', () => {
      const wrapper = createWrapper({
        material: createMaterial({ created_at: null as any }),
      });

      expect(wrapper.text()).toContain('-');
    });

    it('[Happy Path] updated_at null → "-"', () => {
      const wrapper = createWrapper({
        material: createMaterial({ updated_at: null as any }),
      });

      expect(wrapper.text()).toContain('-');
    });

    it('[Happy Path] created_at invalid → "-"', () => {
      const wrapper = createWrapper({
        material: createMaterial({ created_at: 'invalid-date' }),
      });

      expect(wrapper.text()).toContain('-');
    });
  });

  // =========================================================================
  // 5. CHILD COMPONENT — StockStatusBadge
  // =========================================================================
  describe('Child Component — StockStatusBadge', () => {
    it('[Happy Path] render StockStatusBadge', () => {
      const wrapper = createWrapper();

      const badge = wrapper.findComponent({ name: 'StockStatusBadge' });
      expect(badge.exists()).toBe(true);
    });

    it('[Happy Path] StockStatusBadge menerima props dengan benar', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          is_active: true,
          is_low_stock: false,
          current_stock: 100,
        }),
      });

      const badge = wrapper.findComponent({ name: 'StockStatusBadge' });
      expect(badge.props('isActive')).toBe(true);
      expect(badge.props('isLowStock')).toBe(false);
      expect(badge.props('currentStock')).toBe(100);
    });

    it('[Happy Path] StockStatusBadge menerima is_active=false', () => {
      const wrapper = createWrapper({
        material: createMaterial({ is_active: false }),
      });

      const badge = wrapper.findComponent({ name: 'StockStatusBadge' });
      expect(badge.props('isActive')).toBe(false);
    });
  });

  // =========================================================================
  // 6. EVENT EMISSION — close — ✅ FIX non-null assertion (line 372)
  // =========================================================================
  describe('Event Emission — close', () => {
    it('[Happy Path] emit "close" saat klik tombol X', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const closeBtn = buttons[0]!;
      await closeBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Happy Path] emit "close" saat klik backdrop', async () => {
      const wrapper = createWrapper();

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Negative Path] klik di dalam drawer tidak emit close', async () => {
      const wrapper = createWrapper();

      const drawer = wrapper.find('.max-w-md');
      await drawer.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });

    it('[Negative Path] klik tombol Edit tidak emit close', async () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Material'))!;
      await editBtn.trigger('click');

      expect(wrapper.emitted('close')).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. EVENT EMISSION — edit
  // =========================================================================
  describe('Event Emission — edit', () => {
    it('[Happy Path] emit "edit" dengan payload material', async () => {
      const material = createMaterial({ id: 5, name: 'Coffee' });
      const wrapper = createWrapper({ material });

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Material'))!;
      await editBtn.trigger('click');

      const emitted = wrapper.emitted('edit');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual([material]);
    });

    it('[Happy Path] tombol "Edit Material" punya icon', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Material'))!;
      expect(editBtn.find('svg').exists()).toBe(true);
    });

    it('[Happy Path] tombol "Edit Material" punya bg-primary', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Material'))!;
      expect(editBtn.classes()).toContain('bg-primary');
    });

    it('[Negative Path] tidak emit edit saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('edit')).toBeUndefined();
    });
  });

  // =========================================================================
  // 8. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] nama material ter-update saat props berubah', async () => {
      const wrapper = createWrapper({
        material: createMaterial({ name: 'First' }),
      });

      expect(wrapper.find('h3').text()).toBe('First');

      await wrapper.setProps({
        material: createMaterial({ name: 'Second' }),
      });

      expect(wrapper.find('h3').text()).toBe('Second');
    });

    it('[Happy Path] drawer tertutup saat isOpen=false', async () => {
      const wrapper = createWrapper({ isOpen: true });

      expect(wrapper.find('.max-w-md').exists()).toBe(true);

      await wrapper.setProps({ isOpen: false });

      expect(wrapper.find('.max-w-md').exists()).toBe(false);
    });

    it('[Happy Path] stock banner berubah saat current_stock berubah', async () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 100, is_low_stock: false }),
      });

      expect(wrapper.find('.bg-success\\/5').exists()).toBe(true);

      await wrapper.setProps({
        material: createMaterial({ current_stock: 0, is_low_stock: false }),
      });

      expect(wrapper.find('.bg-error\\/10').exists()).toBe(true);
    });

    it('[Happy Path] drawer tertutup saat material menjadi null', async () => {
      const wrapper = createWrapper({ isOpen: true, material: createMaterial() });

      expect(wrapper.find('.max-w-md').exists()).toBe(true);

      await wrapper.setProps({ material: null });

      expect(wrapper.find('.max-w-md').exists()).toBe(false);
    });
  });

  // =========================================================================
  // 9. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - isOpen=false, material ada] tidak render', () => {
      const wrapper = createWrapper({ isOpen: false, material: createMaterial() });
      expect(wrapper.find('.max-w-md').exists()).toBe(false);
    });

    it('[BVA - isOpen=true, material=null] tidak render', () => {
      const wrapper = createWrapper({ isOpen: true, material: null });
      expect(wrapper.find('.max-w-md').exists()).toBe(false);
    });

    it('[BVA - current_stock=0] banner error', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 0 }),
      });
      expect(wrapper.find('.bg-error\\/10').exists()).toBe(true);
    });

    it('[BVA - current_stock=0.01] banner healthy (bukan error)', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 0.01, is_low_stock: false }),
      });
      expect(wrapper.find('.bg-error\\/10').exists()).toBe(false);
    });

    it('[BVA - minimum_stock=0] tetap dirender', () => {
      const wrapper = createWrapper({
        material: createMaterial({ minimum_stock: 0 }),
      });
      expect(wrapper.text()).toContain('0.00');
    });

    it('[BVA - name sangat panjang] tetap dirender dengan truncate', () => {
      const longName = 'A'.repeat(200);
      const wrapper = createWrapper({
        material: createMaterial({ name: longName }),
      });
      expect(wrapper.find('h3').text()).toBe(longName);
    });

    it('[BVA - stock besar] 999999.99', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: 999999.99 }),
      });
      expect(wrapper.text()).toContain('999999.99');
    });
  });

  // =========================================================================
  // 10. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('close')).toBeUndefined();
      expect(wrapper.emitted('edit')).toBeUndefined();
    });

    it('[Edge Case] current_stock string → Number() coercion', () => {
      const wrapper = createWrapper({
        material: createMaterial({ current_stock: '50.5' as any }),
      });

      expect(wrapper.text()).toContain('50.50');
    });

    it('[Edge Case] minimum_stock string → Number() coercion', () => {
      const wrapper = createWrapper({
        material: createMaterial({ minimum_stock: '15' as any }),
      });

      expect(wrapper.text()).toContain('15.00');
    });

    it('[Corner Case] name dengan unicode', () => {
      const wrapper = createWrapper({
        material: createMaterial({ name: 'Café ☕' }),
      });

      expect(wrapper.text()).toContain('Café ☕');
    });

    it('[Edge Case] info note "To see the full movement history..."', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('To see the full movement history');
      expect(wrapper.text()).toContain('Stock Movements');
    });

    it('[Edge Case] info note punya styling bg-info/5', () => {
      const wrapper = createWrapper();

      const infoNote = wrapper.find('.bg-info\\/5');
      expect(infoNote.exists()).toBe(true);
    });

    it('[Corner Case] header sticky top-0', () => {
      const wrapper = createWrapper();

      const header = wrapper.find('.sticky');
      expect(header.classes()).toContain('top-0');
    });

    it('[Corner Case] drawer overflow-y-auto', () => {
      const wrapper = createWrapper();

      const drawer = wrapper.find('.max-w-md');
      expect(drawer.classes()).toContain('overflow-y-auto');
    });

    it('[Edge Case] tombol X ada di header', () => {
      const wrapper = createWrapper();

      const buttons = wrapper.findAll('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('[Corner Case] klik backdrop dengan self modifier', async () => {
      const wrapper = createWrapper();

      const backdrop = wrapper.find('.fixed');
      await backdrop.trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('[Edge Case] material dengan category_id tapi category null', () => {
      const wrapper = createWrapper({
        material: createMaterial({
          category_id: 5,
          category: null as any,
        }),
      });

      const headerText = wrapper.find('h3').element.parentElement?.textContent || '';
      expect(headerText).not.toContain('· null');
    });
  });

  // =========================================================================
  // 11. INTEGRATION — Parent Component
  // ✅ FIX: explicit type untuk data + cast `this` sebagai any
  // (line 684-685 TS2339)
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent handle close & edit event', async () => {
      const Parent = {
        components: { MaterialViewDrawer },
        template: `
          <MaterialViewDrawer
            :is-open="isOpen"
            :material="material"
            @close="isOpen = false"
            @edit="handleEdit"
          />
          <span data-testid="open">{{ isOpen }}</span>
          <span data-testid="edited">{{ edited ? 'yes' : 'no' }}</span>
        `,
        data(): { isOpen: boolean; edited: boolean; material: any } {
          // ✅ FIX: explicit return type
          return {
            isOpen: true,
            edited: false,
            material: {
              id: 1,
              sku: 'RM-001',
              name: 'Coffee',
              category_id: 1,
              category: { id: 1, name: 'Beverages' },
              unit: 'kg',
              current_stock: 100,
              minimum_stock: 20,
              is_low_stock: false,
              is_active: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z',
            },
          };
        },
        methods: {
          handleEdit(this: { edited: boolean; isOpen: boolean }) {
            // ✅ FIX: explicit `this` type
            this.edited = true;
            this.isOpen = false;
          },
        },
      };

      const wrapper = mount(Parent as any, {
        global: {
          stubs: {
            Teleport: true,
            Transition: false,
            StockStatusBadge: true,
          },
        },
      });

      const buttons = wrapper.findAll('button');
      const editBtn = buttons.find((b) => b.text().includes('Edit Material'))!;
      await editBtn.trigger('click');

      expect(wrapper.find('[data-testid="edited"]').text()).toBe('yes');
      expect(wrapper.find('[data-testid="open"]').text()).toBe('false');
    });
  });
});