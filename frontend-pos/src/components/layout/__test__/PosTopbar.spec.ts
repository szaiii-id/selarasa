// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, VueWrapper, DOMWrapper } from '@vue/test-utils';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useSessionStore } from '@/stores/sessionStore';
import PosTopbar from '../PosTopbar.vue';

// Mock stores
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
}));

vi.mock('@/stores/sessionStore', () => ({
  useSessionStore: vi.fn(),
}));

// Mock composables
vi.mock('@/composables/useIdleTimeout', () => ({
  useIdleTimeout: vi.fn(),
}));

// Mock child components
vi.mock('@/components/shift/CloseShift.vue', () => ({
  default: {
    name: 'CloseShiftModal',
    template: '<div class="close-shift-modal"><slot /></div>',
    props: ['isOpen'],
    emits: ['close', 'success'],
  },
}));

vi.mock('@/components/shift/HandoverShift.vue', () => ({
  default: {
    name: 'HandoverShiftModal',
    template: '<div class="handover-shift-modal"><slot /></div>',
    props: ['isOpen'],
    emits: ['close', 'success'],
  },
}));

vi.mock('@/components/common/LockScreen.vue', () => ({
  default: {
    name: 'LockScreen',
    template: '<div class="lock-screen"><slot /></div>',
    emits: ['trigger-handover'],
  },
}));

vi.mock('@/components/common/BrandLogo.vue', () => ({
  default: {
    name: 'BrandLogo',
    template: '<div class="brand-logo">BrandLogo</div>',
  },
}));

