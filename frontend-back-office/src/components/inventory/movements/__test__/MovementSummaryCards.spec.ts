
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementSummaryCards from '../MovementSummaryCards.vue';

describe('MovementSummaryCards.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(MovementSummaryCards, {
      props: {
        total: 0,
        inCount: 0,
        outCount: 0,
        adjustmentCount: 0,
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

    it('[Happy Path] merender label "Total Movements"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Total Movements');
    });

    it('[Happy Path] merender label "IN"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('IN');
    });

    it('[Happy Path] merender label "OUT"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('OUT');
    });

    it('[Happy Path] merender label "Adjustments"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Adjustments');
    });

    it('[Happy Path] merender subtitle "All time records"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('All time records');
    });

    it('[Happy Path] merender subtitle "Stock received"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Stock received');
    });

    it('[Happy Path] merender subtitle "Stock issued"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Stock issued');
    });

    it('[Happy Path] merender subtitle "Manual corrections"', () => {
      const wrapper = createWrapper();
      expect(wrapper.text()).toContain('Manual corrections');
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

    it('[Happy Path] root punya class gap-3', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('gap-3');
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

    it('[Happy Path] inCount ditampilkan', () => {
      const wrapper = createWrapper({ inCount: 30 });
      expect(wrapper.text()).toContain('30');
    });

    it('[Happy Path] outCount ditampilkan', () => {
      const wrapper = createWrapper({ outCount: 8 });
      expect(wrapper.text()).toContain('8');
    });

    it('[Happy Path] adjustmentCount ditampilkan', () => {
      const wrapper = createWrapper({ adjustmentCount: 4 });
      expect(wrapper.text()).toContain('4');
    });

    it('[Happy Path] semua nilai tampil di card masing-masing', () => {
      const wrapper = createWrapper({
        total: 100,
        inCount: 60,
        outCount: 30,
        adjustmentCount: 10,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('100');
      expect(numbers[1].text()).toBe('60');
      expect(numbers[2].text()).toBe('30');
      expect(numbers[3].text()).toBe('10');
    });

    it('[Happy Path] angka besar di-render', () => {
      const wrapper = createWrapper({
        total: 999999,
        inCount: 500000,
        outCount: 250000,
        adjustmentCount: 1000,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('999999');
      expect(numbers[1].text()).toBe('500000');
      expect(numbers[2].text()).toBe('250000');
      expect(numbers[3].text()).toBe('1000');
    });
  });

  // =========================================================================
  // 3. COLOR CLASSES PER CARD
  // =========================================================================
  describe('Color Classes per Card', () => {
    it('[Happy Path] label Total punya text-text-disabled', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[0].classes()).toContain('text-text-disabled');
    });

    it('[Happy Path] label IN punya text-success', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[1].classes()).toContain('text-success');
    });

    it('[Happy Path] label OUT punya text-error', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[2].classes()).toContain('text-error');
    });

    it('[Happy Path] label Adjustments punya text-warning', () => {
      const wrapper = createWrapper();

      const labels = wrapper.findAll('p.text-\\[10px\\].font-bold.uppercase');
      expect(labels[3].classes()).toContain('text-warning');
    });

    it('[Happy Path] angka IN punya text-success', () => {
      const wrapper = createWrapper({ inCount: 10 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[1].classes()).toContain('text-success');
    });

    it('[Happy Path] angka OUT punya text-error', () => {
      const wrapper = createWrapper({ outCount: 5 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[2].classes()).toContain('text-error');
    });

    it('[Happy Path] angka Adjustments punya text-warning', () => {
      const wrapper = createWrapper({ adjustmentCount: 3 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[3].classes()).toContain('text-warning');
    });

    it('[Happy Path] angka Total tidak punya text color (default)', () => {
      const wrapper = createWrapper({ total: 10 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].classes()).not.toContain('text-success');
      expect(numbers[0].classes()).not.toContain('text-error');
      expect(numbers[0].classes()).not.toContain('text-warning');
    });

    it('[Happy Path] icon Total punya bg-text-disabled/10 text-text-secondary', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[0].classes()).toContain('bg-text-disabled/10');
      expect(iconContainers[0].classes()).toContain('text-text-secondary');
    });

    it('[Happy Path] icon IN punya bg-success/10 text-success', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[1].classes()).toContain('bg-success/10');
      expect(iconContainers[1].classes()).toContain('text-success');
    });

    it('[Happy Path] icon OUT punya bg-error/10 text-error', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[2].classes()).toContain('bg-error/10');
      expect(iconContainers[2].classes()).toContain('text-error');
    });

    it('[Happy Path] icon Adjustments punya bg-warning/10 text-warning', () => {
      const wrapper = createWrapper();

      const iconContainers = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(iconContainers[3].classes()).toContain('bg-warning/10');
      expect(iconContainers[3].classes()).toContain('text-warning');
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

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('50');
    });

    it('[Happy Path] inCount ter-update', async () => {
      const wrapper = createWrapper({ inCount: 5 });

      await wrapper.setProps({ inCount: 30 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[1].text()).toBe('30');
    });

    it('[Happy Path] outCount ter-update', async () => {
      const wrapper = createWrapper({ outCount: 3 });

      await wrapper.setProps({ outCount: 8 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[2].text()).toBe('8');
    });

    it('[Happy Path] adjustmentCount ter-update', async () => {
      const wrapper = createWrapper({ adjustmentCount: 1 });

      await wrapper.setProps({ adjustmentCount: 5 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[3].text()).toBe('5');
    });

    it('[Happy Path] semua nilai berubah sekaligus', async () => {
      const wrapper = createWrapper({
        total: 10,
        inCount: 5,
        outCount: 3,
        adjustmentCount: 2,
      });

      await wrapper.setProps({
        total: 100,
        inCount: 60,
        outCount: 30,
        adjustmentCount: 10,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('100');
      expect(numbers[1].text()).toBe('60');
      expect(numbers[2].text()).toBe('30');
      expect(numbers[3].text()).toBe('10');
    });
  });

  // =========================================================================
  // 5. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - semua 0] render 4 card dengan angka 0', () => {
      const wrapper = createWrapper({
        total: 0,
        inCount: 0,
        outCount: 0,
        adjustmentCount: 0,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      numbers.forEach((num) => {
        expect(num.text()).toBe('0');
      });
    });

    it('[BVA - angka negatif] tetap dirender', () => {
      const wrapper = createWrapper({
        total: -1,
        inCount: -5,
      });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('-1');
      expect(numbers[1].text()).toBe('-5');
    });

    it('[BVA - angka besar] 999999', () => {
      const wrapper = createWrapper({ total: 999999 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('999999');
    });

    it('[BVA - angka desimal] 25.5', () => {
      const wrapper = createWrapper({ total: 25.5 });

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('25.5');
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

    it('[Edge Case] tidak ada button di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('button')).toHaveLength(0);
    });

    it('[Edge Case] tidak ada input di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('input')).toHaveLength(0);
    });

    it('[Corner Case] urutan card: Total → IN → OUT → Adjustments', () => {
      const wrapper = createWrapper();

      const text = wrapper.text();
      const totalIndex = text.indexOf('Total Movements');
      const inIndex = text.indexOf('IN');
      const outIndex = text.indexOf('OUT');
      const adjIndex = text.indexOf('Adjustments');

      expect(totalIndex).toBeLessThan(inIndex);
      expect(inIndex).toBeLessThan(outIndex);
      expect(outIndex).toBeLessThan(adjIndex);
    });

    it('[Corner Case] semua card punya class glass-soft', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft');
      expect(cards).toHaveLength(4);
    });

    it('[Corner Case] semua card punya class rounded-2xl', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      expect(cards).toHaveLength(4);
    });

    it('[Corner Case] semua card punya class p-4', () => {
      const wrapper = createWrapper();

      const cards = wrapper.findAll('.glass-soft.rounded-2xl');
      cards.forEach((card) => {
        expect(card.classes()).toContain('p-4');
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

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('NaN');
    });

    it('[Edge Case] icon containers punya class w-7 h-7', () => {
      const wrapper = createWrapper();

      const icons = wrapper.findAll('.w-7.h-7.rounded-lg');
      expect(icons).toHaveLength(4);
      icons.forEach((icon) => {
        expect(icon.classes()).toContain('w-7');
        expect(icon.classes()).toContain('h-7');
      });
    });
  });

  // =========================================================================
  // 7. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa pass semua 4 nilai', () => {
      const Parent = {
        components: { MovementSummaryCards },
        template: `
          <MovementSummaryCards
            :total="total"
            :in-count="inCount"
            :out-count="outCount"
            :adjustment-count="adjustmentCount"
          />
        `,
        data() {
          return {
            total: 100,
            inCount: 60,
            outCount: 30,
            adjustmentCount: 10,
          };
        },
      };

      const wrapper = mount(Parent as any);

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[0].text()).toBe('100');
      expect(numbers[1].text()).toBe('60');
      expect(numbers[2].text()).toBe('30');
      expect(numbers[3].text()).toBe('10');
    });

    it('[Integration] parent bisa update nilai', async () => {
      const Parent = {
        components: { MovementSummaryCards },
        template: `
          <MovementSummaryCards
            :total="total"
            :in-count="inCount"
            :out-count="outCount"
            :adjustment-count="adjustmentCount"
          />
          <button @click="inCount = 100" data-testid="increment">+</button>
        `,
        data() {
          return {
            total: 50,
            inCount: 20,
            outCount: 20,
            adjustmentCount: 10,
          };
        },
      };

      const wrapper = mount(Parent as any);

      const numbers = wrapper.findAll('p.text-2xl.font-extrabold');
      expect(numbers[1].text()).toBe('20');

      await wrapper.find('[data-testid="increment"]').trigger('click');

      expect(numbers[1].text()).toBe('100');
    });
  });
});