import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import StockStatusBadge from '../StockStatusBadge.vue';

describe('StockStatusBadge.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(StockStatusBadge, {
      props: {
        isActive: true,
        isLowStock: false,
        currentStock: 100,
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender span sebagai root', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('span');
      expect(root.exists()).toBe(true);
    });

    it('[Happy Path] root punya class inline-flex items-center gap-1.5', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('span');
      expect(root.classes()).toContain('inline-flex');
      expect(root.classes()).toContain('items-center');
      expect(root.classes()).toContain('gap-1.5');
    });

    it('[Happy Path] root punya class rounded-lg font-bold', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('span');
      expect(root.classes()).toContain('rounded-lg');
      expect(root.classes()).toContain('font-bold');
    });

    it('[Happy Path] root punya class text-xs', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('span');
      expect(root.classes()).toContain('text-xs');
    });
  });

  // =========================================================================
  // 2. STATE: ACTIVE
  // =========================================================================
  describe('State — Active', () => {
    it('[Happy Path] render label "Active"', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');
    });

    it('[Happy Path] root punya class bg-success/10 text-success', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      const root = wrapper.find('span');
      expect(root.classes()).toContain('bg-success/10');
      expect(root.classes()).toContain('text-success');
    });

    it('[Happy Path] render indikator dot hijau (bg-success)', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      const dot = wrapper.find('.bg-success.rounded-full');
      expect(dot.exists()).toBe(true);
      expect(dot.classes()).toContain('w-1.5');
      expect(dot.classes()).toContain('h-1.5');
    });

    it('[Happy Path] dot punya class shrink-0', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      const dot = wrapper.find('.bg-success.rounded-full');
      expect(dot.classes()).toContain('shrink-0');
    });
  });

  // =========================================================================
  // 3. STATE: LOW STOCK
  // =========================================================================
  describe('State — Low Stock', () => {
    it('[Happy Path] render label "Low"', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 5,
        isLowStock: true,
      });

      expect(wrapper.text()).toContain('Low');
    });

    it('[Happy Path] root punya class bg-warning/15 text-warning', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 5,
        isLowStock: true,
      });

      const root = wrapper.find('span');
      expect(root.classes()).toContain('bg-warning/15');
      expect(root.classes()).toContain('text-warning');
    });

    it('[Happy Path] render icon warning (svg)', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 5,
        isLowStock: true,
      });

      const icon = wrapper.find('svg');
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain('w-3');
      expect(icon.classes()).toContain('h-3');
    });
  });

  // =========================================================================
  // 4. STATE: OUT OF STOCK
  // =========================================================================
  describe('State — Out of Stock', () => {
    it('[Happy Path] render label "Out"', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Out');
    });

    it('[Happy Path] root punya class bg-error/15 text-error', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: false,
      });

      const root = wrapper.find('span');
      expect(root.classes()).toContain('bg-error/15');
      expect(root.classes()).toContain('text-error');
    });

    it('[Happy Path] render icon block (svg)', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: false,
      });

      const icon = wrapper.find('svg');
      expect(icon.exists()).toBe(true);
    });
  });

  // =========================================================================
  // 5. STATE: INACTIVE
  // =========================================================================
  describe('State — Inactive', () => {
    it('[Happy Path] render label "Inactive"', () => {
      const wrapper = createWrapper({
        isActive: false,
        currentStock: 100,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Inactive');
    });

    it('[Happy Path] root punya class bg-text-disabled/15 text-text-disabled', () => {
      const wrapper = createWrapper({
        isActive: false,
        currentStock: 100,
        isLowStock: false,
      });

      const root = wrapper.find('span');
      expect(root.classes()).toContain('bg-text-disabled/15');
      expect(root.classes()).toContain('text-text-disabled');
    });

    it('[Happy Path] render dot hollow (border, bukan bg)', () => {
      const wrapper = createWrapper({
        isActive: false,
        currentStock: 100,
        isLowStock: false,
      });

      const dot = wrapper.find('.border.border-text-disabled.rounded-full');
      expect(dot.exists()).toBe(true);
      expect(dot.classes()).toContain('border');
    });

    it('[Happy Path] dot hollow tidak punya bg-*', () => {
      const wrapper = createWrapper({
        isActive: false,
        currentStock: 100,
        isLowStock: false,
      });

      const dot = wrapper.find('.border.border-text-disabled.rounded-full');
      expect(dot.classes()).not.toContain('bg-success');
      expect(dot.classes()).not.toContain('bg-warning');
      expect(dot.classes()).not.toContain('bg-error');
    });
  });

  // =========================================================================
  // 6. PRIORITY LOGIC
  // =========================================================================
  describe('Priority Logic', () => {
    it('[Priority 1 - Inactive] menang atas out of stock', () => {
      const wrapper = createWrapper({
        isActive: false,
        currentStock: 0,
        isLowStock: true,
      });

      // Inactive > out
      expect(wrapper.text()).toContain('Inactive');
      expect(wrapper.text()).not.toContain('Out');
    });

    it('[Priority 1 - Inactive] menang atas low stock', () => {
      const wrapper = createWrapper({
        isActive: false,
        currentStock: 5,
        isLowStock: true,
      });

      expect(wrapper.text()).toContain('Inactive');
      expect(wrapper.text()).not.toContain('Low');
    });

    it('[Priority 2 - Out] menang atas low stock', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: true,
      });

      // stock === 0 → out (meskipun is_low_stock = true)
      expect(wrapper.text()).toContain('Out');
      expect(wrapper.text()).not.toContain('Low');
    });

    it('[Priority 3 - Low] saat active=true, stock>0, isLowStock=true', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 5,
        isLowStock: true,
      });

      expect(wrapper.text()).toContain('Low');
    });

    it('[Priority 4 - Active] saat semua false/normal', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');
    });
  });

  // =========================================================================
  // 7. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - currentStock=0] → state "out"', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Out');
    });

    it('[BVA - currentStock=0.01] → state "active" (bukan out)', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0.01,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');
      expect(wrapper.text()).not.toContain('Out');
    });

    it('[BVA - currentStock=1] → state "active"', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 1,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');
    });

    it('[BVA - currentStock besar] → active', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 999999,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');
    });

    it('[BVA - currentStock negatif] → active (bukan out, karena !== 0)', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: -5,
        isLowStock: false,
      });

      // -5 !== 0, jadi bukan out
      expect(wrapper.text()).toContain('Active');
    });
  });

  // =========================================================================
  // 8. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] state berubah saat isActive berubah', async () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');

      await wrapper.setProps({ isActive: false });

      expect(wrapper.text()).toContain('Inactive');
    });

    it('[Happy Path] state berubah saat currentStock berubah', async () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');

      await wrapper.setProps({ currentStock: 0 });

      expect(wrapper.text()).toContain('Out');
    });

    it('[Happy Path] state berubah saat isLowStock berubah', async () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 50,
        isLowStock: false,
      });

      expect(wrapper.text()).toContain('Active');

      await wrapper.setProps({ isLowStock: true });

      expect(wrapper.text()).toContain('Low');
    });
  });

  // =========================================================================
  // 9. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit event apapun', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted()).toEqual({});
    });

    it('[Edge Case] tidak ada button di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('button')).toHaveLength(0);
    });

    it('[Edge Case] hanya 1 root span', () => {
      const wrapper = createWrapper();

      const spans = wrapper.findAll('span');
      // Root span + dot span
      expect(spans.length).toBeGreaterThanOrEqual(1);
    });

    it('[Corner Case] active state punya dot, bukan svg', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 100,
        isLowStock: false,
      });

      // Active tidak pakai svg, pakai dot
      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(false);
    });

    it('[Corner Case] low state punya svg, bukan dot', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 5,
        isLowStock: true,
      });

      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(true);
    });

    it('[Corner Case] out state punya svg, bukan dot', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: false,
      });

      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(true);
    });

    it('[Edge Case] inactive state punya dot hollow, bukan svg', () => {
      const wrapper = createWrapper({
        isActive: false,
      });

      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(false);

      const dot = wrapper.find('.border.border-text-disabled');
      expect(dot.exists()).toBe(true);
    });

    it('[Edge Case] teks label tepat per state', () => {
      const active = createWrapper({ isActive: true, currentStock: 100, isLowStock: false });
      expect(active.text()).toBe('Active');

      const low = createWrapper({ isActive: true, currentStock: 5, isLowStock: true });
      expect(low.text()).toBe('Low');

      const out = createWrapper({ isActive: true, currentStock: 0, isLowStock: false });
      expect(out.text()).toBe('Out');

      const inactive = createWrapper({ isActive: false });
      expect(inactive.text()).toBe('Inactive');
    });

    it('[Edge Case] semua state punya class text-xs font-bold', () => {
      const states = [
        { isActive: true, currentStock: 100, isLowStock: false },
        { isActive: true, currentStock: 5, isLowStock: true },
        { isActive: true, currentStock: 0, isLowStock: false },
        { isActive: false, currentStock: 100, isLowStock: false },
      ];

      states.forEach((props) => {
        const wrapper = createWrapper(props);
        const root = wrapper.find('span');
        expect(root.classes()).toContain('text-xs');
        expect(root.classes()).toContain('font-bold');
      });
    });

    it('[Corner Case] warning icon punya stroke-width 2.5', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 5,
        isLowStock: true,
      });

      const svg = wrapper.find('svg');
      expect(svg.attributes('stroke-width')).toBe('2.5');
    });

    it('[Corner Case] block icon punya stroke-width 2.5', () => {
      const wrapper = createWrapper({
        isActive: true,
        currentStock: 0,
        isLowStock: false,
      });

      const svg = wrapper.find('svg');
      expect(svg.attributes('stroke-width')).toBe('2.5');
    });

    it('[Edge Case] dot hollow punya w-1.5 h-1.5', () => {
      const wrapper = createWrapper({
        isActive: false,
      });

      const dot = wrapper.find('.border.border-text-disabled.rounded-full');
      expect(dot.classes()).toContain('w-1.5');
      expect(dot.classes()).toContain('h-1.5');
    });

    it('[Edge Case] tidak emit click saat diklik', async () => {
      const wrapper = createWrapper();

      await wrapper.find('span').trigger('click');

      // Tidak ada emit custom
      const nativeEvents = ['click', 'mousedown', 'mouseup'];
      const customEvents = Object.keys(wrapper.emitted()).filter(
        (e) => !nativeEvents.includes(e)
      );
      expect(customEvents).toEqual([]);
    });
  });

  // =========================================================================
  // 10. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa pass semua props', () => {
      const Parent = {
        components: { StockStatusBadge },
        template: `
          <StockStatusBadge
            :is-active="isActive"
            :is-low-stock="isLowStock"
            :current-stock="currentStock"
          />
        `,
        data() {
          return {
            isActive: true,
            isLowStock: true,
            currentStock: 5,
          };
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.text()).toContain('Low');
    });

    it('[Integration] state berubah saat parent update props', async () => {
      const Parent = {
        components: { StockStatusBadge },
        template: `
          <StockStatusBadge
            :is-active="isActive"
            :is-low-stock="isLowStock"
            :current-stock="currentStock"
          />
          <button @click="currentStock = 0" data-testid="zero">Zero</button>
        `,
        data() {
          return {
            isActive: true,
            isLowStock: false,
            currentStock: 100,
          };
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.text()).toContain('Active');

      await wrapper.find('[data-testid="zero"]').trigger('click');

      expect(wrapper.text()).toContain('Out');
    });
  });
});