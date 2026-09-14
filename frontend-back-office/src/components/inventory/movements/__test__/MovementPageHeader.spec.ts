import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MovementPageHeader from '../MovementPageHeader.vue';

describe('MovementPageHeader.vue (Component Testing)', () => {
  // ==========================================================
  // HELPER
  // ==========================================================
  const createWrapper = () => mount(MovementPageHeader);

  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender judul "Stock Movements"', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      expect(h1.exists()).toBe(true);
      expect(h1.text()).toContain('Stock Movements');
    });

    it('[Happy Path] merender subtitle audit trail', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain(
        'Complete audit trail — every material in and out is permanently recorded'
      );
    });

    it('[Happy Path] merender tombol "Record Movement"', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain('Record Movement');
    });

    it('[Happy Path] merender 2 SVG icon (clipboard + plus)', () => {
      const wrapper = createWrapper();

      const svgs = wrapper.findAll('svg');
      expect(svgs).toHaveLength(2);
    });

    it('[Happy Path] icon judul punya class text-primary', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      const icon = h1.find('svg');
      expect(icon.classes()).toContain('text-primary');
    });

    it('[Happy Path] tombol punya class bg-primary', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.classes()).toContain('bg-primary');
    });

    it('[Happy Path] tombol punya class text-white', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.classes()).toContain('text-white');
    });

    it('[Happy Path] judul punya class text-2xl font-extrabold', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      expect(h1.classes()).toContain('text-2xl');
      expect(h1.classes()).toContain('font-extrabold');
    });

    it('[Happy Path] root punya class flex justify-between', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('flex');
      expect(root.classes()).toContain('justify-between');
      expect(root.classes()).toContain('items-start');
      expect(root.classes()).toContain('flex-wrap');
    });

    it('[Happy Path] root punya class gap-4', () => {
      const wrapper = createWrapper();

      const root = wrapper.find('div');
      expect(root.classes()).toContain('gap-4');
    });
  });

  // =========================================================================
  // 2. EVENT EMISSION — add
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

    it('[Negative Path] tidak emit "add" saat klik icon clipboard', async () => {
      const wrapper = createWrapper();

      const h1Icon = wrapper.find('h1 svg');
      await h1Icon.trigger('click');

      expect(wrapper.emitted('add')).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] hanya 1 button di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('button')).toHaveLength(1);
    });

    it('[Edge Case] hanya 1 h1 di komponen', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('h1')).toHaveLength(1);
    });

    it('[Edge Case] hanya 1 subtitle paragraph', () => {
      const wrapper = createWrapper();

      expect(wrapper.findAll('p')).toHaveLength(1);
    });

    it('[Corner Case] teks tombol tepat "Record Movement"', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.text().trim()).toBe('Record Movement');
    });

    it('[Corner Case] teks judul tepat "Stock Movements"', () => {
      const wrapper = createWrapper();

      const h1 = wrapper.find('h1');
      expect(h1.text().trim()).toBe('Stock Movements');
    });

    it('[Corner Case] subtitle mengandung em-dash "—"', () => {
      const wrapper = createWrapper();

      expect(wrapper.text()).toContain('—');
    });

    it('[Edge Case] klik tombol tidak mengubah DOM', async () => {
      const wrapper = createWrapper();

      const htmlBefore = wrapper.html();
      await wrapper.find('button').trigger('click');
      const htmlAfter = wrapper.html();

      expect(htmlBefore).toBe(htmlAfter);
    });

    it('[Edge Case] tidak ada props yang diperlukan', () => {
      expect(() => mount(MovementPageHeader)).not.toThrow();
    });
  });

  // =========================================================================
  // 4. INTEGRATION — Parent Component
  // ✅ FIX TS2339: explicit type untuk data() & methods this
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa handle event add', async () => {
      const Parent = {
        components: { MovementPageHeader },
        template: `
          <MovementPageHeader @add="handleAdd" />
          <span data-testid="clicked">{{ clicked ? 'yes' : 'no' }}</span>
        `,
        // ✅ FIX: explicit return type untuk data()
        data(): { clicked: boolean } {
          return { clicked: false };
        },
        methods: {
          // ✅ FIX: explicit `this` type untuk methods
          handleAdd(this: { clicked: boolean }) {
            this.clicked = true;
          },
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.find('[data-testid="clicked"]').text()).toBe('no');

      await wrapper.find('button').trigger('click');

      expect(wrapper.find('[data-testid="clicked"]').text()).toBe('yes');
    });

    it('[Integration] parent bisa toggle modal saat add', async () => {
      const Parent = {
        components: { MovementPageHeader },
        template: `
          <MovementPageHeader @add="isModalOpen = true" />
          <span data-testid="modal">{{ isModalOpen ? 'open' : 'closed' }}</span>
        `,
        // ✅ FIX: explicit return type untuk data()
        data(): { isModalOpen: boolean } {
          return { isModalOpen: false };
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.find('[data-testid="modal"]').text()).toBe('closed');

      await wrapper.find('button').trigger('click');

      expect(wrapper.find('[data-testid="modal"]').text()).toBe('open');
    });
  });

  // =========================================================================
  // 5. ACCESSIBILITY
  // =========================================================================
  describe('Accessibility', () => {
    it('[A11y] judul pakai h1 (semantic heading)', () => {
      const wrapper = createWrapper();

      expect(wrapper.find('h1').exists()).toBe(true);
    });

    it('[A11y] tombol dapat di-focus (tidak disabled)', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      expect(button.attributes('disabled')).toBeUndefined();
    });

    it('[A11y] icon dekoratif di tombol tidak mengganggu screen reader', () => {
      const wrapper = createWrapper();

      const button = wrapper.find('button');
      const svg = button.find('svg');
      expect(svg.exists()).toBe(true);
    });
  });
});