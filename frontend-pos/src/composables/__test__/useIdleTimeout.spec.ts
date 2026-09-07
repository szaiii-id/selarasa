// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useIdleTimeout } from '../useIdleTimeout';

// Helper component untuk menguji composable
const createTestComponent = (timeoutMinutes: number, onTimeout: () => void) => {
  return defineComponent({
    setup() {
      const { resetTimer } = useIdleTimeout(timeoutMinutes, onTimeout);
      return { resetTimer };
    },
    template: '<div>Test Component</div>',
  });
};

describe('useIdleTimeout Composable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Memanggil onTimeout setelah waktu idle yang ditentukan', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[Happy Path] Tidak memanggil onTimeout jika ada aktivitas user', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 - 1000);
      window.dispatchEvent(new Event('mousemove'));
      
      vi.advanceTimersByTime(1000);

      expect(onTimeout).not.toHaveBeenCalled();
      
      wrapper.unmount();
    });

    it('[Negative Path] Tidak memanggil onTimeout jika komponen di-unmount', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      wrapper.unmount();
      
      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000);

      expect(onTimeout).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =====================================================================
  describe('Equivalence Partitioning (Timeout Values)', () => {
    it('[Partisi 1 - Timeout 1 menit] Memanggil onTimeout setelah 1 menit', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 1;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(60 * 1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[Partisi 2 - Timeout 15 menit] Memanggil onTimeout setelah 15 menit', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 15;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(15 * 60 * 1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[Partisi 3 - Timeout 60 menit] Memanggil onTimeout setelah 60 menit', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 60;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(60 * 60 * 1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });
  });

  // =====================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =====================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas bawah: 0 menit] Memanggil onTimeout segera', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 0;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(0);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[BVA - Batas bawah: 1 menit] Memanggil onTimeout setelah tepat 1 menit', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 1;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(59 * 1000);
      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1 * 1000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[BVA - Nilai sangat besar] Tidak crash dengan timeout besar', async () => {
    const onTimeout = vi.fn();
    const timeoutMinutes = 1440; // 24 jam (nilai realistis maksimum)
    
    const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
    const wrapper = mount(TestComponent);
    
    await nextTick();

    // Advance 1 jam (jauh di bawah timeout 24 jam)
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(onTimeout).not.toHaveBeenCalled();
    
    wrapper.unmount();
    });
  });

  // =====================================================================
  // 4. RESET TIMER
  // =====================================================================
  describe('Reset Timer', () => {
    it('[Happy Path] resetTimer() mengatur ulang timer', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 / 2);

      wrapper.vm.resetTimer();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 / 2);

      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 / 2);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[Happy Path] Aktivitas user me-reset timer', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 / 2);

      window.dispatchEvent(new Event('mousemove'));

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 / 2);

      expect(onTimeout).not.toHaveBeenCalled();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 / 2);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });
  });

  // =====================================================================
  // 5. EVENT LISTENERS
  // =====================================================================
  describe('Event Listeners', () => {
    it('Mendaftarkan event listeners saat mounted', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const onTimeout = vi.fn();
      
      const TestComponent = createTestComponent(5, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      expect(addEventListenerSpy).toHaveBeenCalledTimes(5);
      
      const events = addEventListenerSpy.mock.calls.map(call => call[0]);
      expect(events).toContain('mousemove');
      expect(events).toContain('mousedown');
      expect(events).toContain('keydown');
      expect(events).toContain('touchstart');
      expect(events).toContain('scroll');
      
      wrapper.unmount();
    });

    it('Membersihkan event listeners saat unmounted', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const onTimeout = vi.fn();
      
      const TestComponent = createTestComponent(5, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();
      
      wrapper.unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(5);
      
      const events = removeEventListenerSpy.mock.calls.map(call => call[0]);
      expect(events).toContain('mousemove');
      expect(events).toContain('mousedown');
      expect(events).toContain('keydown');
      expect(events).toContain('touchstart');
      expect(events).toContain('scroll');
    });

    it('Semua event listeners menggunakan passive: true', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const onTimeout = vi.fn();
      
      const TestComponent = createTestComponent(5, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      addEventListenerSpy.mock.calls.forEach(call => {
        expect(call[2]).toEqual({ passive: true });
      });
      
      wrapper.unmount();
    });
  });

  // =====================================================================
  // 6. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Multiple reset calls tidak menyebabkan multiple timeouts', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      wrapper.vm.resetTimer();
      wrapper.vm.resetTimer();
      wrapper.vm.resetTimer();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[Corner Case] Timer dibersihkan saat komponen di-unmount', async () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      const onTimeout = vi.fn();
      
      const TestComponent = createTestComponent(5, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();
      
      wrapper.unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('[Edge Case] onTimeout hanya dipanggil sekali meskipun timer advance melebihi timeout', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000 * 2);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      
      wrapper.unmount();
    });

    it('[Corner Case] Aktivitas user setelah timeout membuat timer baru', async () => {
      const onTimeout = vi.fn();
      const timeoutMinutes = 5;
      
      const TestComponent = createTestComponent(timeoutMinutes, onTimeout);
      const wrapper = mount(TestComponent);
      
      await nextTick();

      // Trigger timeout pertama
      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000);
      expect(onTimeout).toHaveBeenCalledTimes(1);

      // Aktivitas user setelah timeout - ini akan membuat timer baru
      window.dispatchEvent(new Event('mousemove'));

      // Advance waktu lagi
      vi.advanceTimersByTime(timeoutMinutes * 60 * 1000);

      // onTimeout dipanggil lagi karena timer baru dibuat oleh aktivitas user
      expect(onTimeout).toHaveBeenCalledTimes(2);
      
      wrapper.unmount();
    });
  });
});