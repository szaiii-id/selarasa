// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, VueWrapper, DOMWrapper } from '@vue/test-utils';
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import OpenShiftIndex from '../OpenShiftIndex.vue';
import type { MasterShift } from '@/types/shift';

// Mock router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock stores
vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock child components
vi.mock('@/components/common/BrandLogo.vue', () => ({
  default: {
    name: 'BrandLogo',
    template: '<div class="brand-logo">BrandLogo</div>',
  },
}));

vi.mock('@/components/shift/ShiftSetup.vue', () => ({
  default: {
    name: 'ShiftSetup',
    template: '<div class="shift-setup"><slot /></div>',
    props: ['form'],
    emits: ['next'],
  },
}));

vi.mock('@/components/shift/ShiftPin.vue', () => ({
  default: {
    name: 'ShiftPin',
    template: '<div class="shift-pin"><slot /></div>',
    props: ['form'],
    emits: ['back', 'submit'],
  },
}));

vi.mock('@/components/common/ConfirmModal.vue', () => ({
  default: {
    name: 'ConfirmModal',
    template: '<div class="confirm-modal"><slot /></div>',
    props: ['isOpen', 'isLoading', 'title', 'message', 'confirmText', 'theme'],
    emits: ['close', 'confirm'],
  },
}));

vi.mock('@/components/common/AlertBanner.vue', () => ({
  default: {
    name: 'AlertBanner',
    template: '<div class="alert-banner">{{ message }}</div>',
    props: ['message', 'type'],
  },
}));

