import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CategoryHeader from '../CategoryPageHeader.vue';

describe('CategoryHeader.vue (Component Testing)', () => {
  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender judul "Raw Material Categories"', () => {
      const wrapper = mount(CategoryHeader);

      const h1 = wrapper.find('h1');
      expect(h1.exists()).toBe(true);
      expect(h1.text()).toContain('Raw Material Categories');
    });

    it('[Happy Path] merender subtitle deskripsi', () => {
      const wrapper = mount(CategoryHeader);

      expect(wrapper.text()).toContain(
        'Group raw materials to keep your warehouse organized and easy to browse'
      );
    });

    it('[Happy Path] merender tombol "Add Category"', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain('Add Category');
    });

    it('[Happy Path] tombol memiliki atribut aria-label', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Add new category');
    });

    it('[Happy Path] merender 2 SVG icon (folder + plus)', () => {
      const wrapper = mount(CategoryHeader);

      const svgs = wrapper.findAll('svg');
      expect(svgs).toHaveLength(2);
    });

    it('[Happy Path] SVG folder punya class text-primary', () => {
      const wrapper = mount(CategoryHeader);

      const svgs = wrapper.findAll('svg');
      const folderIcon = svgs[0];
      expect(folderIcon.classes()).toContain('text-primary');
    });

    it('[Happy Path] SVG plus di dalam tombol punya aria-hidden', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      const svgInButton = button.find('svg');
      expect(svgInButton.attributes('aria-hidden')).toBe('true');
    });

    it('[Happy Path] root element punya class flex justify-between', () => {
      const wrapper = mount(CategoryHeader);

      const root = wrapper.find('div');
      expect(root.classes()).toContain('flex');
      expect(root.classes()).toContain('justify-between');
      expect(root.classes()).toContain('items-start');
    });

    it('[Happy Path] judul h1 punya class text-2xl font-extrabold', () => {
      const wrapper = mount(CategoryHeader);

      const h1 = wrapper.find('h1');
      expect(h1.classes()).toContain('text-2xl');
      expect(h1.classes()).toContain('font-extrabold');
    });

    it('[Happy Path] tombol punya class bg-primary', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      expect(button.classes()).toContain('bg-primary');
    });
  });

  // =========================================================================
  // 2. EVENT EMISSION — add
  // =========================================================================
  describe('Event Emission — add', () => {
    it('[Happy Path] emit "add" saat tombol diklik', async () => {
      const wrapper = mount(CategoryHeader);

      await wrapper.find('button').trigger('click');

      const emitted = wrapper.emitted('add');
      expect(emitted).toBeTruthy();
      expect(emitted).toHaveLength(1);
    });

    it('[Happy Path] emit "add" tanpa payload', async () => {
      const wrapper = mount(CategoryHeader);

      await wrapper.find('button').trigger('click');

      const emitted = wrapper.emitted('add');
      // Event tanpa payload → array kosong
      expect(emitted![0]).toEqual([]);
    });

    it('[Happy Path] emit "add" berkali-kali saat tombol diklik multiple', async () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      await button.trigger('click');
      await button.trigger('click');
      await button.trigger('click');

      const emitted = wrapper.emitted('add');
      expect(emitted).toHaveLength(3);
    });

    it('[Negative Path] tidak emit "add" saat komponen di-mount', () => {
      const wrapper = mount(CategoryHeader);

      expect(wrapper.emitted('add')).toBeUndefined();
    });

    it('[Negative Path] tidak emit "add" saat klik di luar tombol', async () => {
      const wrapper = mount(CategoryHeader);

      const h1 = wrapper.find('h1');
      await h1.trigger('click');

      expect(wrapper.emitted('add')).toBeUndefined();
    });

    it('[Negative Path] tidak emit "add" saat klik icon folder', async () => {
      const wrapper = mount(CategoryHeader);

      const svgs = wrapper.findAll('svg');
      const folderIcon = svgs[0];
      await folderIcon.trigger('click');

      expect(wrapper.emitted('add')).toBeUndefined();
    });
  });

  // =========================================================================
  // 3. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] teks tombol tepat "Add Category" (setelah trim)', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      expect(button.text().trim()).toBe('Add Category');
    });

    it('[Edge Case] teks judul tepat "Raw Material Categories" (setelah trim)', () => {
      const wrapper = mount(CategoryHeader);

      const h1 = wrapper.find('h1');
      expect(h1.text().trim()).toBe('Raw Material Categories');
    });

    it('[Corner Case] tombol bisa di-query via aria-label', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('[aria-label="Add new category"]');
      expect(button.exists()).toBe(true);
    });

    it('[Corner Case] hanya 1 button di komponen', () => {
      const wrapper = mount(CategoryHeader);

      const buttons = wrapper.findAll('button');
      expect(buttons).toHaveLength(1);
    });

    it('[Corner Case] hanya 1 h1 di komponen', () => {
      const wrapper = mount(CategoryHeader);

      const h1s = wrapper.findAll('h1');
      expect(h1s).toHaveLength(1);
    });

    it('[Corner Case] hanya 1 subtitle paragraph', () => {
      const wrapper = mount(CategoryHeader);

      const paragraphs = wrapper.findAll('p');
      expect(paragraphs).toHaveLength(1);
    });

    it('[Edge Case] klik tombol tidak mengubah DOM', async () => {
      const wrapper = mount(CategoryHeader);

      const htmlBefore = wrapper.html();
      await wrapper.find('button').trigger('click');
      const htmlAfter = wrapper.html();

      expect(htmlBefore).toBe(htmlAfter);
    });
  });

  // =========================================================================
  // 4. INTEGRATION — Parent Component Pattern
  // =========================================================================
  describe('Integration — Parent Component', () => {
    it('[Integration] parent bisa handle event add dan update state', async () => {
      const Parent = {
        components: { CategoryHeader },
        template: `
          <CategoryHeader @add="handleAdd" />
          <span data-testid="count">{{ count }}</span>
        `,
        data() {
          return { count: 0 };
        },
        methods: {
          handleAdd() {
            this.count++;
          },
        },
      };

      const wrapper = mount(Parent as any);

      expect(wrapper.find('[data-testid="count"]').text()).toBe('0');

      await wrapper.find('button').trigger('click');
      expect(wrapper.find('[data-testid="count"]').text()).toBe('1');

      await wrapper.find('button').trigger('click');
      expect(wrapper.find('[data-testid="count"]').text()).toBe('2');
    });

    it('[Integration] parent bisa toggle state saat add event', async () => {
      const Parent = {
        components: { CategoryHeader },
        template: `
          <CategoryHeader @add="isModalOpen = true" />
          <span data-testid="modal">{{ isModalOpen ? 'open' : 'closed' }}</span>
        `,
        data() {
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
    it('[A11y] tombol punya aria-label deskriptif', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      expect(button.attributes('aria-label')).toBe('Add new category');
    });

    it('[A11y] icon dekoratif di dalam tombol punya aria-hidden', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      const svg = button.find('svg');
      expect(svg.attributes('aria-hidden')).toBe('true');
    });

    it('[A11y] judul pakai h1 (semantic heading)', () => {
      const wrapper = mount(CategoryHeader);

      expect(wrapper.find('h1').exists()).toBe(true);
    });

    it('[A11y] tombol bisa di-focus', () => {
      const wrapper = mount(CategoryHeader);

      const button = wrapper.find('button');
      expect(button.attributes('disabled')).toBeUndefined();
    });
  });
});