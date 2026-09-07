// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import HandoverShift from '../HandoverShift.vue';
import type { User } from '@/types/shift';

// Mock stores
vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock AlertBanner
vi.mock('@/components/common/AlertBanner.vue', () => ({
  default: {
    name: 'AlertBanner',
    template: '<div class="alert-banner">{{ message }}</div>',
    props: ['message', 'type'],
  },
}));

// Mock usePinKeyboard
vi.mock('@/composables/usePinKeyboard', () => ({
  usePinKeyboard: vi.fn(),
}));

// Mock useCurrencyInput dengan implementasi yang benar
vi.mock('@/composables/useCurrencyInput', () => ({
  useCurrencyInput: vi.fn((getValue: () => number | null | undefined, setValue: (val: number) => void) => {
    return {
      get value() {
        const val = getValue();
        if (!val) return '';
        return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      },
      set value(val: string) {
        const numericString = val.replace(/\D/g, '');
        setValue(numericString ? parseInt(numericString, 10) : 0);
      }
    };
  }),
}));

describe('HandoverShift Component', () => {
  let mockShiftStore: any;
  let mockAuthStore: any;

  const mockCashiers: User[] = [
    { id: 'uuid-1', name: 'John Doe', username: 'johndoe', role: 'cashier', is_active: true },
    { id: 'uuid-2', name: 'Jane Smith', username: 'janesmith', role: 'cashier', is_active: true },
    { id: 'uuid-3', name: 'Bob Wilson', username: 'bobwilson', role: 'cashier', is_active: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockShiftStore = {
      currentShift: {
        user_id: 'uuid-1',
        shift_id: 1,
      },
      activeCashiers: mockCashiers,
      errorMessage: null,
      validationErrors: {},
      isLoading: false,
      clearErrors: vi.fn(),
      fetchActiveCashiers: vi.fn(),
      handoverShift: vi.fn(),
    };

    mockAuthStore = {
      user: { id: 'uuid-1', name: 'John Doe', username: 'johndoe' },
    };

    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountHandoverShift = (isOpen = true) => {
    return mount(HandoverShift, {
      props: {
        isOpen,
      },
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
    it('[Happy Path] Menampilkan modal saat isOpen=true', () => {
      const wrapper = mountHandoverShift(true);
      expect(wrapper.text()).toContain('Shift Handover');
    });

    it('[Negative Path] Tidak menampilkan modal saat isOpen=false', () => {
      const wrapper = mountHandoverShift(false);
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
    });
  });

  // =====================================================================
  // 2. STEP 1 VALIDATION
  // =====================================================================
  describe('Step 1 Validation', () => {
    it('[Negative Path] Menampilkan error jika tidak memilih cashier', async () => {
      const wrapper = mountHandoverShift();

      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue to Verification')
      );
      await continueButton!.trigger('click');

      expect(mockShiftStore.errorMessage).toBe('Please select a receiver cashier from the list.');
    });

    it('[Negative Path] Menampilkan error jika PIN receiver kosong', async () => {
      const wrapper = mountHandoverShift();

      const select = wrapper.find('select');
      await select.setValue('uuid-2');
      await select.trigger('change');
      await flushPromises();

      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue to Verification')
      );
      await continueButton!.trigger('click');

      expect(mockShiftStore.errorMessage).toBe('Please enter the receiver PIN code (6 digits).');
    });

    it('[Happy Path] Pindah ke step 2 jika semua valid', async () => {
      const wrapper = mountHandoverShift();

      // Akses form langsung melalui vm
      const vm = wrapper.vm as any;
      
      // Set form values langsung
      vm.form.to_user_id = 'uuid-2';
      vm.form.to_user_pin = '654321';
      vm.form.amount_counted = 750000;
      
      await flushPromises();

      // Klik Continue
      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue to Verification')
      );
      await continueButton!.trigger('click');
      await flushPromises();

      // Verifikasi step 2 muncul
      expect(wrapper.text()).toContain('Verify your authorization');
    });
  });

  // =====================================================================
  // 3. FETCH CASHIERS
  // =====================================================================
  describe('Fetch Cashiers', () => {
    it('[Happy Path] Fetch cashiers saat modal dibuka dan daftar kosong', async () => {
      mockShiftStore.activeCashiers = [];
      
      const wrapper = mountHandoverShift(false);
      await wrapper.setProps({ isOpen: true });
      await flushPromises();

      expect(mockShiftStore.fetchActiveCashiers).toHaveBeenCalled();
    });

    it('[Happy Path] Tidak fetch cashiers jika sudah ada', async () => {
      const wrapper = mountHandoverShift(true);
      await flushPromises();

      expect(mockShiftStore.fetchActiveCashiers).not.toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 4. CASHIER SELECTION
  // =====================================================================
  describe('Cashier Selection', () => {
    it('[Happy Path] Menampilkan hanya cashier yang tidak sedang aktif', () => {
      const wrapper = mountHandoverShift();

      const options = wrapper.findAll('option');
      const optionTexts = options.map(opt => opt.text());
      
      expect(optionTexts).not.toContain('John Doe (@johndoe)');
      expect(optionTexts).toContain('Jane Smith (@janesmith)');
      expect(optionTexts).toContain('Bob Wilson (@bobwilson)');
    });
  });

  // =====================================================================
  // 5. CLOSE MODAL
  // =====================================================================
  describe('Close Modal', () => {
    it('[Happy Path] Emit "close" saat tombol Cancel diklik', async () => {
      const wrapper = mountHandoverShift();

      const cancelButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cancel')
      );
      await cancelButton!.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  // =====================================================================
  // 6. EDGE CASES
  // =====================================================================
  describe('Edge Cases', () => {
    it('[Edge Case] Menampilkan error banner jika errorMessage ada', () => {
      mockShiftStore.errorMessage = 'Test error message';
      const wrapper = mountHandoverShift();

      expect(wrapper.text()).toContain('Test error message');
    });

    it('[Corner Case] Menampilkan validation error to_user_id', () => {
      mockShiftStore.validationErrors = {
        to_user_id: ['Please select a cashier.'],
      };
      const wrapper = mountHandoverShift();

      expect(wrapper.text()).toContain('Please select a cashier.');
    });
  });
});