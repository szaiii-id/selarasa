// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises, VueWrapper, DOMWrapper } from '@vue/test-utils';
import { computed } from 'vue';
import { useShiftStore } from '@/stores/shiftStore';
import CloseShift from '../CloseShift.vue';

// Mock shiftStore
vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
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

// Mock useCurrencyInput - Menggunakan computed dari vue
vi.mock('@/composables/useCurrencyInput', () => ({
  useCurrencyInput: vi.fn((getValue: () => number | null | undefined, setValue: (val: number) => void) => {
    return computed({
      get: () => {
        const val = getValue();
        if (!val) return '';
        return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      },
      set: (val: string) => {
        const numericString = val.replace(/\D/g, '');
        setValue(numericString ? parseInt(numericString, 10) : 0);
      }
    });
  }),
}));

describe('CloseShift Component', () => {
  let mockShiftStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockShiftStore = {
      errorMessage: null,
      validationErrors: {},
      isLoading: false,
      clearErrors: vi.fn(),
      closeShift: vi.fn(),
    };

    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountCloseShift = (isOpen = true): VueWrapper => {
    return mount(CloseShift, {
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

  // Helper untuk pindah ke step 2
  const goToStep2 = async (wrapper: VueWrapper): Promise<void> => {
    const vm = wrapper.vm as any;
    vm.form.closing_balance = 1000000;
    await flushPromises();

    const continueButton = wrapper.findAll('button').find((btn: DOMWrapper<HTMLButtonElement>) => 
      btn.text().includes('Continue')
    );
    await continueButton!.trigger('click');
    await flushPromises();
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
    it('[Happy Path] Menampilkan modal saat isOpen=true', () => {
      const wrapper = mountCloseShift(true);
      expect(wrapper.text()).toContain('End Shift');
    });

    it('[Negative Path] Tidak menampilkan modal saat isOpen=false', () => {
      const wrapper = mountCloseShift(false);
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
    });

    it('[Happy Path] Menampilkan label "Total Cash in Drawer"', () => {
      const wrapper = mountCloseShift();
      expect(wrapper.text()).toContain('Total Cash in Drawer');
    });

    it('[Happy Path] Menampilkan input amount dengan prefix Rp', () => {
      const wrapper = mountCloseShift();
      expect(wrapper.text()).toContain('Rp');
      expect(wrapper.find('input[inputmode="numeric"]').exists()).toBe(true);
    });

    it('[Happy Path] Menampilkan textarea notes', () => {
      const wrapper = mountCloseShift();
      expect(wrapper.text()).toContain('Notes');
      expect(wrapper.find('textarea').exists()).toBe(true);
    });

    it('[Happy Path] Menampilkan tombol Continue', () => {
      const wrapper = mountCloseShift();
      expect(wrapper.text()).toContain('Continue');
    });
  });

  // =====================================================================
  // 2. VALIDATION (goToStep2)
  // =====================================================================
  describe('Validation (goToStep2)', () => {
    it('[Negative Path] Menampilkan error jika closing_balance kosong', async () => {
      const wrapper = mountCloseShift();

      const continueButton = findButtonByText(wrapper, 'Continue');
      await continueButton!.trigger('click');

      expect(mockShiftStore.errorMessage).toBe('Please enter the total cash in drawer.');
    });

    it('[Negative Path] Menampilkan error jika closing_balance 0', async () => {
      const wrapper = mountCloseShift();
      const vm = wrapper.vm as any;
      vm.form.closing_balance = 0;

      const continueButton = findButtonByText(wrapper, 'Continue');
      await continueButton!.trigger('click');

      expect(mockShiftStore.errorMessage).toBe('Please enter the total cash in drawer.');
    });

    it('[Happy Path] Pindah ke step 2 jika closing_balance valid', async () => {
      const wrapper = mountCloseShift();
      await goToStep2(wrapper);

      expect(wrapper.text()).toContain('Verify your shift details');
    });

    it('[Happy Path] Memanggil clearErrors saat goToStep2', async () => {
      const wrapper = mountCloseShift();
      const vm = wrapper.vm as any;
      vm.form.closing_balance = 1000000;

      const continueButton = findButtonByText(wrapper, 'Continue');
      await continueButton!.trigger('click');

      expect(mockShiftStore.clearErrors).toHaveBeenCalled();
    });

    it('[Happy Path] Mereset pin_code saat pindah ke step 2', async () => {
      const wrapper = mountCloseShift();
      const vm = wrapper.vm as any;
      vm.form.closing_balance = 1000000;
      vm.form.pin_code = '123';

      const continueButton = findButtonByText(wrapper, 'Continue');
      await continueButton!.trigger('click');
      await flushPromises();

      expect(vm.form.pin_code).toBe('');
    });
  });

  // =====================================================================
  // 3. SUBMIT CLOSE SHIFT
  // =====================================================================
  describe('Submit Close Shift', () => {
    it('[Happy Path] Emit "success" jika close shift berhasil', async () => {
      mockShiftStore.closeShift.mockResolvedValue(true);
      const wrapper = mountCloseShift();
      
      await goToStep2(wrapper);

      const vm = wrapper.vm as any;
      vm.form.pin_code = '123456';
      await flushPromises();

      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      expect(shiftPin.exists()).toBe(true);
      await shiftPin.vm.$emit('submit');
      await flushPromises();

      expect(mockShiftStore.closeShift).toHaveBeenCalled();
      expect(wrapper.emitted('success')).toBeTruthy();
    });

    it('[Negative Path] Menampilkan error jika PIN kurang dari 6 digit', async () => {
      const wrapper = mountCloseShift();
      
      await goToStep2(wrapper);

      const vm = wrapper.vm as any;
      vm.form.pin_code = '123';
      await flushPromises();

      const shiftPin = wrapper.findComponent({ name: 'ShiftPin' });
      await shiftPin.vm.$emit('submit');
      await flushPromises();

      expect(mockShiftStore.errorMessage).toBe('PIN must be 6 digits.');
    });
  });

  // =====================================================================
  // 4. CLOSE MODAL
  // =====================================================================
  describe('Close Modal', () => {
    it('[Happy Path] Emit "close" saat tombol Cancel diklik', async () => {
      const wrapper = mountCloseShift();

      const cancelButton = findButtonByText(wrapper, 'Cancel');
      await cancelButton!.trigger('click');

      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Happy Path] Mereset form saat modal ditutup', async () => {
      const wrapper = mountCloseShift();
      const vm = wrapper.vm as any;
      
      vm.form.closing_balance = 1000000;
      vm.form.pin_code = '123456';
      vm.form.notes = 'Test notes';

      const cancelButton = findButtonByText(wrapper, 'Cancel');
      await cancelButton!.trigger('click');
      await flushPromises();

      expect(vm.form.closing_balance).toBe(0);
      expect(vm.form.pin_code).toBe('');
      expect(vm.form.notes).toBe('');
    });

    it('[Happy Path] Memanggil clearErrors saat modal ditutup', async () => {
      const wrapper = mountCloseShift();

      const cancelButton = findButtonByText(wrapper, 'Cancel');
      await cancelButton!.trigger('click');

      expect(mockShiftStore.clearErrors).toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 5. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Menampilkan error banner jika errorMessage ada', () => {
      mockShiftStore.errorMessage = 'Test error message';
      const wrapper = mountCloseShift();

      expect(wrapper.text()).toContain('Test error message');
    });

    it('[Corner Case] Menampilkan validation error closing_balance', () => {
      mockShiftStore.validationErrors = {
        closing_balance: ['Closing balance is required.'],
      };
      const wrapper = mountCloseShift();

      expect(wrapper.text()).toContain('Closing balance is required.');
    });

    it('[Corner Case] Textarea memiliki placeholder yang benar', () => {
      const wrapper = mountCloseShift();

      const textarea = wrapper.find('textarea');
      expect(textarea.attributes('placeholder')).toBe('Discrepancy reasons, etc.');
    });

    it('[Edge Case] Input amount memiliki placeholder "0"', () => {
      const wrapper = mountCloseShift();

      const input = wrapper.find('input[inputmode="numeric"]');
      expect(input.attributes('placeholder')).toBe('0');
    });
  });
});