describe('OpenShiftIndex Component', () => {
  let mockShiftStore: any;
  let mockAuthStore: any;

  const mockMasterShifts: MasterShift[] = [
    { id: 1, name: 'Morning Shift', start_time: '08:00:00', end_time: '16:00:00', is_active: true },
    { id: 2, name: 'Evening Shift', start_time: '16:00:00', end_time: '00:00:00', is_active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockShiftStore = {
      currentShift: null,
      masterShifts: [],
      errorMessage: null,
      validationErrors: {},
      isLoading: false,
      isCheckingSession: false,
      clearErrors: vi.fn(),
      fetchCurrentShift: vi.fn(),
      fetchMasterShifts: vi.fn(),
      startShift: vi.fn(),
    };

    mockAuthStore = {
      isLoading: false,
      logout: vi.fn(),
    };

    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountOpenShiftIndex = (): VueWrapper => {
    return mount(OpenShiftIndex, {
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

  // Helper untuk pindah ke step 2
  const goToStep2 = async (wrapper: VueWrapper): Promise<void> => {
    const shiftSetup = wrapper.findComponent({ name: 'ShiftSetup' });
    await shiftSetup.vm.$emit('next');
    await flushPromises();
  };

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan BrandLogo', () => {
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('BrandLogo');
    });

    it('[Happy Path] Menampilkan judul "Start Shift"', () => {
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('Start Shift');
    });

    it('[Happy Path] Menampilkan subtitle step 1', () => {
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('Set up your cash drawer to begin');
    });

    it('[Happy Path] Menampilkan tombol Switch Account', () => {
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('Switch Account');
    });

    it('[Happy Path] Menampilkan loading spinner saat isCheckingSession', () => {
      mockShiftStore.isCheckingSession = true;
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('Authenticating System...');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('[Negative Path] Tidak menampilkan form saat loading', () => {
      mockShiftStore.isCheckingSession = true;
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.find('.shift-setup').exists()).toBe(false);
    });
  });

  // =====================================================================
  // 2. ON MOUNTED
  // =====================================================================
  describe('On Mounted', () => {
    it('[Happy Path] Fetch current shift saat mount', async () => {
      mountOpenShiftIndex();
      await flushPromises();
      expect(mockShiftStore.fetchCurrentShift).toHaveBeenCalled();
    });

    it('[Happy Path] Redirect ke Home jika sudah ada current shift', async () => {
      mockShiftStore.currentShift = { id: 1, status: 'open' };
      mountOpenShiftIndex();
      await flushPromises();
      expect(mockPush).toHaveBeenCalledWith({ name: 'Home' });
    });

    it('[Happy Path] Fetch master shifts jika tidak ada current shift', async () => {
      mockShiftStore.currentShift = null;
      mockShiftStore.masterShifts = [];
      mountOpenShiftIndex();
      await flushPromises();
      expect(mockShiftStore.fetchMasterShifts).toHaveBeenCalled();
    });

    it('[Happy Path] Auto-select shift berdasarkan waktu', async () => {
      mockShiftStore.currentShift = null;
      mockShiftStore.masterShifts = mockMasterShifts;
      const wrapper = mountOpenShiftIndex();
      await flushPromises();
      const vm = wrapper.vm as any;
      expect(vm.form.shift_id).not.toBe(0);
    });

    it('[Happy Path] Auto-select shift pertama jika tidak ada yang cocok', async () => {
      mockShiftStore.currentShift = null;
      mockShiftStore.masterShifts = [
        { id: 99, name: 'Custom', start_time: '00:00:00', end_time: '23:59:59', is_active: true },
      ];
      const wrapper = mountOpenShiftIndex();
      await flushPromises();
      const vm = wrapper.vm as any;
      expect(vm.form.shift_id).toBe(99);
    });
  });

  // =====================================================================
  // 3. STEP NAVIGATION
  // =====================================================================
  describe('Step Navigation', () => {
    it('[Happy Path] Pindah ke step 2 saat ShiftSetup emit next', async () => {
      const wrapper = mountOpenShiftIndex();
      await goToStep2(wrapper);
      expect(wrapper.text()).toContain('Verify your shift details');
    });

    it('[Happy Path] Pindah kembali ke step 1 saat ShiftPin emit back', async () => {
      const wrapper = mountOpenShiftIndex();
      await goToStep2(wrapper);

      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      await shiftPin.vm.$emit('back');
      await flushPromises();

      expect(wrapper.text()).toContain('Set up your cash drawer to begin');
    });

    it('[Happy Path] Mereset pin_code saat pindah ke step 2', async () => {
      const wrapper = mountOpenShiftIndex();
      const vm = wrapper.vm as any;
      vm.form.pin_code = '123';

      await goToStep2(wrapper);

      expect(vm.form.pin_code).toBe('');
    });
  });

  // =====================================================================
  // 4. SUBMIT SHIFT
  // =====================================================================
  describe('Submit Shift', () => {
    it('[Happy Path] Redirect ke Home jika startShift berhasil', async () => {
      mockShiftStore.startShift.mockResolvedValue(true);
      const wrapper = mountOpenShiftIndex();
      
      // Pindah ke step 2
      await goToStep2(wrapper);

      // Set PIN 6 digit
      const vm = wrapper.vm as any;
      vm.form.pin_code = '123456';
      vm.form.shift_id = 1;
      await flushPromises();

      // Cari ShiftPin dan emit submit
      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      expect(shiftPin.exists()).toBe(true);
      await shiftPin.vm.$emit('submit');
      await flushPromises();

      expect(mockShiftStore.startShift).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith({ name: 'Home' });
    });

    it('[Negative Path] Tidak redirect jika startShift gagal', async () => {
      mockShiftStore.startShift.mockResolvedValue(false);
      const wrapper = mountOpenShiftIndex();
      
      await goToStep2(wrapper);

      const vm = wrapper.vm as any;
      vm.form.pin_code = '123456';
      vm.form.shift_id = 1;
      await flushPromises();

      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      await shiftPin.vm.$emit('submit');
      await flushPromises();

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('[Negative Path] Tidak submit jika PIN kurang dari 6 digit', async () => {
      const wrapper = mountOpenShiftIndex();
      
      await goToStep2(wrapper);

      const vm = wrapper.vm as any;
      vm.form.pin_code = '123';
      await flushPromises();

      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      await shiftPin.vm.$emit('submit');
      await flushPromises();

      expect(mockShiftStore.startShift).not.toHaveBeenCalled();
    });

    it('[Happy Path] Mereset pin_code jika startShift gagal', async () => {
      mockShiftStore.startShift.mockResolvedValue(false);
      const wrapper = mountOpenShiftIndex();
      
      await goToStep2(wrapper);

      const vm = wrapper.vm as any;
      vm.form.pin_code = '123456';
      await flushPromises();

      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      await shiftPin.vm.$emit('submit');
      await flushPromises();

      expect(vm.form.pin_code).toBe('');
    });
  });

  // =====================================================================
  // 5. LOGOUT MODAL
  // =====================================================================
  describe('Logout Modal', () => {
    it('[Happy Path] Membuka modal konfirmasi saat Switch Account diklik', async () => {
      const wrapper = mountOpenShiftIndex();

      const switchButton = findButtonByText(wrapper, 'Switch Account');
      await switchButton!.trigger('click');
      await flushPromises();

      const confirmModal = wrapper.findComponent({ name: 'ConfirmModal' });
      expect(confirmModal.props('isOpen')).toBe(true);
    });

    it('[Happy Path] Logout saat konfirmasi', async () => {
      const wrapper = mountOpenShiftIndex();

      const confirmModal = wrapper.findComponent({ name: 'ConfirmModal' });
      await confirmModal.vm.$emit('confirm');
      await flushPromises();

      expect(mockAuthStore.logout).toHaveBeenCalled();
    });

    it('[Happy Path] Menutup modal saat close', async () => {
      const wrapper = mountOpenShiftIndex();

      const switchButton = findButtonByText(wrapper, 'Switch Account');
      await switchButton!.trigger('click');
      await flushPromises();

      const confirmModal = wrapper.findComponent({ name: 'ConfirmModal' });
      await confirmModal.vm.$emit('close');
      await flushPromises();

      expect(confirmModal.props('isOpen')).toBe(false);
    });

    it('[Happy Path] Tombol Switch Account disabled saat loading', () => {
      mockAuthStore.isLoading = true;
      const wrapper = mountOpenShiftIndex();

      const switchButton = findButtonByText(wrapper, 'Switch Account');
      expect(switchButton!.attributes('disabled')).toBeDefined();
    });
  });

  // =====================================================================
  // 6. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Menampilkan error banner jika errorMessage ada', () => {
      mockShiftStore.errorMessage = 'Test error message';
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('Test error message');
    });

    it('[Corner Case] Tidak ada master shifts tersedia', async () => {
      mockShiftStore.currentShift = null;
      mockShiftStore.masterShifts = [];
      const wrapper = mountOpenShiftIndex();
      await flushPromises();
      const vm = wrapper.vm as any;
      expect(vm.form.shift_id).toBe(0);
    });

    it('[Edge Case] Loading spinner juga muncul saat isLoading', () => {
      mockShiftStore.isLoading = true;
      const wrapper = mountOpenShiftIndex();
      expect(wrapper.text()).toContain('Authenticating System...');
    });
  });
});