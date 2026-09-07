// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/stores/sessionStore';
import { useAuthStore } from '@/stores/authStore';
import LockScreen from '../LockScreen.vue';

// Mock BrandLogo
vi.mock('@/components/common/BrandLogo.vue', () => ({
  default: {
    name: 'BrandLogo',
    template: '<div class="brand-logo">BrandLogo</div>',
  },
}));

// Mock sessionStore
vi.mock('@/stores/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

// Mock authStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('LockScreen Component', () => {
  let mockSessionStore: any;
  let mockAuthStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock sessionStore
    mockSessionStore = {
      isLocked: true,
      isUnlocking: false,
      unlockError: false,
      unlockErrorMessage: '',
      isRateLimited: false,
      rateLimitSeconds: 0,
      unlockScreen: vi.fn(),
    };

    // Mock authStore
    mockAuthStore = {
      user: {
        id: 'uuid-1',
        name: 'John Doe',
        username: 'johndoe',
        role: 'cashier',
        is_active: true,
        joined_at: null,
      },
    };

    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountLockScreen = () => {
    return mount(LockScreen, {
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });
  };

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan layar kunci saat isLocked=true', () => {
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('Session Locked');
      expect(wrapper.text()).toContain('John Doe');
    });

    it('[Negative Path] Tidak menampilkan layar kunci saat isLocked=false', () => {
      mockSessionStore.isLocked = false;
      const wrapper = mountLockScreen();

      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
    });

    it('[Happy Path] Menampilkan nama kasir dari authStore', () => {
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('John Doe');
    });

    it('[Happy Path] Menampilkan inisial kasir', () => {
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('JO');
    });

    it('[Negative Path] Menampilkan "CS" jika tidak ada nama kasir', () => {
      mockAuthStore.user = null;
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('CS');
      expect(wrapper.text()).toContain('Cashier');
    });
  });

  // =====================================================================
  // 2. PIN INPUT
  // =====================================================================
  describe('PIN Input', () => {
    it('[Happy Path] Menekan tombol angka menambahkan digit ke PIN', async () => {
      const wrapper = mountLockScreen();

      const button1 = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
      await button1!.trigger('click');
      await flushPromises();

      // Cek dots terisi - cari dots dengan class bg-primary
      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(1);
    });

    it('[Happy Path] Menekan tombol 0 menambahkan digit ke PIN', async () => {
      const wrapper = mountLockScreen();

      const button0 = wrapper.findAll('button').find(btn => btn.text().trim() === '0');
      await button0!.trigger('click');
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(1);
    });

    it('[Happy Path] Maksimal 6 digit PIN', async () => {
      const wrapper = mountLockScreen();

      for (let i = 0; i < 7; i++) {
        const button = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
        await button!.trigger('click');
        await flushPromises();
      }

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(6);
    });

    it('[Happy Path] Tombol CLEAR mengosongkan PIN', async () => {
      const wrapper = mountLockScreen();

      const button1 = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
      await button1!.trigger('click');
      await button1!.trigger('click');
      await flushPromises();

      const clearButton = wrapper.findAll('button').find(btn => btn.text().includes('CLEAR'));
      await clearButton!.trigger('click');
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(0);
    });

    it('[Happy Path] Tombol Backspace menghapus 1 digit', async () => {
      const wrapper = mountLockScreen();

      const button1 = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
      await button1!.trigger('click');
      await button1!.trigger('click');
      await flushPromises();

      const backspaceButton = wrapper.findAll('button').find(btn => btn.find('svg').exists());
      await backspaceButton!.trigger('click');
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(1);
    });
  });

  // =====================================================================
  // 3. KEYBOARD EVENTS
  // =====================================================================
  describe('Keyboard Events', () => {
    it('[Happy Path] Menekan tombol angka di keyboard', async () => {
      const wrapper = mountLockScreen();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(1);
    });

    it('[Happy Path] Menekan Backspace di keyboard', async () => {
      const wrapper = mountLockScreen();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
      await flushPromises();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(1);
    });

    it('[Happy Path] Menekan Escape di keyboard mengosongkan PIN', async () => {
      const wrapper = mountLockScreen();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
      await flushPromises();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(0);
    });

    it('[Negative Path] Tidak merespon keyboard jika tidak locked', async () => {
      mockSessionStore.isLocked = false;
      const wrapper = mountLockScreen();

      window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
      await flushPromises();

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(0);
    });
  });

  // =====================================================================
  // 4. RATE LIMITED STATE
  // =====================================================================
  describe('Rate Limited State', () => {
    it('[Happy Path] Menampilkan overlay saat rate limited', () => {
      mockSessionStore.isRateLimited = true;
      const wrapper = mountLockScreen();

      const overlay = wrapper.find('.bg-background\\/40');
      expect(overlay.exists()).toBe(true);
    });

    it('[Happy Path] Tidak menampilkan overlay saat tidak rate limited', () => {
      const wrapper = mountLockScreen();

      const overlay = wrapper.find('.bg-background\\/40');
      expect(overlay.exists()).toBe(false);
    });

    it('[Happy Path] Menampilkan pesan error saat rate limited', () => {
      mockSessionStore.isRateLimited = true;
      mockSessionStore.unlockError = true;
      mockSessionStore.unlockErrorMessage = 'Too many attempts. Please try again in 30 seconds.';
      
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('Too many attempts. Please try again in 30 seconds.');
    });
  });

  // =====================================================================
  // 5. ERROR STATE
  // =====================================================================
  describe('Error State', () => {
    it('[Happy Path] Menampilkan pesan error jika unlockError=true', () => {
      mockSessionStore.unlockError = true;
      mockSessionStore.unlockErrorMessage = 'Incorrect PIN.';
      
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('Incorrect PIN.');
    });

    it('[Happy Path] Menampilkan pesan default jika errorMessage kosong', () => {
      mockSessionStore.unlockError = true;
      mockSessionStore.unlockErrorMessage = '';
      
      const wrapper = mountLockScreen();

      expect(wrapper.text()).toContain('Incorrect PIN. Please try again.');
    });

    it('[Negative Path] Tidak menampilkan pesan error jika unlockError=false', () => {
      const wrapper = mountLockScreen();

      expect(wrapper.text()).not.toContain('Incorrect PIN.');
    });
  });

  // =====================================================================
  // 6. HANDOVER BUTTON
  // =====================================================================
  describe('Handover Button', () => {
    it('[Happy Path] Emit "trigger-handover" saat tombol handover diklik', async () => {
      const wrapper = mountLockScreen();

      const handoverButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Handover Shift')
      );
      await handoverButton!.trigger('click');

      expect(wrapper.emitted('trigger-handover')).toBeTruthy();
    });

    it('[Happy Path] Tombol handover disabled saat isUnlocking=true', () => {
      mockSessionStore.isUnlocking = true;
      const wrapper = mountLockScreen();

      const handoverButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Handover Shift')
      );
      expect(handoverButton!.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Tombol handover TIDAK disabled saat rate limited', () => {
      mockSessionStore.isRateLimited = true;
      const wrapper = mountLockScreen();

      const handoverButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Handover Shift')
      );
      expect(handoverButton!.attributes('disabled')).toBeUndefined();
    });
  });

  // =====================================================================
  // 7. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] PIN 6 digit memanggil unlockScreen', async () => {
      const wrapper = mountLockScreen();

      for (let i = 0; i < 6; i++) {
        const button = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
        await button!.trigger('click');
        await flushPromises();
      }

      expect(mockSessionStore.unlockScreen).toHaveBeenCalled();
    });

    it('[Corner Case] Input disabled saat isUnlocking=true', () => {
      mockSessionStore.isUnlocking = true;
      const wrapper = mountLockScreen();

      const numberButtons = wrapper.findAll('button').filter(btn => 
        /^[0-9]$/.test(btn.text().trim())
      );
      
      numberButtons.forEach(btn => {
        expect(btn.attributes('disabled')).toBeDefined();
      });
    });

    it('[Corner Case] Input disabled saat isRateLimited=true', () => {
      mockSessionStore.isRateLimited = true;
      const wrapper = mountLockScreen();

      const numberButtons = wrapper.findAll('button').filter(btn => 
        /^[0-9]$/.test(btn.text().trim())
      );
      
      numberButtons.forEach(btn => {
        expect(btn.attributes('disabled')).toBeDefined();
      });
    });
  });
});