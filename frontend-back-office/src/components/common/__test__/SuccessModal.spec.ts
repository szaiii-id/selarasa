import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SuccessModal from '../SuccessModal.vue';

const createWrapper = (props = {}) => {
  return mount(SuccessModal, {
    props: {
      isOpen: false,
      title: '',
      message: '',
      ...props
    },
    global: {
      stubs: {
        Transition: true
      }
    }
  });
};

describe('SuccessModal Component', () => {
  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Modal tidak dirender saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });
      
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });

    it('[Happy Path] Modal dirender saat isOpen=true', () => {
      const wrapper = createWrapper({ isOpen: true });
      
      expect(wrapper.find('.fixed').exists()).toBe(true);
    });

    it('[Happy Path] Menampilkan title dan message yang diberikan', () => {
      const wrapper = createWrapper({
        isOpen: true,
        title: 'Shift Created',
        message: 'The master shift "Morning Shift" has been successfully created.'
      });
      
      expect(wrapper.text()).toContain('Shift Created');
      expect(wrapper.text()).toContain('The master shift "Morning Shift" has been successfully created.');
    });

    it('[Happy Path] Emit "close" saat tombol "Got it, thanks!" diklik', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      const button = wrapper.find('button');
      await button.trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
      expect(wrapper.emitted('close')?.length).toBe(1);
    });

    it('[Negative Path] Tidak emit "close" saat modal belum dirender (isOpen=false)', () => {
      const wrapper = createWrapper({ isOpen: false });
      
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Title Kosong] Menampilkan title kosong jika tidak diberikan', () => {
      const wrapper = createWrapper({ isOpen: true, title: '' });
      
      const h3 = wrapper.find('h3');
      expect(h3.text()).toBe('');
    });

    it('[Partisi 2 - Message Kosong] Menampilkan message kosong jika tidak diberikan', () => {
      const wrapper = createWrapper({ isOpen: true, message: '' });
      
      const p = wrapper.find('p');
      expect(p.text()).toBe('');
    });

    it('[Partisi 3 - Title Panjang] Menampilkan title panjang dengan benar', () => {
      const longTitle = 'This is a very long title for testing purposes that exceeds normal length';
      const wrapper = createWrapper({ isOpen: true, title: longTitle });
      
      expect(wrapper.text()).toContain(longTitle);
    });

    it('[Partisi 4 - Message Panjang] Menampilkan message panjang dengan benar', () => {
      const longMessage = 'This is a very long message for testing purposes. It contains a lot of text to ensure that the modal can display long messages properly without any issues or truncation.';
      const wrapper = createWrapper({ isOpen: true, message: longMessage });
      
      expect(wrapper.text()).toContain(longMessage);
    });

    it('[Partisi 5 - Title dengan Karakter Khusus] Menampilkan title dengan karakter khusus', () => {
      const specialTitle = 'Shift "Updated" & Saved!';
      const wrapper = createWrapper({ isOpen: true, title: specialTitle });
      
      expect(wrapper.text()).toContain(specialTitle);
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] Title string kosong', () => {
      const wrapper = createWrapper({ isOpen: true, title: '' });
      
      const h3 = wrapper.find('h3');
      expect(h3.text()).toBe('');
    });

    it('[BVA - Batas Bawah] Message string kosong', () => {
      const wrapper = createWrapper({ isOpen: true, message: '' });
      
      const p = wrapper.find('p');
      expect(p.text()).toBe('');
    });

    it('[BVA - Batas Atas] Title sangat panjang (1000 karakter)', () => {
      const longTitle = 'A'.repeat(1000);
      const wrapper = createWrapper({ isOpen: true, title: longTitle });
      
      expect(wrapper.text()).toContain(longTitle);
    });

    it('[BVA - Batas Atas] Message sangat panjang (1000 karakter)', () => {
      const longMessage = 'B'.repeat(1000);
      const wrapper = createWrapper({ isOpen: true, message: longMessage });
      
      expect(wrapper.text()).toContain(longMessage);
    });

    it('[BVA - Satu Karakter] Title dengan 1 karakter', () => {
      const wrapper = createWrapper({ isOpen: true, title: 'A' });
      
      expect(wrapper.text()).toContain('A');
    });

    it('[BVA - Satu Karakter] Message dengan 1 karakter', () => {
      const wrapper = createWrapper({ isOpen: true, message: 'B' });
      
      expect(wrapper.text()).toContain('B');
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Mousedown pada backdrop emit "close"', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      await wrapper.find('.fixed').trigger('mousedown.self');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Edge Case] Mousedown pada modal content TIDAK emit "close"', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      const modalContent = wrapper.find('.bg-surface');
      await modalContent.trigger('mousedown');
      
      expect(wrapper.emitted('close')).toBeFalsy();
    });

    it('[Corner Case] Memiliki success icon', () => {
      const wrapper = createWrapper({ isOpen: true });
      
      const svg = wrapper.find('svg');
      expect(svg.exists()).toBe(true);
    });

    it('[Corner Case] Button memiliki text "Got it, thanks!"', () => {
      const wrapper = createWrapper({ isOpen: true });
      
      const button = wrapper.find('button');
      expect(button.text()).toBe('Got it, thanks!');
    });

    it('[Edge Case] Title dirender dalam h3', () => {
      const wrapper = createWrapper({ isOpen: true, title: 'Test Title' });
      
      const h3 = wrapper.find('h3');
      expect(h3.text()).toBe('Test Title');
    });

    it('[Edge Case] Message dirender dalam p tag', () => {
      const wrapper = createWrapper({ isOpen: true, message: 'Test Message' });
      
      const p = wrapper.find('p');
      expect(p.text()).toBe('Test Message');
    });

    it('[Corner Case] Modal memiliki z-index 60', () => {
      const wrapper = createWrapper({ isOpen: true });
      
      const fixedDiv = wrapper.find('.fixed');
      expect(fixedDiv.classes()).toContain('z-[60]');
    });

    it('[Edge Case] Konsisten untuk props yang sama', () => {
      const props = {
        isOpen: true,
        title: 'Test',
        message: 'Test message'
      };
      
      const wrapper1 = createWrapper(props);
      const wrapper2 = createWrapper(props);
      
      expect(wrapper1.text()).toBe(wrapper2.text());
    });

    it('[Edge Case] Modal dirender ulang saat isOpen berubah dari false ke true', async () => {
      const wrapper = createWrapper({ isOpen: false });
      
      expect(wrapper.find('.fixed').exists()).toBe(false);
      
      await wrapper.setProps({ isOpen: true });
      
      expect(wrapper.find('.fixed').exists()).toBe(true);
    });

    it('[Edge Case] Modal disembunyikan saat isOpen berubah dari true ke false', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      expect(wrapper.find('.fixed').exists()).toBe(true);
      
      await wrapper.setProps({ isOpen: false });
      
      expect(wrapper.find('.fixed').exists()).toBe(false);
    });
  });
});