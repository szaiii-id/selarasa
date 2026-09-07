// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { useShiftStore } from '@/stores/shiftStore';
import ShiftPin from '../ShiftPin.vue';
import type { StartShiftPayload, CloseShiftPayload, HandoverShiftPayload } from '@/types/shift';

// Mock shiftStore
vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
}));

// Mock usePinKeyboard
vi.mock('@/composables/usePinKeyboard', () => ({
  usePinKeyboard: vi.fn(),
}));

describe('ShiftPin Component', () => {
  let mockShiftStore: any;

  const createStartForm = (): StartShiftPayload => ({
    shift_id: 1,
    opening_balance: 500000,
    pin_code: '',
    notes: '',
  });

  const createCloseForm = (): CloseShiftPayload => ({
    expected_balance: 1000000,
    closing_balance: 1000000,
    pin_code: '',
    notes: '',
  });

  const createHandoverForm = (): HandoverShiftPayload => ({
    to_user_id: 'uuid-123',
    to_user_pin: '654321',
    pin_code: '',
    amount_counted: 750000,
    notes: '',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockShiftStore = {
      isLoading: false,
      masterShifts: [
        { id: 1, name: 'Morning Shift', start_time: '08:00:00', end_time: '16:00:00', is_active: true },
      ],
      clearErrors: vi.fn(),
    };

    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountShiftPin = (props: {
    form: StartShiftPayload | CloseShiftPayload | HandoverShiftPayload;
    isClosing?: boolean;
    isHandover?: boolean;
  }) => {
    return mount(ShiftPin, {
      props,
      global: {
        stubs: {
          Transition: false,
        },
      },
    });
  };

  // =====================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =====================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan label "Opening Balance" untuk start shift', () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.text()).toContain('Opening Balance');
    });

    it('[Happy Path] Menampilkan label "Closing Cash Balance" untuk closing', () => {
      const wrapper = mountShiftPin({ 
        form: createCloseForm(), 
        isClosing: true 
      });

      expect(wrapper.text()).toContain('Closing Cash Balance');
    });

    it('[Happy Path] Menampilkan label "Counted Cash Amount" untuk handover', () => {
      const wrapper = mountShiftPin({ 
        form: createHandoverForm(), 
        isHandover: true 
      });

      expect(wrapper.text()).toContain('Counted Cash Amount');
    });

    it('[Happy Path] Menampilkan selected shift untuk start shift', () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.text()).toContain('Selected Shift');
      expect(wrapper.text()).toContain('Morning Shift');
    });

    it('[Negative Path] Tidak menampilkan selected shift untuk closing', () => {
      const wrapper = mountShiftPin({ 
        form: createCloseForm(), 
        isClosing: true 
      });

      expect(wrapper.text()).not.toContain('Selected Shift');
    });

    it('[Negative Path] Tidak menampilkan selected shift untuk handover', () => {
      const wrapper = mountShiftPin({ 
        form: createHandoverForm(), 
        isHandover: true 
      });

      expect(wrapper.text()).not.toContain('Selected Shift');
    });
  });

  // =====================================================================
  // 2. DISPLAY BALANCE
  // =====================================================================
  describe('Display Balance', () => {
    it('[Happy Path] Menampilkan opening balance untuk start shift', () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      // Cari elemen yang menampilkan balance
      const balanceElement = wrapper.find('p.text-xl');
      expect(balanceElement.exists()).toBe(true);
      expect(balanceElement.text()).toContain('500.000');
    });

    it('[Happy Path] Menampilkan closing balance untuk closing', () => {
      const wrapper = mountShiftPin({ 
        form: createCloseForm(), 
        isClosing: true 
      });

      const balanceElement = wrapper.find('p.text-xl');
      expect(balanceElement.exists()).toBe(true);
      expect(balanceElement.text()).toContain('1.000.000');
    });

    it('[Happy Path] Menampilkan amount_counted untuk handover', () => {
      const wrapper = mountShiftPin({ 
        form: createHandoverForm(), 
        isHandover: true 
      });

      const balanceElement = wrapper.find('p.text-xl');
      expect(balanceElement.exists()).toBe(true);
      expect(balanceElement.text()).toContain('750.000');
    });
  });

  // =====================================================================
  // 3. PIN INPUT
  // =====================================================================
  describe('PIN Input', () => {
    it('[Happy Path] Menekan tombol angka menambahkan digit PIN', async () => {
      const form = createStartForm();
      const wrapper = mountShiftPin({ form });

      const button1 = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
      await button1!.trigger('click');
      await flushPromises();

      expect(form.pin_code).toBe('1');
    });

    it('[Happy Path] Maksimal 6 digit PIN', async () => {
      const form = createStartForm();
      const wrapper = mountShiftPin({ form });

      for (let i = 0; i < 7; i++) {
        const button1 = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
        await button1!.trigger('click');
      }
      await flushPromises();

      expect(form.pin_code.length).toBe(6);
    });

    it('[Happy Path] Tombol CLEAR mengosongkan PIN', async () => {
      const form = createStartForm();
      form.pin_code = '123';
      const wrapper = mountShiftPin({ form });

      const clearButton = wrapper.findAll('button').find(btn => btn.text().includes('CLEAR'));
      await clearButton!.trigger('click');
      await flushPromises();

      expect(form.pin_code).toBe('');
    });

    it('[Happy Path] Tombol Backspace menghapus 1 digit', async () => {
      const form = createStartForm();
      form.pin_code = '123';
      const wrapper = mountShiftPin({ form });

      // Cari tombol backspace - tombol yang memiliki svg dan BUKAN tombol Back
      const backspaceButton = wrapper.findAll('button').find(btn => 
        btn.find('svg').exists() && !btn.text().includes('Back')
      );
      expect(backspaceButton).toBeTruthy();
      await backspaceButton!.trigger('click');
      await flushPromises();

      expect(form.pin_code).toBe('12');
    });

    it('[Happy Path] Menekan tombol 0 menambahkan digit 0', async () => {
      const form = createStartForm();
      const wrapper = mountShiftPin({ form });

      const button0 = wrapper.findAll('button').find(btn => btn.text().trim() === '0');
      await button0!.trigger('click');
      await flushPromises();

      expect(form.pin_code).toBe('0');
    });
  });

  // =====================================================================
  // 4. SUBMIT BUTTON
  // =====================================================================
  describe('Submit Button', () => {
    it('[Happy Path] Menampilkan "Start Shift Now" untuk start shift', () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.text()).toContain('Start Shift Now');
    });

    it('[Happy Path] Menampilkan "End Shift Now" untuk closing', () => {
      const wrapper = mountShiftPin({ 
        form: createCloseForm(), 
        isClosing: true 
      });

      expect(wrapper.text()).toContain('End Shift Now');
    });

    it('[Happy Path] Menampilkan "Complete Handover" untuk handover', () => {
      const wrapper = mountShiftPin({ 
        form: createHandoverForm(), 
        isHandover: true 
      });

      expect(wrapper.text()).toContain('Complete Handover');
    });

    it('[Happy Path] Menampilkan "Processing..." saat isLoading', () => {
      mockShiftStore.isLoading = true;
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.text()).toContain('Processing...');
    });

    it('[Negative Path] Tombol disabled jika PIN kurang dari 6 digit', () => {
      const form = createStartForm();
      form.pin_code = '12345';
      const wrapper = mountShiftPin({ form });

      const submitButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Start Shift Now')
      );
      expect(submitButton!.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Tombol enabled jika PIN 6 digit', () => {
      const form = createStartForm();
      form.pin_code = '123456';
      const wrapper = mountShiftPin({ form });

      const submitButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Start Shift Now')
      );
      expect(submitButton!.attributes('disabled')).toBeUndefined();
    });

    it('[Negative Path] Tombol disabled jika isLoading', () => {
      mockShiftStore.isLoading = true;
      const form = createStartForm();
      form.pin_code = '123456';
      const wrapper = mountShiftPin({ form });

      const submitButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Processing...')
      );
      expect(submitButton!.attributes('disabled')).toBeDefined();
    });

    it('[Happy Path] Emit "submit" saat tombol diklik dengan PIN 6 digit', async () => {
      const form = createStartForm();
      form.pin_code = '123456';
      const wrapper = mountShiftPin({ form });

      const submitButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Start Shift Now')
      );
      await submitButton!.trigger('click');

      expect(wrapper.emitted('submit')).toBeTruthy();
    });

    it('[Negative Path] Tidak emit "submit" jika PIN kurang dari 6 digit', async () => {
      const form = createStartForm();
      form.pin_code = '123';
      const wrapper = mountShiftPin({ form });

      const submitButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Start Shift Now')
      );
      await submitButton!.trigger('click');

      expect(wrapper.emitted('submit')).toBeFalsy();
    });
  });

  // =====================================================================
  // 5. BACK BUTTON
  // =====================================================================
  describe('Back Button', () => {
    it('[Happy Path] Emit "back" saat tombol Back diklik', async () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      const backButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Back')
      );
      await backButton!.trigger('click');

      expect(wrapper.emitted('back')).toBeTruthy();
    });

    it('[Happy Path] Menampilkan teks "Back"', () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.text()).toContain('Back');
    });
  });

  // =====================================================================
  // 6. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] PIN dengan semua digit 0', async () => {
      const form = createStartForm();
      const wrapper = mountShiftPin({ form });

      const button0 = wrapper.findAll('button').find(btn => btn.text().trim() === '0');
      for (let i = 0; i < 6; i++) {
        await button0!.trigger('click');
      }
      await flushPromises();

      expect(form.pin_code).toBe('000000');
    });

    it('[Corner Case] Spinner muncul saat isLoading', () => {
      mockShiftStore.isLoading = true;
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.find('svg.animate-spin').exists()).toBe(true);
    });

    it('[Corner Case] Tidak ada spinner saat tidak loading', () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      expect(wrapper.find('svg.animate-spin').exists()).toBe(false);
    });

    it('[Edge Case] clearErrors dipanggil saat menambah PIN', async () => {
      const wrapper = mountShiftPin({ form: createStartForm() });

      const button1 = wrapper.findAll('button').find(btn => btn.text().trim() === '1');
      await button1!.trigger('click');

      expect(mockShiftStore.clearErrors).toHaveBeenCalled();
    });

    it('[Corner Case] Dots PIN menampilkan jumlah yang benar', () => {
      const form = createStartForm();
      form.pin_code = '123';
      const wrapper = mountShiftPin({ form });

      const dots = wrapper.findAll('.w-5.h-5');
      const filledDots = dots.filter(dot => dot.classes().includes('bg-primary'));
      expect(filledDots.length).toBe(3);
    });
  });
});