describe('PosTopbar Component', () => {
  let mockAuthStore: any;
  let mockShiftStore: any;
  let mockSessionStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthStore = {
      logout: vi.fn(),
    };

    mockShiftStore = {
      masterShifts: [],
      shiftStatus: 'safe',
      hasUsedGracePeriod: false,
      isFinishingOvertimeTransaction: false,
      currentShift: {
        status: 'open',
      },
      activeMasterShift: {
        name: 'Morning Shift',
        start_time: '08:00:00',
        end_time: '16:00:00',
      },
      timeRemainingText: '6h 30m left',
      fetchMasterShifts: vi.fn(),
      fetchCurrentShift: vi.fn(),
    };

    mockSessionStore = {
      isLocked: false,
      lockScreen: vi.fn(),
      clearRateLimit: vi.fn(),
    };

    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
    vi.mocked(useSessionStore).mockReturnValue(mockSessionStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountPosTopbar = (): VueWrapper => {
    return mount(PosTopbar, {
      global: {
        stubs: {
          Teleport: true,
          Transition: false,
        },
      },
    });
  };

  // Helper untuk mencari button berdasarkan teks
  const findButtonByText = (wrapper: VueWrapper, text: string): DOMWrapper<HTMLButtonElement> | undefined => {
    return wrapper.findAll('button').find((btn: DOMWrapper<HTMLButtonElement>) => 
      btn.text().includes(text)
    );
  };

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan BrandLogo', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('BrandLogo');
    });

    it('[Happy Path] Menampilkan status shift', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('open');
    });

    it('[Happy Path] Menampilkan nama shift', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('Morning Shift');
    });

    it('[Happy Path] Menampilkan waktu shift', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('08:00');
      expect(wrapper.text()).toContain('16:00');
    });

    it('[Happy Path] Menampilkan waktu tersisa', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('6h 30m left');
    });

    it('[Happy Path] Menampilkan tombol Lock Screen', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('Lock Screen');
    });

    it('[Happy Path] Menampilkan tombol Handover', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('Handover');
    });

    it('[Happy Path] Menampilkan tombol End Shift', () => {
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('End Shift');
    });

    it('[Negative Path] Menampilkan "N/A" jika tidak ada shift aktif', () => {
      mockShiftStore.activeMasterShift = null;
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('N/A');
    });
  });

  // =====================================================================
  // 2. ON MOUNTED
  // =====================================================================
  describe('On Mounted', () => {
    it('[Happy Path] Fetch master shifts jika kosong', async () => {
      mockShiftStore.masterShifts = [];
      mountPosTopbar();
      await flushPromises();

      expect(mockShiftStore.fetchMasterShifts).toHaveBeenCalled();
    });

    it('[Happy Path] Tidak fetch master shifts jika sudah ada', async () => {
      mockShiftStore.masterShifts = [{ id: 1, name: 'Morning', start_time: '08:00:00', end_time: '16:00:00', is_active: true }];
      mountPosTopbar();
      await flushPromises();

      expect(mockShiftStore.fetchMasterShifts).not.toHaveBeenCalled();
    });

    it('[Happy Path] Selalu fetch current shift', async () => {
      mountPosTopbar();
      await flushPromises();

      expect(mockShiftStore.fetchCurrentShift).toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 3. LOCK SCREEN
  // =====================================================================
  describe('Lock Screen', () => {
    it('[Happy Path] Memanggil lockScreen saat tombol diklik', async () => {
      const wrapper = mountPosTopbar();

      const lockButton = findButtonByText(wrapper, 'Lock Screen');
      await lockButton!.trigger('click');

      expect(mockSessionStore.lockScreen).toHaveBeenCalled();
    });

    it('[Happy Path] Membuka modal handover saat trigger-handover dari LockScreen', async () => {
      const wrapper = mountPosTopbar();

      const lockScreen = wrapper.findComponent({ name: 'LockScreen' });
      await lockScreen.vm.$emit('trigger-handover');
      await flushPromises();

      const handoverModal = wrapper.findComponent({ name: 'HandoverShiftModal' });
      expect(handoverModal.props('isOpen')).toBe(true);
    });
  });

  // =====================================================================
  // 4. HANDOVER BUTTON
  // =====================================================================
  describe('Handover Button', () => {
    it('[Happy Path] Membuka modal handover saat tombol diklik', async () => {
      const wrapper = mountPosTopbar();

      const handoverButton = findButtonByText(wrapper, 'Handover');
      await handoverButton!.trigger('click');
      await flushPromises();

      const handoverModal = wrapper.findComponent({ name: 'HandoverShiftModal' });
      expect(handoverModal.props('isOpen')).toBe(true);
    });

    it('[Negative Path] Tombol handover disabled saat overtime', () => {
      mockShiftStore.shiftStatus = 'overtime';
      const wrapper = mountPosTopbar();

      const handoverButton = findButtonByText(wrapper, 'Handover');
      expect(handoverButton!.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Tombol handover enabled saat tidak overtime', () => {
      const wrapper = mountPosTopbar();

      const handoverButton = findButtonByText(wrapper, 'Handover');
      expect(handoverButton!.attributes('disabled')).toBeUndefined();
    });
  });

  // =====================================================================
  // 5. END SHIFT BUTTON
  // =====================================================================
  describe('End Shift Button', () => {
    it('[Happy Path] Membuka modal close shift saat tombol diklik', async () => {
      const wrapper = mountPosTopbar();

      const endShiftButton = findButtonByText(wrapper, 'End Shift');
      await endShiftButton!.trigger('click');
      await flushPromises();

      const closeModal = wrapper.findComponent({ name: 'CloseShiftModal' });
      expect(closeModal.props('isOpen')).toBe(true);
    });
  });

  // =====================================================================
  // 6. AUTO-TRIGGER END SHIFT
  // =====================================================================
  describe('Auto-Trigger End Shift', () => {
    it('[Happy Path] Membuka modal close shift saat overtime + grace period used', async () => {
      mockShiftStore.shiftStatus = 'overtime';
      mockShiftStore.hasUsedGracePeriod = true;
      mockShiftStore.isFinishingOvertimeTransaction = false;

      const wrapper = mountPosTopbar();
      await flushPromises();

      const closeModal = wrapper.findComponent({ name: 'CloseShiftModal' });
      expect(closeModal.props('isOpen')).toBe(true);
    });

    it('[Negative Path] Tidak membuka modal saat overtime tapi grace period belum digunakan', async () => {
      mockShiftStore.shiftStatus = 'overtime';
      mockShiftStore.hasUsedGracePeriod = false;
      mockShiftStore.isFinishingOvertimeTransaction = false;

      const wrapper = mountPosTopbar();
      await flushPromises();

      const closeModal = wrapper.findComponent({ name: 'CloseShiftModal' });
      expect(closeModal.props('isOpen')).toBe(false);
    });

    it('[Negative Path] Tidak membuka modal saat sedang finishing overtime transaction', async () => {
      mockShiftStore.shiftStatus = 'overtime';
      mockShiftStore.hasUsedGracePeriod = true;
      mockShiftStore.isFinishingOvertimeTransaction = true;

      const wrapper = mountPosTopbar();
      await flushPromises();

      const closeModal = wrapper.findComponent({ name: 'CloseShiftModal' });
      expect(closeModal.props('isOpen')).toBe(false);
    });
  });

  // =====================================================================
  // 7. MODAL SUCCESS HANDLERS
  // =====================================================================
  describe('Modal Success Handlers', () => {
    it('[Happy Path] Logout saat close shift berhasil', async () => {
      const wrapper = mountPosTopbar();

      const closeModal = wrapper.findComponent({ name: 'CloseShiftModal' });
      await closeModal.vm.$emit('success');
      await flushPromises();

      expect(mockAuthStore.logout).toHaveBeenCalled();
    });

    it('[Happy Path] Logout dan clear state saat handover berhasil', async () => {
      const wrapper = mountPosTopbar();

      const handoverModal = wrapper.findComponent({ name: 'HandoverShiftModal' });
      await handoverModal.vm.$emit('success');
      await flushPromises();

      expect(mockSessionStore.clearRateLimit).toHaveBeenCalled();
      expect(mockAuthStore.logout).toHaveBeenCalled();
    });

    it('[Happy Path] Menutup modal handover saat success', async () => {
      const wrapper = mountPosTopbar();

      const handoverModal = wrapper.findComponent({ name: 'HandoverShiftModal' });
      await handoverModal.vm.$emit('success');
      await flushPromises();

      expect(handoverModal.props('isOpen')).toBe(false);
    });
  });

  // =====================================================================
  // 8. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] shiftStatus overtime menampilkan dot error', () => {
      mockShiftStore.shiftStatus = 'overtime';
      const wrapper = mountPosTopbar();

      const dot = wrapper.find('.pulse-dot');
      expect(dot.classes()).toContain('bg-error');
    });

    it('[Edge Case] shiftStatus safe menampilkan dot success', () => {
      const wrapper = mountPosTopbar();

      const dot = wrapper.find('.pulse-dot');
      expect(dot.classes()).toContain('bg-success');
    });

    it('[Corner Case] currentShift null menampilkan "Active"', () => {
      mockShiftStore.currentShift = null;
      const wrapper = mountPosTopbar();

      expect(wrapper.text()).toContain('Active');
    });

    it('[Corner Case] Menutup modal close shift saat event close', async () => {
      mockShiftStore.shiftStatus = 'overtime';
      mockShiftStore.hasUsedGracePeriod = true;
      const wrapper = mountPosTopbar();
      await flushPromises();

      const closeModal = wrapper.findComponent({ name: 'CloseShiftModal' });
      await closeModal.vm.$emit('close');
      await flushPromises();

      expect(closeModal.props('isOpen')).toBe(false);
    });
  });
});