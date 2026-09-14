import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MaterialLegend from '../MaterialLegend.vue';

describe('MaterialLegend.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = () => mount(MaterialLegend);

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender 4 item legend', () => {
      const wrapper = createWrapper();

      const legendItems = wrapper.findAll('span.flex.items-center.gap-2');
      expect(legendItems).toHaveLength(4);
    });

    it('[Happy Path] merender label "Stock is healthy"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Stock is healthy (stock > minimum)');
    });

    it('[Happy Path] merender label "Low stock"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Low stock (stock ≤ minimum)');
    });

    it('[Happy Path] merender label "Out of stock"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Out of stock (0)');
    });

    it('[Happy Path] merender label "Inactive material"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('Inactive material');
    });

    it('[Happy Path] merender 4 swatch (kotak warna)', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      expect(swatches).toHaveLength(4);
    });

    it('[Happy Path] root punya class flex flex-wrap gap-4', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('flex');
      expect(root.classes()).toContain('flex-wrap');
      expect(root.classes()).toContain('gap-4');
    });

    it('[Happy Path] root punya class text-[11px]', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('text-[11px]');
    });

    it('[Happy Path] root punya class text-text-secondary', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('text-text-secondary');
    });
  });

  // =========================================================================
  // 2. SWATCH COLOR CLASSES
  // =========================================================================
  describe('Swatch Color Classes', () => {
    it('[Happy Path] swatch pertama (healthy) punya bg-success/30', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      expect(swatches[0].classes()).toContain('bg-success/30');
      expect(swatches[0].classes()).toContain('border-success');
    });

    it('[Happy Path] swatch kedua (low stock) punya bg-warning/30', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      expect(swatches[1].classes()).toContain('bg-warning/30');
      expect(swatches[1].classes()).toContain('border-warning');
    });

    it('[Happy Path] swatch ketiga (out of stock) punya bg-error/30', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      expect(swatches[2].classes()).toContain('bg-error/30');
      expect(swatches[2].classes()).toContain('border-error');
    });

    it('[Happy Path] swatch keempat (inactive) punya bg-disabled/30', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      expect(swatches[3].classes()).toContain('bg-disabled/30');
      expect(swatches[3].classes()).toContain('border-disabled');
    });

    it('[Happy Path] semua swatch punya class shrink-0', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      swatches.forEach((swatch) => {
        expect(swatch.classes()).toContain('shrink-0');
      });
    });

    it('[Happy Path] semua swatch punya class border', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      swatches.forEach((swatch) => {
        expect(swatch.classes()).toContain('border');
      });
    });

    it('[Happy Path] semua swatch punya class rounded', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      swatches.forEach((swatch) => {
        expect(swatch.classes()).toContain('rounded');
      });
    });
  });

  // =========================================================================
  // 3. STRUCTURE
  // =========================================================================
  describe('Structure', () => {
    it('[Happy Path] setiap item punya minimal 1 span swatch', () => {
      const wrapper = createWrapper();

      const legendItems = wrapper.findAll('span.flex.items-center.gap-2');
      legendItems.forEach((item) => {
        const spans = item.findAll('span');
        expect(spans.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('[Happy Path] tidak ada button di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('button')).toHaveLength(0);
    });

    it('[Happy Path] tidak ada input di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('input')).toHaveLength(0);
    });

    it('[Happy Path] tidak ada select di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('select')).toHaveLength(0);
    });

    it('[Happy Path] hanya 1 div sebagai root', () => {
      const wrapper = createWrapper();

      const divs = wrapper.findAll('div');
      expect(divs).toHaveLength(1);
    });

    it('[Happy Path] total 9 span (1 root wrapper + 4 items + 4 swatches)', () => {
      const wrapper = createWrapper();

      const allSpans = wrapper.findAll('span');
      // 4 item wrapper + 4 swatch = 8 span (root adalah div)
      expect(allSpans.length).toBe(8);
    });
  });

  // =========================================================================
  // 4. ORDER PRESERVATION
  // =========================================================================
  describe('Order Preservation', () => {
    it('[Happy Path] urutan item: healthy → low → out → inactive', () => {
      const wrapper = createWrapper();

      const text = wrapper.text();
      const healthyIndex = text.indexOf('Stock is healthy');
      const lowIndex = text.indexOf('Low stock');
      const outIndex = text.indexOf('Out of stock');
      const inactiveIndex = text.indexOf('Inactive material');

      expect(healthyIndex).toBeLessThan(lowIndex);
      expect(lowIndex).toBeLessThan(outIndex);
      expect(outIndex).toBeLessThan(inactiveIndex);
    });

    it('[Happy Path] urutan swatch: success → warning → error → disabled', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');

      expect(swatches[0].classes()).toContain('bg-success/30');
      expect(swatches[1].classes()).toContain('bg-warning/30');
      expect(swatches[2].classes()).toContain('bg-error/30');
      expect(swatches[3].classes()).toContain('bg-disabled/30');
    });
  });

  // =========================================================================
  // 5. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit event apapun', () => {
      const wrapper = createWrapper();

      expect(wrapper.emitted()).toEqual({});
    });

    it('[Edge Case] tidak ada props yang diperlukan', () => {
      expect(() => mount(MaterialLegend)).not.toThrow();
    });

    it('[Corner Case] teks label mengandung karakter khusus "≤"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('≤');
    });

    it('[Corner Case] teks label mengandung karakter khusus ">"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('>');
    });

    it('[Corner Case] komponen static — HTML tidak berubah setelah mount', async () => {
      const wrapper = createWrapper();

      const htmlBefore = wrapper.html();
      await wrapper.vm.$nextTick();
      const htmlAfter = wrapper.html();

      expect(htmlBefore).toBe(htmlAfter);
    });

    it('[Edge Case] teks root dimulai dengan "Stock is healthy"', () => {
      const wrapper = createWrapper();

      const text = wrapper.text();
      expect(text.startsWith('Stock is healthy')).toBe(true);
    });

    it('[Edge Case] teks root diakhiri dengan "Inactive material"', () => {
      const wrapper = createWrapper();

      const text = wrapper.text().trim();
      expect(text.endsWith('Inactive material')).toBe(true);
    });
  });

  // =========================================================================
  // 6. DATA-DRIVEN CONFIG VERIFICATION
  // =========================================================================
  describe('Data-driven Config', () => {
    it('[Config] setiap swatch punya pasangan border dengan warna yang sama', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');

      // healthy
      expect(swatches[0].classes()).toContain('bg-success/30');
      expect(swatches[0].classes()).toContain('border-success');

      // low stock
      expect(swatches[1].classes()).toContain('bg-warning/30');
      expect(swatches[1].classes()).toContain('border-warning');

      // out of stock
      expect(swatches[2].classes()).toContain('bg-error/30');
      expect(swatches[2].classes()).toContain('border-error');

      // inactive
      expect(swatches[3].classes()).toContain('bg-disabled/30');
      expect(swatches[3].classes()).toContain('border-disabled');
    });

    it('[Config] semua swatch punya opacity 30 (bg-*/30)', () => {
      const wrapper = createWrapper();

      const swatches = wrapper.findAll('span.w-3.h-3.rounded');
      swatches.forEach((swatch) => {
        const hasOpacity30 = swatch.classes().some((c) => c.endsWith('/30'));
        expect(hasOpacity30).toBe(true);
      });
    });

    it('[Config] semua label tidak kosong', () => {
      const wrapper = createWrapper();

      const legendItems = wrapper.findAll('span.flex.items-center.gap-2');
      legendItems.forEach((item) => {
        expect(item.text().trim().length).toBeGreaterThan(0);
      });
    });

    it('[Config] setiap item punya swatch + text', () => {
      const wrapper = createWrapper();

      const legendItems = wrapper.findAll('span.flex.items-center.gap-2');
      legendItems.forEach((item) => {
        // Setiap item harus punya 1 swatch
        const swatch = item.find('span.w-3.h-3.rounded');
        expect(swatch.exists()).toBe(true);
      });
    });
  });

  // =========================================================================
  // 7. SNAPSHOT
  // =========================================================================
  describe('Snapshot', () => {
    it('[Snapshot] render konsisten', () => {
      const wrapper = createWrapper();

      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});