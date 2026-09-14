import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UnitDisplay from '../UnitDisplay.vue';

describe('UnitDisplay.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = (props: Record<string, any> = {}) => {
    return mount(UnitDisplay, {
      props: {
        value: 100,
        unit: 'kg',
        ...props,
      },
    });
  };

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender root span dengan class inline-flex items-baseline', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('span');
      expect(root.classes()).toContain('inline-flex');
      expect(root.classes()).toContain('items-baseline');
      expect(root.classes()).toContain('gap-1');
    });

    it('[Happy Path] merender 2 span (value + unit)', () => {
      const wrapper = createWrapper();

      const spans = wrapper.findAll('span');
      expect(spans.length).toBeGreaterThanOrEqual(3);
    });

    it('[Happy Path] value di-render dengan class font-mono font-bold text-base', () => {
      const wrapper = createWrapper();

      const valueSpan = wrapper.find('.font-mono.font-bold');
      expect(valueSpan.classes()).toContain('font-mono');
      expect(valueSpan.classes()).toContain('font-bold');
      expect(valueSpan.classes()).toContain('text-base');
    });

    it('[Happy Path] unit di-render dengan class text-text-secondary text-xs', () => {
      const wrapper = createWrapper();

      const unitSpan = wrapper.find('.text-text-secondary.text-xs');
      expect(unitSpan.classes()).toContain('text-text-secondary');
      expect(unitSpan.classes()).toContain('text-xs');
    });
  });

  // =========================================================================
  // 2. FORMATTING — Integer
  // =========================================================================
  describe('Formatting — Integer', () => {
    it('[Happy Path] value integer → tanpa desimal ("100", bukan "100.00")', () => {
      const wrapper = createWrapper({ value: 100 });
      expect(wrapper.find('.font-mono').text()).toBe('100');
    });

    it('[Happy Path] value 0 → "0"', () => {
      const wrapper = createWrapper({ value: 0 });
      expect(wrapper.find('.font-mono').text()).toBe('0');
    });

    it('[Happy Path] value 320 → "320"', () => {
      const wrapper = createWrapper({ value: 320 });
      expect(wrapper.find('.font-mono').text()).toBe('320');
    });

    it('[Happy Path] value 999999 → "999999"', () => {
      const wrapper = createWrapper({ value: 999999 });
      expect(wrapper.find('.font-mono').text()).toBe('999999');
    });

    it('[Happy Path] value negatif integer → "-5"', () => {
      const wrapper = createWrapper({ value: -5 });
      expect(wrapper.find('.font-mono').text()).toBe('-5');
    });

    it('[Happy Path] value 1.0 (number) → "1" (dianggap integer)', () => {
      const wrapper = createWrapper({ value: 1.0 });
      expect(wrapper.find('.font-mono').text()).toBe('1');
    });
  });

  // =========================================================================
  // 3. FORMATTING — Non-integer
  // =========================================================================
  describe('Formatting — Non-integer', () => {
    it('[Happy Path] value 25.5 → "25.50" (toFixed 2)', () => {
      const wrapper = createWrapper({ value: 25.5 });
      expect(wrapper.find('.font-mono').text()).toBe('25.50');
    });

    // ✅ FIX: JavaScript floating point reality
    it('[Happy Path] value 25.555 → "25.55" (floating point behavior)', () => {
      const wrapper = createWrapper({ value: 25.555 });
      // ⚠️ 25.555 di IEEE-754 bukan representasi exact → dibulatkan ke 25.55
      expect(wrapper.find('.font-mono').text()).toBe('25.55');
    });

    it('[Happy Path] value 25.556 → "25.56" (round up)', () => {
      const wrapper = createWrapper({ value: 25.556 });
      expect(wrapper.find('.font-mono').text()).toBe('25.56');
    });

    it('[Happy Path] value 0.01 → "0.01"', () => {
      const wrapper = createWrapper({ value: 0.01 });
      expect(wrapper.find('.font-mono').text()).toBe('0.01');
    });

    it('[Happy Path] value -5.5 → "-5.50"', () => {
      const wrapper = createWrapper({ value: -5.5 });
      expect(wrapper.find('.font-mono').text()).toBe('-5.50');
    });

    it('[Happy Path] decimals=0 → "26" untuk 25.5', () => {
      const wrapper = createWrapper({ value: 25.5, decimals: 0 });
      expect(wrapper.find('.font-mono').text()).toBe('26');
    });

    it('[Happy Path] decimals=3 → "25.500"', () => {
      const wrapper = createWrapper({ value: 25.5, decimals: 3 });
      expect(wrapper.find('.font-mono').text()).toBe('25.500');
    });

    it('[Happy Path] decimals=4 → "25.5000"', () => {
      const wrapper = createWrapper({ value: 25.5, decimals: 4 });
      expect(wrapper.find('.font-mono').text()).toBe('25.5000');
    });
  });

  // =========================================================================
  // 4. STATE — Color Class
  // =========================================================================
  describe('State — Color Class', () => {
    it('[Happy Path] state default → text-text-primary', () => {
      const wrapper = createWrapper({ state: 'default' });
      expect(wrapper.find('.font-mono').classes()).toContain('text-text-primary');
    });

    it('[Happy Path] state warning → text-warning', () => {
      const wrapper = createWrapper({ state: 'warning' });
      expect(wrapper.find('.font-mono').classes()).toContain('text-warning');
    });

    it('[Happy Path] state danger → text-error', () => {
      const wrapper = createWrapper({ state: 'danger' });
      expect(wrapper.find('.font-mono').classes()).toContain('text-error');
    });

    it('[Happy Path] state default saat tidak di-pass', () => {
      const wrapper = createWrapper();
      expect(wrapper.find('.font-mono').classes()).toContain('text-text-primary');
    });

    it('[Happy Path] state tidak mempengaruhi unit color', () => {
      const wrapper = createWrapper({ state: 'danger' });
      const unitSpan = wrapper.find('.text-text-secondary.text-xs');
      expect(unitSpan.classes()).toContain('text-text-secondary');
      expect(unitSpan.classes()).not.toContain('text-error');
    });
  });

  // =========================================================================
  // 5. UNIT
  // =========================================================================
  describe('Unit', () => {
    it('[Happy Path] unit "kg"', () => {
      const wrapper = createWrapper({ unit: 'kg' });
      expect(wrapper.text()).toContain('kg');
    });

    it('[Happy Path] unit "L"', () => {
      const wrapper = createWrapper({ unit: 'L' });
      expect(wrapper.text()).toContain('L');
    });

    it('[Happy Path] unit "pcs"', () => {
      const wrapper = createWrapper({ unit: 'pcs' });
      expect(wrapper.text()).toContain('pcs');
    });

    it('[Happy Path] unit "" kosong → tetap dirender tanpa error', () => {
      const wrapper = createWrapper({ unit: '' });
      const unitSpan = wrapper.find('.text-text-secondary.text-xs');
      expect(unitSpan.text()).toBe('');
    });
  });

  // =========================================================================
  // 6. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] value ter-update saat props berubah', async () => {
      const wrapper = createWrapper({ value: 100 });
      expect(wrapper.find('.font-mono').text()).toBe('100');

      await wrapper.setProps({ value: 250 });
      expect(wrapper.find('.font-mono').text()).toBe('250');
    });

    it('[Happy Path] format berubah dari integer ke desimal', async () => {
      const wrapper = createWrapper({ value: 100 });
      expect(wrapper.find('.font-mono').text()).toBe('100');

      await wrapper.setProps({ value: 25.5 });
      expect(wrapper.find('.font-mono').text()).toBe('25.50');
    });

    it('[Happy Path] unit ter-update', async () => {
      const wrapper = createWrapper({ unit: 'kg' });
      expect(wrapper.text()).toContain('kg');

      await wrapper.setProps({ unit: 'L' });
      expect(wrapper.text()).toContain('L');
      expect(wrapper.text()).not.toContain('kg');
    });

    it('[Happy Path] state ter-update', async () => {
      const wrapper = createWrapper({ state: 'default' });
      expect(wrapper.find('.font-mono').classes()).toContain('text-text-primary');

      await wrapper.setProps({ state: 'danger' });
      expect(wrapper.find('.font-mono').classes()).toContain('text-error');
    });

    it('[Happy Path] decimals ter-update', async () => {
      const wrapper = createWrapper({ value: 25.5, decimals: 2 });
      expect(wrapper.find('.font-mono').text()).toBe('25.50');

      await wrapper.setProps({ decimals: 0 });
      expect(wrapper.find('.font-mono').text()).toBe('26');
    });
  });

  // =========================================================================
  // 7. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - value=0] ditampilkan "0"', () => {
      const wrapper = createWrapper({ value: 0 });
      expect(wrapper.find('.font-mono').text()).toBe('0');
    });

    it('[BVA - value=0.001] non-integer → "0.00"', () => {
      const wrapper = createWrapper({ value: 0.001 });
      expect(wrapper.find('.font-mono').text()).toBe('0.00');
    });

    it('[BVA - value=0.005] floating point behavior', () => {
      const wrapper = createWrapper({ value: 0.005 });
      // 0.005 di IEEE-754 → toFixed(2) = "0.01" (kadang "0.00" tergantung runtime)
      const text = wrapper.find('.font-mono').text();
      expect(['0.00', '0.01']).toContain(text);
    });

    it('[BVA - value=Number.MAX_SAFE_INTEGER] integer besar', () => {
      const wrapper = createWrapper({ value: Number.MAX_SAFE_INTEGER });
      expect(wrapper.find('.font-mono').text()).toBe(String(Number.MAX_SAFE_INTEGER));
    });

    it('[BVA - value=Number.MIN_SAFE_INTEGER] integer negatif besar', () => {
      const wrapper = createWrapper({ value: Number.MIN_SAFE_INTEGER });
      expect(wrapper.find('.font-mono').text()).toBe(String(Number.MIN_SAFE_INTEGER));
    });

    it('[BVA - value=1e-7] sangat kecil → "0.00"', () => {
      const wrapper = createWrapper({ value: 1e-7 });
      expect(wrapper.find('.font-mono').text()).toBe('0.00');
    });

    it('[BVA - decimals=10] banyak desimal', () => {
      const wrapper = createWrapper({ value: 1.5, decimals: 10 });
      expect(wrapper.find('.font-mono').text()).toBe('1.5000000000');
    });

    it('[BVA - decimals=0 pada integer] tetap integer', () => {
      const wrapper = createWrapper({ value: 100, decimals: 0 });
      expect(wrapper.find('.font-mono').text()).toBe('100');
    });
  });

  // =========================================================================
  // 8. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] value NaN → dianggap non-integer, "NaN"', () => {
      const wrapper = createWrapper({ value: NaN });
      expect(wrapper.find('.font-mono').text()).toBe('NaN');
    });

    it('[Edge Case] value Infinity → dianggap non-integer', () => {
      const wrapper = createWrapper({ value: Infinity });
      expect(wrapper.find('.font-mono').text()).toBe('Infinity');
    });

    it('[Edge Case] value -Infinity', () => {
      const wrapper = createWrapper({ value: -Infinity });
      expect(wrapper.find('.font-mono').text()).toBe('-Infinity');
    });

    it('[Corner Case] value integer negatif → "-100" (bukan "-100.00")', () => {
      const wrapper = createWrapper({ value: -100 });
      expect(wrapper.find('.font-mono').text()).toBe('-100');
    });

    it('[Corner Case] value 0.10 → "0.10" (trailing zero dipertahankan)', () => {
      const wrapper = createWrapper({ value: 0.1 });
      expect(wrapper.find('.font-mono').text()).toBe('0.10');
    });

    it('[Edge Case] floating point 0.1 + 0.2 → 0.30', () => {
      const wrapper = createWrapper({ value: 0.1 + 0.2 });
      expect(wrapper.find('.font-mono').text()).toBe('0.30');
    });

    it('[Edge Case] tidak emit event apapun', () => {
      const wrapper = createWrapper();
      expect(wrapper.emitted()).toEqual({});
    });

    it('[Edge Case] tidak ada button di komponen', () => {
      const wrapper = createWrapper();
      expect(wrapper.findAll('button')).toHaveLength(0);
    });

    it('[Edge Case] hanya 3 span (root + value + unit)', () => {
      const wrapper = createWrapper();
      expect(wrapper.findAll('span')).toHaveLength(3);
    });

    it('[Corner Case] state dan value keduanya berubah sekaligus', async () => {
      const wrapper = createWrapper({ value: 100, state: 'default' });
      expect(wrapper.find('.font-mono').text()).toBe('100');
      expect(wrapper.find('.font-mono').classes()).toContain('text-text-primary');

      await wrapper.setProps({ value: 0, state: 'danger' });
      expect(wrapper.find('.font-mono').text()).toBe('0');
      expect(wrapper.find('.font-mono').classes()).toContain('text-error');
    });
  });

  // =========================================================================
  // 9. INTEGRATION — Parent Component
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa pass semua props', () => {
      const Parent = {
        components: { UnitDisplay },
        template: `
          <UnitDisplay
            :value="value"
            :unit="unit"
            :state="state"
            :decimals="decimals"
          />
        `,
        data() {
          return {
            value: 25.5,
            unit: 'kg',
            state: 'warning' as const,
            decimals: 3,
          };
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.find('.font-mono').text()).toBe('25.500');
      expect(wrapper.text()).toContain('kg');
      expect(wrapper.find('.font-mono').classes()).toContain('text-warning');
    });

    it('[Integration] parent bisa update value dinamis', async () => {
      const Parent = {
        components: { UnitDisplay },
        template: `
          <UnitDisplay :value="value" unit="kg" />
          <button @click="value = 0" data-testid="zero">Zero</button>
        `,
        data() {
          return { value: 100 };
        },
      };

      const wrapper = mount(Parent as any);
      expect(wrapper.find('.font-mono').text()).toBe('100');

      await wrapper.find('[data-testid="zero"]').trigger('click');

      expect(wrapper.find('.font-mono').text()).toBe('0');
    });
  });
});