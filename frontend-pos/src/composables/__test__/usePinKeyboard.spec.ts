// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { usePinKeyboard } from '../usePinKeyboard';

// Helper component untuk menguji composable
const createTestComponent = (options: {
  onDigit: (num: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  isDisabled?: () => boolean;
}) => {
  return defineComponent({
    setup() {
      usePinKeyboard(options);
    },
    template: '<div>Test Component</div>',
  });
};

describe('usePinKeyboard Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menekan tombol digit memanggil onDigit dengan angka yang benar', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      // Simulasi tekan tombol '5'
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

      expect(onDigit).toHaveBeenCalledWith(5);
      expect(onDigit).toHaveBeenCalledTimes(1);
      expect(onBackspace).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Happy Path] Menekan tombol Backspace memanggil onBackspace', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));

      expect(onBackspace).toHaveBeenCalledTimes(1);
      expect(onDigit).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Happy Path] Menekan tombol Escape memanggil onClear', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(onClear).toHaveBeenCalledTimes(1);
      expect(onDigit).not.toHaveBeenCalled();
      expect(onBackspace).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Happy Path] Menekan tombol Enter memanggil onSubmit', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onDigit).not.toHaveBeenCalled();
      expect(onBackspace).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Negative Path] Menekan tombol lain tidak memanggil callback apa pun', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

      expect(onDigit).not.toHaveBeenCalled();
      expect(onBackspace).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Negative Path] Tidak memanggil callback setelah komponen di-unmount', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      wrapper.unmount();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onDigit).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING (Digit Keys)
  // =====================================================================
  describe('Equivalence Partitioning (Digit Keys 0-9)', () => {
    it('[Partisi 1 - Digit 0-4] Memanggil onDigit dengan angka 0-4', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      ['0', '1', '2', '3', '4'].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });

      expect(onDigit).toHaveBeenCalledTimes(5);
      expect(onDigit).toHaveBeenNthCalledWith(1, 0);
      expect(onDigit).toHaveBeenNthCalledWith(2, 1);
      expect(onDigit).toHaveBeenNthCalledWith(3, 2);
      expect(onDigit).toHaveBeenNthCalledWith(4, 3);
      expect(onDigit).toHaveBeenNthCalledWith(5, 4);

      wrapper.unmount();
    });

    it('[Partisi 2 - Digit 5-9] Memanggil onDigit dengan angka 5-9', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      ['5', '6', '7', '8', '9'].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });

      expect(onDigit).toHaveBeenCalledTimes(5);
      expect(onDigit).toHaveBeenNthCalledWith(1, 5);
      expect(onDigit).toHaveBeenNthCalledWith(2, 6);
      expect(onDigit).toHaveBeenNthCalledWith(3, 7);
      expect(onDigit).toHaveBeenNthCalledWith(4, 8);
      expect(onDigit).toHaveBeenNthCalledWith(5, 9);

      wrapper.unmount();
    });

    it('[Partisi 3 - Non-Digit Keys] Tidak memanggil onDigit untuk huruf', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      ['a', 'b', 'c', 'A', 'B', 'C'].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });

      expect(onDigit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Partisi 4 - Special Keys] Tidak memanggil onDigit untuk karakter spesial', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      ['!', '@', '#', '$', '%', ' '].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });

      expect(onDigit).not.toHaveBeenCalled();

      wrapper.unmount();
    });
  });

  // =====================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =====================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas bawah: Digit 0] Memanggil onDigit(0)', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '0' }));

      expect(onDigit).toHaveBeenCalledWith(0);

      wrapper.unmount();
    });

    it('[BVA - Batas atas: Digit 9] Memanggil onDigit(9)', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '9' }));

      expect(onDigit).toHaveBeenCalledWith(9);

      wrapper.unmount();
    });

    it('[BVA - Tepat sebelum digit: key "/" (ASCII 47)] Tidak memanggil onDigit', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));

      expect(onDigit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[BVA - Tepat setelah digit: key ":" (ASCII 58)] Tidak memanggil onDigit', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: ':' }));

      expect(onDigit).not.toHaveBeenCalled();

      wrapper.unmount();
    });
  });

  // =====================================================================
  // 4. DISABLED STATE
  // =====================================================================
  describe('Disabled State', () => {
    it('[Happy Path] Tidak memanggil callback saat isDisabled true', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();
      const isDisabled = vi.fn(() => true);

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
        isDisabled,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(onDigit).not.toHaveBeenCalled();
      expect(onBackspace).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Happy Path] Memanggil callback saat isDisabled false', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();
      const isDisabled = vi.fn(() => false);

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
        isDisabled,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

      expect(onDigit).toHaveBeenCalledWith(5);

      wrapper.unmount();
    });

    it('[Happy Path] isDisabled dipanggil setiap kali key ditekan', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();
      const isDisabled = vi.fn(() => false);

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
        isDisabled,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));

      expect(isDisabled).toHaveBeenCalledTimes(3);

      wrapper.unmount();
    });
  });

  // =====================================================================
  // 5. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Numpad digits juga dipanggil dengan benar', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      // Numpad keys biasanya sama dengan digit keys
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));

      expect(onDigit).toHaveBeenCalledWith(5);

      wrapper.unmount();
    });

    it('[Corner Case] Event keydown dengan key undefined tidak crash', async () => {
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      // Simulasi event dengan key undefined
      window.dispatchEvent(new KeyboardEvent('keydown'));

      expect(onDigit).not.toHaveBeenCalled();
      expect(onBackspace).not.toHaveBeenCalled();
      expect(onClear).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();

      wrapper.unmount();
    });

    it('[Edge Case] Multiple key presses dalam urutan cepat', async () => {
    const onDigit = vi.fn();
    const onBackspace = vi.fn();
    const onClear = vi.fn();
    const onSubmit = vi.fn();

    const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
    });
    const wrapper = mount(TestComponent);
    await nextTick();

    // Simulasi input cepat: 1,2,3,Backspace,4,5,6,Enter
    ['1', '2', '3', 'Backspace', '4', '5', '6', 'Enter'].forEach((key) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
    });

    // Ada 6 digit: 1,2,3,4,5,6
    expect(onDigit).toHaveBeenCalledTimes(6);
    expect(onBackspace).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();

    wrapper.unmount();
    });

    it('[Corner Case] Event listener dibersihkan saat unmount', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      wrapper.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  // =====================================================================
  // 6. EVENT LISTENER REGISTRATION
  // =====================================================================
  describe('Event Listener Registration', () => {
    it('Mendaftarkan keydown listener saat mounted', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const onDigit = vi.fn();
      const onBackspace = vi.fn();
      const onClear = vi.fn();
      const onSubmit = vi.fn();

      const TestComponent = createTestComponent({
        onDigit,
        onBackspace,
        onClear,
        onSubmit,
      });
      const wrapper = mount(TestComponent);
      await nextTick();

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      wrapper.unmount();
    });
  });
});