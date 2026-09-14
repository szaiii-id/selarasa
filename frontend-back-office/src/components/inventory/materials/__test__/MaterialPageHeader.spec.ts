import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialPageHeader from '../MaterialPageHeader.vue';

describe('MaterialPageHeader.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MaterialPageHeader, {
      props: {
        lowStockCount: 0,
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender judul "Raw Materials"', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      expect(h1.exists()).toBe(true);
      expect(h1.text()).toContain('Raw Materials');
    });

    it('[Happy Path] merender subtitle dengan kata "Master data"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Master data of warehouse raw materials');
    });

    it('[Happy Path] subtitle mengandung kata "cannot" (ditebalkan)', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('cannot');
    });

    it('[Happy Path] merender tombol "Add Material"', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain('Add Material');
    });

    it('[Happy Path] tombol punya type="button"', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('type')).toBe('button');
    });

    it('[Happy Path] merender icon di judul (svg)', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      expect(h1.find('svg').exists()).toBe(true);
    });

    it('[Happy Path] judul punya class text-2xl font-extrabold', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      expect(h1.classes()).toContain('text-2xl');
      expect(h1.classes()).toContain('font-extrabold');
    });

    it('[Happy Path] tombol punya class bg-primary', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.classes()).toContain('bg-primary');
    });

    it('[Happy Path] root punya class flex justify-between', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('flex');
      expect(root.classes()).toContain('justify-between');
      expect(root.classes()).toContain('items-start');
      expect(root.classes()).toContain('flex-wrap');
    });

    it('[Happy Path] icon folder di judul punya class text-primary', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      const svg = h1.find('svg');
      expect(svg.classes()).toContain('text-primary');
    });
  });

  // =========================================================================
  // 2. LOW STOCK BADGE — Conditional Rendering
  // =========================================================================
  describe('Low Stock Badge — Conditional Rendering', () => {
    it('[Happy Path] badge TIDAK muncul saat lowStockCount = 0', () => {
      const wrapper = createWrapper({ lowStockCount: 0 });

      expect(wrapper.text()).not.toContain('Low Stock');
    });

    it('[Happy Path] badge muncul saat lowStockCount > 0', () => {
      const wrapper = createWrapper({ lowStockCount: 5 });

      expect(wrapper.text()).toContain('5 Low Stock');
    });

    it('[Happy Path] badge menampilkan angka yang benar', () => {
      const wrapper = createWrapper({ lowStockCount: 42 });

      expect(wrapper.text()).toContain('42 Low Stock');
    });

    it('[Happy Path] badge menampilkan "1 Low Stock" untuk count=1', () => {
      const wrapper = createWrapper({ lowStockCount: 1 });

      expect(wrapper.text()).toContain('1 Low Stock');
    });

    it('[Happy Path] badge punya class bg-warning/15', () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      const badge = wrapper.find('.bg-warning\\/15');
      expect(badge.exists()).toBe(true);
    });

    it('[Happy Path] badge punya border border-warning/30', () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      const badge = wrapper.find('.bg-warning\\/15');
      expect(badge.classes()).toContain('border');
      expect(badge.classes()).toContain('border-warning/30');
    });

    it('[Happy Path] badge punya icon warning (svg)', () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      const badge = wrapper.find('.bg-warning\\/15');
      expect(badge.find('svg').exists()).toBe(true);
    });

    it('[Happy Path] badge punya class text-warning', () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      const badge = wrapper.find('.bg-warning\\/15');
      expect(badge.classes()).toContain('text-warning');
    });

    it('[Happy Path] badge bukan button (info only, tidak clickable)', () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      const badge = wrapper.find('.bg-warning\\/15');
      expect(badge.element.tagName).toBe('DIV');
      expect(badge.element.tagName).not.toBe('BUTTON');
    });
  });

  // =========================================================================
  // 3. EVENT EMISSION — add
  // =========================================================================
  describe('Event Emission — add', () => {
    it('[Happy Path] emit "add" saat tombol diklik', async () => {
      const wrapper = createWrapper();

      await wrapper.find('button').trigger('click');

      const emitted = wrapper.emitted('add');
      expect(emitted).toBeTruthy();
      expect(emitted).toHaveLength(1);
    });

    it('[Happy Path] emit "add" tanpa payload', async () => {
      const wrapper = createWrapper();

      await wrapper.find('button').trigger('click');

      const emitted = wrapper.emitted('add');
      expect(emitted![0]).toEqual([]);
    });

    it('[Happy Path] emit "add" multiple kali', async () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      await button.trigger('click');
      await button.trigger('click');
      await button.trigger('click');

      expect(wrapper.emitted('add')).toHaveLength(3);
    });

    it('[Negative Path] tidak emit "add" saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted('add')).toBeUndefined();
    });

    it('[Negative Path] tidak emit "add" saat klik judul', async () => {
      const wrapper = createWrapper();

      await wrapper.find('h1').trigger('click');

      expect(wrapper.emitted('add')).toBeUndefined();
    });

    it('[Negative Path] tidak emit "add" saat klik badge low stock', async () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      const badge = wrapper.find('.bg-warning\\/15');
      await badge.trigger('click');

      expect(wrapper.emitted('add')).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] badge muncul saat lowStockCount berubah dari 0 ke 5', async () => {
      const wrapper = createWrapper({ lowStockCount: 0 });

      expect(wrapper.text()).not.toContain('Low Stock');

      await wrapper.setProps({ lowStockCount: 5 });

      expect(wrapper.text()).toContain('5 Low Stock');
    });

    it('[Happy Path] badge hilang saat lowStockCount berubah dari 5 ke 0', async () => {
      const wrapper = createWrapper({ lowStockCount: 5 });

      expect(wrapper.text()).toContain('5 Low Stock');

      await wrapper.setProps({ lowStockCount: 0 });

      expect(wrapper.text()).not.toContain('Low Stock');
    });

    it('[Happy Path] angka badge ter-update saat count berubah', async () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      expect(wrapper.text()).toContain('3 Low Stock');

      await wrapper.setProps({ lowStockCount: 10 });

      expect(wrapper.text()).toContain('10 Low Stock');
      expect(wrapper.text()).not.toContain('3 Low Stock');
    });
  });

  // =========================================================================
  // 5. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - lowStockCount=0] badge TIDAK muncul (batas bawah)', () => {
      const wrapper = createWrapper({ lowStockCount: 0 });

      expect(wrapper.text()).not.toContain('Low Stock');
    });

    it('[BVA - lowStockCount=1] badge muncul (batas bawah non-zero)', () => {
      const wrapper = createWrapper({ lowStockCount: 1 });

      expect(wrapper.text()).toContain('1 Low Stock');
    });

    it('[BVA - lowStockCount=2] badge muncul', () => {
      const wrapper = createWrapper({ lowStockCount: 2 });

      expect(wrapper.text()).toContain('2 Low Stock');
    });

    it('[BVA - lowStockCount besar] badge muncul dengan angka besar', () => {
      const wrapper = createWrapper({ lowStockCount: 9999 });

      expect(wrapper.text()).toContain('9999 Low Stock');
    });

    it('[BVA - lowStockCount negatif] badge TIDAK muncul (guard > 0)', () => {
      const wrapper = createWrapper({ lowStockCount: -1 });

      expect(wrapper.text()).not.toContain('Low Stock');
    });
  });

  // =========================================================================
  // 6. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] hanya 1 button di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('button')).toHaveLength(1);
    });

    it('[Edge Case] badge low stock bukan button (semantic)', () => {
      const wrapper = createWrapper({ lowStockCount: 3 });

      // Total button tetap 1 (hanya Add Material)
      expect(wrapper.findAll('button')).toHaveLength(1);
    });

    it('[Edge Case] judul pakai h1 (semantic heading)', () => {
      const wrapper = createWrapper();

      expect(wrapper.find('h1').exists()).toBe(true);
      expect(wrapper.findAll('h1')).toHaveLength(1);
    });

    it('[Corner Case] subtitle mengandung tag <strong> untuk "cannot"', () => {
      const wrapper = createWrapper();

      const strong = wrapper.findAll('strong');
      expect(strong.length).toBeGreaterThan(0);
      const hasCannot = strong.some((s) => s.text() === 'cannot');
      expect(hasCannot).toBe(true);
    });

    it('[Corner Case] total SVG icon: 2 saat badge muncul, 1 saat tidak', () => {
      const wrapperEmpty = createWrapper({ lowStockCount: 0 });
      expect(wrapperEmpty.findAll('svg')).toHaveLength(2); // folder + plus

      const wrapperWithBadge = createWrapper({ lowStockCount: 3 });
      expect(wrapperWithBadge.findAll('svg')).toHaveLength(3); // folder + warning + plus
    });

    it('[Edge Case] klik Add Material tidak mengubah DOM', async () => {
      const wrapper = createWrapper();

      const htmlBefore = wrapper.html();
      await wrapper.find('button').trigger('click');
      const htmlAfter = wrapper.html();

      expect(htmlBefore).toBe(htmlAfter);
    });

    it('[Corner Case] lowStockCount=Infinity → badge muncul', () => {
      const wrapper = createWrapper({ lowStockCount: Infinity });

      expect(wrapper.text()).toContain('Low Stock');
    });

    it('[Corner Case] lowStockCount=NaN → badge tidak muncul (NaN > 0 = false)', () => {
      const wrapper = createWrapper({ lowStockCount: NaN });

      expect(wrapper.text()).not.toContain('Low Stock');
    });
  });

  // =========================================================================
  // 7. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa handle event add', async () => {
      const Parent = {
        components: { MaterialPageHeader },
        template: `
          <MaterialPageHeader
            :low-stock-count="lowStockCount"
            @add="handleAdd"
          />
          <span data-testid="clicked">{{ clicked ? 'yes' : 'no' }}</span>
        `,
        data() {
          return {
            lowStockCount: 5,
            clicked: false,
          };
        },
        methods: {
          handleAdd() {
            this.clicked = true;
          },
        },
      };

      const wrapper = mount(Parent as any);
      const button = wrapper.find('button');

      expect(wrapper.find('[data-testid="clicked"]').text()).toBe('no');

      await button.trigger('click');

      expect(wrapper.find('[data-testid="clicked"]').text()).toBe('yes');
    });

    it('[Integration] parent bisa update lowStockCount', async () => {
      const Parent = {
        components: { MaterialPageHeader },
        template: `
          <MaterialPageHeader :low-stock-count="count" />
          <button @click="count = 0" data-testid="reset">Reset</button>
        `,
        data() {
          return { count: 5 };
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.text()).toContain('5 Low Stock');

      await wrapper.find('[data-testid="reset"]').trigger('click');

      expect(wrapper.text()).not.toContain('Low Stock');
    });
  });
});