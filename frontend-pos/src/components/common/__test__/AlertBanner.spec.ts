// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlertBanner from '../AlertBanner.vue';

describe('AlertBanner Component', () => {
  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan pesan yang diberikan', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test error message',
        },
      });

      expect(wrapper.text()).toContain('Test error message');
    });

    it('[Happy Path] Menampilkan pesan panjang tanpa terpotong', () => {
      const longMessage = 'This is a very long error message that should be displayed completely without any truncation or cutting off.';
      const wrapper = mount(AlertBanner, {
        props: {
          message: longMessage,
        },
      });

      expect(wrapper.text()).toContain(longMessage);
    });

    it('[Happy Path] Menampilkan pesan kosong', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: '',
        },
      });

      expect(wrapper.find('p').exists()).toBe(true);
      expect(wrapper.find('p').text()).toBe('');
    });

    it('[Negative Path] Tidak menampilkan apa pun selain pesan', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test message',
        },
      });

      // Hanya ada 1 paragraf
      const paragraphs = wrapper.findAll('p');
      expect(paragraphs.length).toBe(1);
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING (Type Prop)
  // =====================================================================
  describe('Equivalence Partitioning (Type Prop)', () => {
    it('[Partisi 1 - Type error] Menggunakan style error (default)', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Error message',
          type: 'error',
        },
      });

      const alertDiv = wrapper.find('div');
      expect(alertDiv.classes()).toContain('bg-error/10');
      expect(alertDiv.classes()).toContain('border-error/20');
      expect(alertDiv.classes()).toContain('text-error');
    });

    it('[Partisi 2 - Type warning] Menggunakan style warning', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Warning message',
          type: 'warning',
        },
      });

      const alertDiv = wrapper.find('div');
      expect(alertDiv.classes()).toContain('bg-warning/10');
      expect(alertDiv.classes()).toContain('border-warning/20');
      expect(alertDiv.classes()).toContain('text-warning');
    });

    it('[Partisi 3 - Type success] Menggunakan style success', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Success message',
          type: 'success',
        },
      });

      const alertDiv = wrapper.find('div');
      expect(alertDiv.classes()).toContain('bg-green-50');
      expect(alertDiv.classes()).toContain('border-green-200');
      expect(alertDiv.classes()).toContain('text-green-700');
    });

    it('[Partisi 4 - Type undefined] Menggunakan style error (default)', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Default message',
        },
      });

      const alertDiv = wrapper.find('div');
      expect(alertDiv.classes()).toContain('bg-error/10');
      expect(alertDiv.classes()).toContain('border-error/20');
      expect(alertDiv.classes()).toContain('text-error');
    });
  });

  // =====================================================================
  // 3. ICON RENDERING
  // =====================================================================
  describe('Icon Rendering', () => {
    it('[Happy Path] Menampilkan icon untuk type error', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Error',
          type: 'error',
        },
      });

      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('[Happy Path] Menampilkan icon untuk type undefined (default error)', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Default',
        },
      });

      expect(wrapper.find('svg').exists()).toBe(true);
    });

    it('[Negative Path] Tidak menampilkan icon untuk type warning', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Warning',
          type: 'warning',
        },
      });

      expect(wrapper.find('svg').exists()).toBe(false);
    });

    it('[Negative Path] Tidak menampilkan icon untuk type success', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Success',
          type: 'success',
        },
      });

      expect(wrapper.find('svg').exists()).toBe(false);
    });
  });

  // =====================================================================
  // 4. CSS CLASSES & STYLING
  // =====================================================================
  describe('CSS Classes & Styling', () => {
    it('Memiliki class dasar yang selalu ada', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test',
        },
      });

      const alertDiv = wrapper.find('div');
      expect(alertDiv.classes()).toContain('w-full');
      expect(alertDiv.classes()).toContain('max-w-xl');
      expect(alertDiv.classes()).toContain('mb-6');
      expect(alertDiv.classes()).toContain('p-4');
      expect(alertDiv.classes()).toContain('rounded-2xl');
      expect(alertDiv.classes()).toContain('flex');
      expect(alertDiv.classes()).toContain('items-center');
      expect(alertDiv.classes()).toContain('gap-3');
      expect(alertDiv.classes()).toContain('animate-fade-in');
    });

    it('Memiliki class animate-fade-in', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test',
        },
      });

      const alertDiv = wrapper.find('div');
      expect(alertDiv.classes()).toContain('animate-fade-in');
    });

    it('Paragraf memiliki class text-sm dan font-semibold', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test',
        },
      });

      const paragraph = wrapper.find('p');
      expect(paragraph.classes()).toContain('text-sm');
      expect(paragraph.classes()).toContain('font-semibold');
    });
  });

  // =====================================================================
  // 5. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Pesan dengan karakter spesial', () => {
      const specialMessage = 'Error: <script>alert("XSS")</script> & "quotes" \'single\'';
      const wrapper = mount(AlertBanner, {
        props: {
          message: specialMessage,
        },
      });

      expect(wrapper.text()).toContain(specialMessage);
    });

    it('[Edge Case] Pesan dengan HTML entities', () => {
      const htmlMessage = '&amp; &lt; &gt; &quot; &#39;';
      const wrapper = mount(AlertBanner, {
        props: {
          message: htmlMessage,
        },
      });

      expect(wrapper.text()).toContain(htmlMessage);
    });

    it('[Corner Case] Pesan dengan angka', () => {
      const numericMessage = 'Error code: 404';
      const wrapper = mount(AlertBanner, {
        props: {
          message: numericMessage,
        },
      });

      expect(wrapper.text()).toContain('404');
    });

    it('[Edge Case] Pesan dengan newline', () => {
      const multilineMessage = 'Line 1\nLine 2\nLine 3';
      const wrapper = mount(AlertBanner, {
        props: {
          message: multilineMessage,
        },
      });

      expect(wrapper.text()).toContain('Line 1');
      expect(wrapper.text()).toContain('Line 2');
      expect(wrapper.text()).toContain('Line 3');
    });

    it('[Corner Case] Pesan dengan emoji', () => {
      const emojiMessage = '⚠️ Warning: Check your input 🔍';
      const wrapper = mount(AlertBanner, {
        props: {
          message: emojiMessage,
        },
      });

      expect(wrapper.text()).toContain('⚠️');
      expect(wrapper.text()).toContain('🔍');
    });
  });

  // =====================================================================
  // 6. PROPS VALIDATION
  // =====================================================================
  describe('Props Validation', () => {
    it('Menerima prop message sebagai string', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test message',
        },
      });

      expect(wrapper.props('message')).toBe('Test message');
    });

    it('Menerima prop type sebagai string', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test',
          type: 'warning',
        },
      });

      expect(wrapper.props('type')).toBe('warning');
    });

    it('Type default adalah undefined', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Test',
        },
      });

      expect(wrapper.props('type')).toBeUndefined();
    });
  });

  // =====================================================================
  // 7. ACCESSIBILITY
  // =====================================================================
  describe('Accessibility', () => {
    it('Pesan dapat diakses oleh screen reader', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Accessible message',
          type: 'error',
        },
      });

      const paragraph = wrapper.find('p');
      expect(paragraph.text()).toBe('Accessible message');
    });

    it('Icon memiliki atribut yang sesuai', () => {
      const wrapper = mount(AlertBanner, {
        props: {
          message: 'Error',
          type: 'error',
        },
      });

      const svg = wrapper.find('svg');
      expect(svg.attributes('fill')).toBe('none');
      expect(svg.attributes('viewBox')).toBe('0 0 24 24');
      expect(svg.attributes('stroke')).toBe('currentColor');
    });
  });
});