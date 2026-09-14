import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CategoryFilterBar from '../CategoryFilterBar.vue';

describe('CategoryFilterBar.vue (Component Testing)', () => {
  // =========================================================================
  // 1. HAPPY PATH — Rendering
  // =========================================================================
  describe('Happy Path — Rendering', () => {
    it('[Happy Path] merender input dengan placeholder yang benar', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input[type="text"]');
      expect(input.exists()).toBe(true);
      expect(input.attributes('placeholder')).toBe('Search category name...');
    });

    it('[Happy Path] menampilkan nilai keyword dari props', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('gula');
    });

    it('[Happy Path] merender icon search (SVG) dengan tepat', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(true);
      expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    });

    it('[Happy Path] merender wrapper dengan class yang benar', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const root = wrapper.find('div.glass');
      expect(root.exists()).toBe(true);
      expect(root.classes()).toContain('rounded-3xl');
      expect(root.classes()).toContain('p-5');
    });
  });

  // =========================================================================
  // 2. EVENT EMISSION — update:keyword
  // =========================================================================
  describe('Event Emission', () => {
    it('[Happy Path] emit update:keyword saat user mengetik', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      await input.setValue('tepung');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted).toBeTruthy();
      expect(emitted).toHaveLength(1);
      expect(emitted![0]).toEqual(['tepung']);
    });

    it('[Happy Path] emit value yang benar saat mengetik karakter per karakter', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');

      await input.setValue('g');
      await input.setValue('gu');
      await input.setValue('gul');
      await input.setValue('gula');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted).toHaveLength(4);
      expect(emitted![0]).toEqual(['g']);
      expect(emitted![1]).toEqual(['gu']);
      expect(emitted![2]).toEqual(['gul']);
      expect(emitted![3]).toEqual(['gula']);
    });

    it('[Happy Path] emit string kosong saat user menghapus semua teks', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      const input = wrapper.find('input');
      await input.setValue('');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['']);
    });

    it('[Happy Path] emit value dengan spasi', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      await input.setValue('tepung terigu');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted![0]).toEqual(['tepung terigu']);
    });

    it('[Happy Path] emit value dengan karakter spesial', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      await input.setValue('@#$%^&*()');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted![0]).toEqual(['@#$%^&*()']);
    });
  });

  // =========================================================================
  // 3. EQUIVALENCE PARTITIONING — Prop Values
  // =========================================================================
  describe('Equivalence Partitioning — Prop Values', () => {
    it('[Partisi 1 - Empty string] keyword="" → input kosong', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('[Partisi 2 - Non-empty string] keyword="gula" → input terisi', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('gula');
    });

    it('[Partisi 3 - String panjang] keyword 100 karakter', () => {
      const longKeyword = 'a'.repeat(100);
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: longKeyword },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe(longKeyword);
    });

    it('[Partisi 4 - String dengan spasi] keyword="   " (whitespace only)', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '   ' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('   ');
    });

    it('[Partisi 5 - Unicode/emoji] keyword="café ☕"', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'café ☕' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('café ☕');
    });
  });

  // =========================================================================
  // 4. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Empty] keyword="" adalah batas bawah', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('[BVA - Single char] keyword="a" adalah batas bawah non-empty', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'a' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('a');
    });

    it('[BVA - Very long] keyword 10.000 karakter', () => {
      const hugeKeyword = 'x'.repeat(10_000);
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: hugeKeyword },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe(hugeKeyword);
    });
  });

  // =========================================================================
  // 5. PROPS REACTIVITY
  // =========================================================================
  describe('Props Reactivity', () => {
    it('[Happy Path] input ter-update saat prop keyword berubah', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('gula');

      await wrapper.setProps({ keyword: 'tepung' });

      expect((input.element as HTMLInputElement).value).toBe('tepung');
    });

    it('[Happy Path] input kosong saat prop keyword di-set ke ""', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      await wrapper.setProps({ keyword: '' });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('[Happy Path] dua update berturut-turut', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      await wrapper.setProps({ keyword: 'a' });
      await wrapper.setProps({ keyword: 'ab' });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('ab');
    });
  });

  // =========================================================================
  // 6. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] tidak emit saat komponen baru di-mount', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      expect(wrapper.emitted('update:keyword')).toBeUndefined();
    });

    it('[Edge Case] tidak emit saat prop berubah (hanya saat user input)', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      await wrapper.setProps({ keyword: 'tepung' });

      expect(wrapper.emitted('update:keyword')).toBeUndefined();
    });

    it('[Corner Case] setValue ke nilai yang sama tetap emit', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: 'gula' },
      });

      const input = wrapper.find('input');
      await input.setValue('gula');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(['gula']);
    });

    it('[Corner Case] multiple emits dengan berbagai nilai', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');

      await input.setValue('a');
      await input.setValue('b');
      await input.setValue('');

      const emitted = wrapper.emitted('update:keyword');
      expect(emitted).toHaveLength(3);
      expect(emitted![0]).toEqual(['a']);
      expect(emitted![1]).toEqual(['b']);
      expect(emitted![2]).toEqual(['']);
    });

    it('[Corner Case] value dari event target adalah string, bukan number', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      await input.setValue('123');

      const emitted = wrapper.emitted('update:keyword');
      expect(typeof emitted![0]![0]).toBe('string');
      expect(emitted![0]).toEqual(['123']);
    });

    it('[Edge Case] input memiliki atribut type="text"', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      expect(input.attributes('type')).toBe('text');
    });

    it('[Edge Case] input memiliki class styling yang benar', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      const classes = input.classes();
      expect(classes).toContain('w-full');
      expect(classes).toContain('pl-11');
      expect(classes).toContain('rounded-xl');
    });

    it('[Edge Case] SVG icon punya class posisi absolute', () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const svg = wrapper.find('svg');
      expect(svg.classes()).toContain('absolute');
      expect(svg.classes()).toContain('left-4');
    });

    it('[Corner Case] emit payload adalah array dengan 1 elemen string', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '' },
      });

      const input = wrapper.find('input');
      await input.setValue('test');

      const emitted = wrapper.emitted('update:keyword');
      expect(Array.isArray(emitted![0])).toBe(true);
      expect(emitted![0]).toHaveLength(1);
      expect(typeof emitted![0]![0]).toBe('string');
    });

    it('[Corner Case] mount dengan keyword whitespace saja', async () => {
      const wrapper = mount(CategoryFilterBar, {
        props: { keyword: '   ' },
      });

      const input = wrapper.find('input');
      expect((input.element as HTMLInputElement).value).toBe('   ');

      await input.setValue('');
      const emitted = wrapper.emitted('update:keyword');
      expect(emitted![0]).toEqual(['']);
    });
  });

  // =========================================================================
  // 7. INTEGRATION — Parent-Child (v-model pattern)
  // =========================================================================
  describe('Integration — v-model pattern', () => {
    it('[Integration] mensimulasikan v-model: parent update prop saat child emit', async () => {
      const Parent = {
        components: { CategoryFilterBar },
        template: `
          <CategoryFilterBar
            :keyword="keyword"
            @update:keyword="keyword = $event"
          />
        `,
        data() {
          return { keyword: '' };
        },
      };

      const wrapper = mount(Parent as any);
      const input = wrapper.find('input');

      await input.setValue('gula');

      expect((wrapper.vm as any).keyword).toBe('gula');
      expect((input.element as HTMLInputElement).value).toBe('gula');
    });

    it('[Integration] v-model sinkron dua arah', async () => {
      const Parent = {
        components: { CategoryFilterBar },
        template: `
          <CategoryFilterBar
            :keyword="keyword"
            @update:keyword="keyword = $event"
          />
          <button @click="keyword = 'from-parent'">Set</button>
        `,
        data() {
          return { keyword: 'initial' };
        },
      };

      const wrapper = mount(Parent as any);
      const input = wrapper.find('input');

      expect((input.element as HTMLInputElement).value).toBe('initial');

      await input.setValue('from-child');
      expect((wrapper.vm as any).keyword).toBe('from-child');

      await wrapper.find('button').trigger('click');
      expect((input.element as HTMLInputElement).value).toBe('from-parent');
    });
  });
});