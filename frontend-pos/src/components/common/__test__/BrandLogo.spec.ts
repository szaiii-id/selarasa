// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrandLogo from '../BrandLogo.vue';

describe('BrandLogo Component', () => {
  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan teks SELARASA', () => {
      const wrapper = mount(BrandLogo);

      expect(wrapper.text()).toContain('SELARASA');
    });

    it('[Happy Path] Menampilkan teks Point of Sale', () => {
      const wrapper = mount(BrandLogo);

      expect(wrapper.text()).toContain('Point of Sale');
    });

    it('[Happy Path] Menampilkan icon coffee cup', () => {
      const wrapper = mount(BrandLogo);

      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('[Negative Path] Tidak menampilkan teks lain selain brand', () => {
      const wrapper = mount(BrandLogo);

      const allText = wrapper.text();
      expect(allText).toContain('SELARASA');
      expect(allText).toContain('Point of Sale');
      
      // Tidak ada teks tambahan
      const spans = wrapper.findAll('span');
      expect(spans.length).toBe(2);
    });
  });

  // =====================================================================
  // 2. TEXT CONTENT
  // =====================================================================
  describe('Text Content', () => {
    it('Menampilkan SELARASA dalam huruf kapital', () => {
      const wrapper = mount(BrandLogo);

      const brandSpan = wrapper.findAll('span')[0];
      expect(brandSpan!.text()).toBe('SELARASA');
    });

    it('Menampilkan Point of Sale sebagai subtitle', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.text()).toBe('Point of Sale');
    });

    it('SELARASA memiliki class uppercase', () => {
      const wrapper = mount(BrandLogo);

      const brandSpan = wrapper.findAll('span')[0];
      expect(brandSpan!.classes()).toContain('uppercase');
    });

    it('Point of Sale memiliki class uppercase', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.classes()).toContain('uppercase');
    });
  });

  // =====================================================================
  // 3. CSS CLASSES & STYLING
  // =====================================================================
  describe('CSS Classes & Styling', () => {
    it('Container memiliki class inline-flex', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('inline-flex');
    });

    it('Container memiliki class items-center', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('items-center');
      expect(container.classes()).toContain('justify-center');
    });

    it('Container memiliki class gap-3', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('gap-3');
    });

    it('Container memiliki class rounded-full', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('rounded-full');
    });

    it('Container memiliki background primary', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('bg-primary/10');
    });

    it('Container memiliki border primary', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('border-primary/20');
    });

    it('Container memiliki backdrop-blur', () => {
      const wrapper = mount(BrandLogo);

      const container = wrapper.find('div');
      expect(container.classes()).toContain('backdrop-blur-md');
    });

    it('Brand text memiliki class font-bold', () => {
      const wrapper = mount(BrandLogo);

      const brandSpan = wrapper.findAll('span')[0];
      expect(brandSpan!.classes()).toContain('font-bold');
    });

    it('Brand text memiliki class tracking-widest', () => {
      const wrapper = mount(BrandLogo);

      const brandSpan = wrapper.findAll('span')[0];
      expect(brandSpan!.classes()).toContain('tracking-widest');
    });

    it('Brand text memiliki class text-primary', () => {
      const wrapper = mount(BrandLogo);

      const brandSpan = wrapper.findAll('span')[0];
      expect(brandSpan!.classes()).toContain('text-primary');
    });

    it('Subtitle text memiliki class text-[9px]', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.classes()).toContain('text-[9px]');
    });

    it('Subtitle text memiliki class tracking-[0.2em]', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.classes()).toContain('tracking-[0.2em]');
    });

    it('Subtitle text memiliki class text-primary/80', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.classes()).toContain('text-primary/80');
    });
  });

  // =====================================================================
  // 4. ICON RENDERING
  // =====================================================================
  describe('Icon Rendering', () => {
    it('Icon memiliki class w-5 h-5', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.classes()).toContain('w-5');
      expect(svg.classes()).toContain('h-5');
    });

    it('Icon memiliki class text-primary', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.classes()).toContain('text-primary');
    });

    it('Icon memiliki class shrink-0', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.classes()).toContain('shrink-0');
    });

    it('Icon memiliki atribut viewBox yang benar', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    });

    it('Icon memiliki atribut fill="none"', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.attributes('fill')).toBe('none');
    });

    it('Icon memiliki atribut stroke="currentColor"', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.attributes('stroke')).toBe('currentColor');
    });

    it('Icon memiliki stroke-width="2"', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      expect(svg.attributes('stroke-width')).toBe('2');
    });

    it('Icon memiliki path untuk coffee cup', () => {
      const wrapper = mount(BrandLogo);

      const svg = wrapper.find('svg');
      const paths = svg.findAll('path');
      const lines = svg.findAll('line');
      
      // Coffee cup icon memiliki 2 path dan 3 line
      expect(paths.length).toBe(2);
      expect(lines.length).toBe(3);
    });
  });

  // =====================================================================
  // 5. STRUCTURE & LAYOUT
  // =====================================================================
  describe('Structure & Layout', () => {
    it('Memiliki struktur div > svg + div > span + span', () => {
      const wrapper = mount(BrandLogo);

      const rootDiv = wrapper.find('div');
      expect(rootDiv.exists()).toBe(true);

      // Root div memiliki 2 child langsung: svg dan div
      const rootChildren = rootDiv.element.children;
      expect(rootChildren.length).toBe(2);

      // Child pertama adalah svg - gunakan type assertion
      const firstChild = rootChildren[0] as HTMLElement;
      expect(firstChild.tagName.toLowerCase()).toBe('svg');

      // Child kedua adalah div - gunakan type assertion
      const secondChild = rootChildren[1] as HTMLElement;
      expect(secondChild.tagName.toLowerCase()).toBe('div');
    });

    it('Text container memiliki class flex flex-col', () => {
      const wrapper = mount(BrandLogo);

      const textContainer = wrapper.findAll('div')[1];
      expect(textContainer!.classes()).toContain('flex');
      expect(textContainer!.classes()).toContain('flex-col');
    });

    it('Text container memiliki class items-center justify-center', () => {
      const wrapper = mount(BrandLogo);

      const textContainer = wrapper.findAll('div')[1];
      expect(textContainer!.classes()).toContain('items-center');
      expect(textContainer!.classes()).toContain('justify-center');
    });

    it('Subtitle memiliki margin-top', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.classes()).toContain('mt-1');
    });
  });

  // =====================================================================
  // 6. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Komponen dapat dirender ulang tanpa error', () => {
      const wrapper = mount(BrandLogo);
      
      // Render ulang
      wrapper.unmount();
      const wrapper2 = mount(BrandLogo);
      
      expect(wrapper2.text()).toContain('SELARASA');
    });

    it('[Corner Case] Tidak ada props yang diperlukan', () => {
      const wrapper = mount(BrandLogo);

      // Komponen tidak memerlukan props
      expect(wrapper.props()).toEqual({});
    });

    it('[Edge Case] Memiliki line height yang tepat pada brand text', () => {
      const wrapper = mount(BrandLogo);

      const brandSpan = wrapper.findAll('span')[0];
      expect(brandSpan!.classes()).toContain('leading-none');
    });

    it('[Edge Case] Memiliki line height yang tepat pada subtitle', () => {
      const wrapper = mount(BrandLogo);

      const subtitleSpan = wrapper.findAll('span')[1];
      expect(subtitleSpan!.classes()).toContain('leading-none');
    });
  });
});