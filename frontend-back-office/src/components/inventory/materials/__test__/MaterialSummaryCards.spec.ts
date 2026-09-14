import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialSummaryCards from '../MaterialSummaryCards.vue';

describe('MaterialSummaryCards.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MaterialSummaryCards, {
      props: {
        total: 0,
        active: 0,
        lowStock: 0,
        outOfStock: 0,
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender 4 card', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      expect(cards).toHaveLength(4);
    });

    it('[Happy Path] merender label "Total Materials"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Total Materials');
    });

    it('[Happy Path] merender label "Active"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Active');
    });

    it('[Happy Path] merender label "Low Stock"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Low Stock');
    });

    it('[Happy Path] merender label "Out of Stock"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Out of Stock');
    });

    it('[Happy Path] merender subtitle "Across all categories"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Across all categories');
    });

    it('[Happy Path] merender subtitle "Ready to use"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Ready to use');
    });

    it('[Happy Path] merender subtitle "Needs restocking"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Needs restocking');
    });

    it('[Happy Path] merender subtitle "Urgent action"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Urgent action');
    });

    it('[Happy Path] merender 4 SVG icon', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('svg')).toHaveLength(4);
    });

    it('[Happy Path] root punya class grid grid-cols-2 md:grid-cols-4', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('grid');
      expect(root.classes()).toContain('grid-cols-2');
      expect(root.classes()).toContain('md:grid-cols-4');
    });
  });

  // =========================================================================
  // 2. DATA BINDING
  // =========================================================================
  describe('Data Binding', () => {
    it('[Happy Path] total ditampilkan', () => {
      const wrapper = createWrapper({ total: 42 });
      expect(wrapper.text()).toContain('42');
    });

    it('[Happy Path] active ditampilkan', () => {
      const wrapper = createWrapper({ active: 30 });
      expect(wrapper.text()).toContain('30');
    });

    it('[Happy Path] lowStock ditampilkan', () => {
      const wrapper = createWrapper({ lowStock: 8 });
      expect(wrapper.text()).toContain('8');
    });

    it('[Happy Path] outOfStock ditampilkan', () => {
      const wrapper = createWrapper({ outOfStock: 4 });
      expect(wrapper.text()).toContain('4');
    });

    it('[Happy Path] semua nilai tampil di card masing-masing', () => {
      const wrapper = createWrapper({
        total: 100,
        active: 80,
        lowStock: 15,
        outOfStock: 5,
      });

      const text = wrapper.text();
      expect(text).toContain('100');
      expect(text).toContain('80');
      expect(text).toContain('15');
      expect(text).toContain('5');
    });

    it('[Happy Path] angka besar di-render', () => {
      const wrapper = createWrapper({
        total: 999999,
        active: 500000,
        lowStock: 1000,
        outOfStock: 42,
      });

      const text = wrapper.text();
      expect(text).toContain('999999');
      expect(text).toContain('500000');
      expect(text).toContain('1000');
      expect(text).toContain('42');
    });
  });

  // =========================================================================
  // 3. COLOR CLASSES PER CARD
  // =========================================================================
  describe('Color Classes per Card', () => {
    it('[Happy Path] card Total punya border border-white/60', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      expect(cards[0].classes()).toContain('border-white/60');
    });

    it('[Happy Path] card Active punya border border-success/20', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      expect(cards[1].classes()).toContain('border-success/20');
    });

    it('[Happy Path] card Low Stock punya border border-warning/25', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      expect(cards[2].classes()).toContain('border-warning/25');
    });

    it('[Happy Path] card Out of Stock punya border border-error/25', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      expect(cards[3].classes()).toContain('border-error/25');
    });

    it('[Happy Path] label Total punya text-disabled', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[0].classes()).toContain('text-disabled');
    });

    it('[Happy Path] label Active punya text-success', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[1].classes()).toContain('text-success');
    });

    it('[Happy Path] label Low Stock punya text-warning', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[2].classes()).toContain('text-warning');
    });

    it('[Happy Path] label Out of Stock punya text-error', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[3].classes()).toContain('text-error');
    });

    it('[Happy Path] angka Active punya text-success', () => {
      const wrapper = createWrapper({ active: 10 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[1].classes()).toContain('text-success');
    });

    it('[Happy Path] angka Low Stock punya text-warning', () => {
      const wrapper = createWrapper({ lowStock: 5 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[2].classes()).toContain('text-warning');
    });

    it('[Happy Path] angka Out of Stock punya text-error', () => {
      const wrapper = createWrapper({ outOfStock: 3 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[3].classes()).toContain('text-error');
    });

    it('[Happy Path] angka Total tidak punya text color (default)', () => {
      const wrapper = createWrapper({ total: 10 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].classes()).not.toContain('text-success');
      expect(numbers[0].classes()).not.toContain('text-warning');
      expect(numbers[0].classes()).not.toContain('text-error');
    });

    it('[Happy Path] icon Total punya bg-disabled/10 text-text-secondary', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[0].classes()).toContain('bg-disabled/10');
      expect(iconContainers[0].classes()).toContain('text-text-secondary');
    });

    it('[Happy Path] icon Active punya bg-success/10 text-success', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[1].classes()).toContain('bg-success/10');
      expect(iconContainers[1].classes()).toContain('text-success');
    });

    it('[Happy Path] icon Low Stock punya bg-warning/10 text-warning', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[2].classes()).toContain('bg-warning/10');
      expect(iconContainers[2].classes()).toContain('text-warning');
    });

    it('[Happy Path] icon Out of Stock punya bg-error/10 text-error', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[3].classes()).toContain('bg-error/10');
      expect(iconContainers[3].classes()).toContain('text-error');
    });
  });

  // =========================================================================
  // 4. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] total ter-update saat prop berubah', async () => {
      const wrapper = createWrapper({ total: 10 });

      expect(wrapper.text()).toContain('10');

      await wrapper.setProps({ total: 50 });

      expect(wrapper.text()).toContain('50');
      expect(wrapper.text()).not.toContain('10');
    });

    it('[Happy Path] active ter-update', async () => {
      const wrapper = createWrapper({ active: 5 });

      await wrapper.setProps({ active: 30 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[1].text()).toBe('30');
    });

    it('[Happy Path] lowStock ter-update', async () => {
      const wrapper = createWrapper({ lowStock: 3 });

      await wrapper.setProps({ lowStock: 8 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[2].text()).toBe('8');
    });

    it('[Happy Path] outOfStock ter-update', async () => {
      const wrapper = createWrapper({ outOfStock: 1 });

      await wrapper.setProps({ outOfStock: 5 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[3].text()).toBe('5');
    });

    it('[Happy Path] semua nilai berubah sekaligus', async () => {
      const wrapper = createWrapper({
        total: 10,
        active: 5,
        lowStock: 3,
        outOfStock: 2,
      });

      await wrapper.setProps({
        total: 100,
        active: 80,
        lowStock: 15,
        outOfStock: 5,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('100');
      expect(numbers[1].text()).toBe('80');
      expect(numbers[2].text()).toBe('15');
      expect(numbers[3].text()).toBe('5');
    });
  });

  // =========================================================================
  // 5. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - semua 0] render 4 card dengan angka 0', () => {
      const wrapper = createWrapper({
        total: 0,
        active: 0,
        lowStock: 0,
        outOfStock: 0,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      numbers.forEach((num) => {
        expect(num.text()).toBe('0');
      });
    });

    it('[BVA - angka negatif] tetap dirender', () => {
      const wrapper = createWrapper({
        total: -1,
        active: -5,
      });

      expect(wrapper.text()).toContain('-1');
      expect(wrapper.text()).toContain('-5');
    });

    it('[BVA - angka besar] 999999', () => {
      const wrapper = createWrapper({ total: 999999 });

      expect(wrapper.text()).toContain('999999');
    });

    it('[BVA - angka desimal] 25.5', () => {
      const wrapper = createWrapper({ total: 25.5 });

      expect(wrapper.text()).toContain('25.5');
    });
  });

  // =========================================================================
  // 6. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit event apapun saat mount', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted()).toEqual({});
    });

    // ✅ FIX: wrapper.emitted() mencatat native DOM events juga
    // (click, mousedown, dll). Kita cek CUSTOM emit saja.
    it('[Edge Case] klik card tidak emit custom event', async () => {
      const wrapper = createWrapper({ total: 10 });

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      await cards[0].trigger('click');

      const nativeEvents = ['click', 'mousedown', 'mouseup', 'focus', 'blur'];
      const emittedKeys = Object.keys(wrapper.emitted());
      const customEvents = emittedKeys.filter((e) => !nativeEvents.includes(e));

      expect(customEvents).toEqual([]);
    });

    it('[Edge Case] tidak ada button di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('button')).toHaveLength(0);
    });

    it('[Edge Case] tidak ada input di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('input')).toHaveLength(0);
    });

    it('[Corner Case] urutan card: Total → Active → Low Stock → Out of Stock', () => {
      const wrapper = createWrapper();

      const text = wrapper.text();
      const totalIndex = text.indexOf('Total Materials');
      const activeIndex = text.indexOf('Active');
      const lowIndex = text.indexOf('Low Stock');
      const outIndex = text.indexOf('Out of Stock');

      expect(totalIndex).toBeLessThan(activeIndex);
      expect(activeIndex).toBeLessThan(lowIndex);
      expect(lowIndex).toBeLessThan(outIndex);
    });

    it('[Corner Case] semua card punya class glass-soft', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft');
      expect(cards).toHaveLength(4);
    });

    it('[Corner Case] semua card punya class hover:shadow-md', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      cards.forEach((card) => {
        expect(card.classes()).toContain('hover:shadow-md');
        expect(card.classes()).toContain('transition-shadow');
      });
    });

    it('[Corner Case] semua label uppercase + tracking-widest', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      labels.forEach((label) => {
        expect(label.classes()).toContain('uppercase');
        expect(label.classes()).toContain('tracking-widest');
      });
    });

    it('[Corner Case] semua angka pakai text-2xl font-extrabold', () => {
      const wrapper = createWrapper();

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers).toHaveLength(4);
      numbers.forEach((num) => {
        expect(num.classes()).toContain('text-2xl');
        expect(num.classes()).toContain('font-extrabold');
      });
    });

    it('[Edge Case] angka 0 tetap dirender (bukan kosong)', () => {
      const wrapper = createWrapper({ total: 0 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('0');
    });

    it('[Edge Case] NaN di-render sebagai string "NaN"', () => {
      const wrapper = createWrapper({ total: NaN });

      expect(wrapper.text()).toContain('NaN');
    });
  });

  // =========================================================================
  // 7. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa pass semua 4 nilai', () => {
      const Parent = {
        components: { MaterialSummaryCards },
        template: `
          <MaterialSummaryCards
            :total="total"
            :active="active"
            :low-stock="lowStock"
            :out-of-stock="outOfStock"
          />
        `,
        data() {
          return {
            total: 100,
            active: 80,
            lowStock: 15,
            outOfStock: 5,
          };
        },
      };

      const wrapper = mount(Parent as any);

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('100');
      expect(numbers[1].text()).toBe('80');
      expect(numbers[2].text()).toBe('15');
      expect(numbers[3].text()).toBe('5');
    });
  });
});