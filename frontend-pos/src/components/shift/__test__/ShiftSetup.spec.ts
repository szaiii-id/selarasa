// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useShiftStore } from '@/stores/shiftStore';
import ShiftSetup from '../ShiftSetup.vue';
import type { StartShiftPayload, MasterShift } from '@/types/shift';

// Mock shiftStore
vi.mock('@/stores/shiftStore', () => ({
  useShiftStore: vi.fn(),
}));

describe('ShiftSetup Component', () => {
  let mockShiftStore: any;

  const mockMasterShifts: MasterShift[] = [
    {
      id: 1,
      name: 'Morning Shift',
      start_time: '08:00:00',
      end_time: '16:00:00',
      is_active: true,
    },
    {
      id: 2,
      name: 'Evening Shift',
      start_time: '16:00:00',
      end_time: '00:00:00',
      is_active: true,
    },
    {
      id: 3,
      name: 'Night Shift',
      start_time: '00:00:00',
      end_time: '08:00:00',
      is_active: false,
    },
  ];

  const createMockForm = (): StartShiftPayload => ({
    shift_id: 0,
    opening_balance: 0,
    pin_code: '123456',
    notes: '',
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockShiftStore = {
      masterShifts: mockMasterShifts,
      errorMessage: null,
      validationErrors: {},
      clearErrors: vi.fn(),
    };

    vi.mocked(useShiftStore).mockReturnValue(mockShiftStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mountShiftSetup = (form?: StartShiftPayload) => {
    return mount(ShiftSetup, {
      props: {
        form: form || createMockForm(),
      },
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
    it('[Happy Path] Menampilkan daftar master shifts', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('Morning Shift');
      expect(wrapper.text()).toContain('Evening Shift');
      expect(wrapper.text()).toContain('Night Shift');
    });

    it('[Happy Path] Menampilkan waktu shift dengan format HH:MM', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('08:00');
      expect(wrapper.text()).toContain('16:00');
      expect(wrapper.text()).toContain('08:00 — 16:00');
    });

    it('[Happy Path] Menampilkan label "Select Active Shift"', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('1. Select Active Shift');
    });

    it('[Happy Path] Menampilkan label "Count Cash Drawer"', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('2. Count Cash Drawer');
    });

    it('[Happy Path] Menampilkan label "Notes (Optional)"', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('3. Notes');
      expect(wrapper.text()).toContain('(Optional)');
    });

    it('[Happy Path] Menampilkan tombol Continue', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('Continue');
    });

    it('[Negative Path] Tidak menampilkan shift jika masterShifts kosong', () => {
      mockShiftStore.masterShifts = [];
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).not.toContain('Morning Shift');
    });
  });

  // =====================================================================
  // 2. SHIFT SELECTION
  // =====================================================================
  describe('Shift Selection', () => {
    it('[Happy Path] Memilih shift mengubah form.shift_id', async () => {
      const form = createMockForm();
      const wrapper = mountShiftSetup(form);

      const morningShiftButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Morning Shift')
      );
      await morningShiftButton!.trigger('click');

      expect(form.shift_id).toBe(1);
    });

    it('[Happy Path] Memilih shift memanggil clearErrors', async () => {
      const wrapper = mountShiftSetup();

      const morningShiftButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Morning Shift')
      );
      await morningShiftButton!.trigger('click');

      expect(mockShiftStore.clearErrors).toHaveBeenCalled();
    });

    it('[Happy Path] Shift yang dipilih memiliki class border-primary', async () => {
      const form = createMockForm();
      form.shift_id = 1;
      const wrapper = mountShiftSetup(form);

      const morningShiftButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Morning Shift')
      );
      expect(morningShiftButton!.classes()).toContain('border-primary');
      expect(morningShiftButton!.classes()).toContain('bg-primary/10');
    });

    it('[Happy Path] Shift yang tidak dipilih tidak memiliki class border-primary', async () => {
      const form = createMockForm();
      form.shift_id = 1;
      const wrapper = mountShiftSetup(form);

      const eveningShiftButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Evening Shift')
      );
      expect(eveningShiftButton!.classes()).not.toContain('border-primary');
    });
  });

  // =====================================================================
  // 3. CURRENCY INPUT
  // =====================================================================
  describe('Currency Input', () => {
    it('[Happy Path] Menampilkan prefix "Rp"', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('Rp');
    });

    it('[Happy Path] Input memiliki placeholder "0"', () => {
      const wrapper = mountShiftSetup();

      const input = wrapper.find('input[inputmode="numeric"]');
      expect(input.attributes('placeholder')).toBe('0');
    });

    it('[Happy Path] Input memiliki type text', () => {
      const wrapper = mountShiftSetup();

      const input = wrapper.find('input[inputmode="numeric"]');
      expect(input.attributes('type')).toBe('text');
    });

    it('[Happy Path] Memasukkan angka di input memanggil clearErrors', async () => {
      const wrapper = mountShiftSetup();

      const input = wrapper.find('input[inputmode="numeric"]');
      await input.setValue('500000');

      expect(mockShiftStore.clearErrors).toHaveBeenCalled();
    });
  });

  // =====================================================================
  // 4. NOTES INPUT
  // =====================================================================
  describe('Notes Input', () => {
    it('[Happy Path] Textarea memiliki placeholder yang benar', () => {
      const wrapper = mountShiftSetup();

      const textarea = wrapper.find('textarea');
      expect(textarea.attributes('placeholder')).toBe('Any specific instructions or notes?');
    });

    it('[Happy Path] Textarea memiliki 2 rows', () => {
      const wrapper = mountShiftSetup();

      const textarea = wrapper.find('textarea');
      expect(textarea.attributes('rows')).toBe('2');
    });

    it('[Happy Path] Mengetik di textarea mengubah form.notes', async () => {
      const form = createMockForm();
      const wrapper = mountShiftSetup(form);

      const textarea = wrapper.find('textarea');
      await textarea.setValue('Test notes');

      expect(form.notes).toBe('Test notes');
    });
  });

  // =====================================================================
  // 5. VALIDATION ERRORS
  // =====================================================================
  describe('Validation Errors', () => {
    it('[Happy Path] Menampilkan error shift_id jika ada', () => {
      mockShiftStore.validationErrors = {
        shift_id: ['Shift is required.'],
      };
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('Shift is required.');
    });

    it('[Happy Path] Menampilkan error opening_balance jika ada', () => {
      mockShiftStore.validationErrors = {
        opening_balance: ['Opening balance is required.'],
      };
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('Opening balance is required.');
    });

    it('[Negative Path] Tidak menampilkan error jika tidak ada validationErrors', () => {
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).not.toContain('is required');
    });
  });

  // =====================================================================
  // 6. HANDLE NEXT
  // =====================================================================
  describe('Handle Next', () => {
    it('[Happy Path] Emit "next" jika shift_id dipilih', async () => {
      const form = createMockForm();
      form.shift_id = 1;
      const wrapper = mountShiftSetup(form);

      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue')
      );
      await continueButton!.trigger('click');

      expect(wrapper.emitted('next')).toBeTruthy();
    });

    it('[Happy Path] Memanggil clearErrors sebelum validasi', async () => {
      const form = createMockForm();
      form.shift_id = 1;
      const wrapper = mountShiftSetup(form);

      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue')
      );
      await continueButton!.trigger('click');

      expect(mockShiftStore.clearErrors).toHaveBeenCalled();
    });

    it('[Negative Path] Tidak emit "next" jika shift_id kosong', async () => {
      const wrapper = mountShiftSetup();

      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue')
      );
      await continueButton!.trigger('click');

      expect(wrapper.emitted('next')).toBeFalsy();
    });

    it('[Negative Path] Menampilkan error message jika shift_id kosong', async () => {
      const wrapper = mountShiftSetup();

      const continueButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Continue')
      );
      await continueButton!.trigger('click');

      expect(mockShiftStore.errorMessage).toBe('Please select a shift schedule.');
    });
  });

  // =====================================================================
  // 7. EDGE CASES & CORNER CASES
  // =====================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Shift dengan end_time "00:00:00" ditampilkan dengan benar', () => {
      const wrapper = mountShiftSetup();

      // Evening shift memiliki end_time 00:00:00, harus tampil 00:00
      expect(wrapper.text()).toContain('16:00 — 00:00');
    });

    it('[Edge Case] Shift dengan nama panjang', () => {
      mockShiftStore.masterShifts = [
        {
          id: 1,
          name: 'Very Long Shift Name That Should Still Display',
          start_time: '08:00:00',
          end_time: '16:00:00',
          is_active: true,
        },
      ];
      const wrapper = mountShiftSetup();

      expect(wrapper.text()).toContain('Very Long Shift Name That Should Still Display');
    });

    it('[Corner Case] form dengan opening_balance 0', () => {
      const form = createMockForm();
      form.opening_balance = 0;
      const wrapper = mountShiftSetup(form);

      const input = wrapper.find('input[inputmode="numeric"]');
      // Gunakan attributes untuk mendapatkan value
      expect(input.attributes('value')).toBeUndefined();
      // Atau gunakan element.value dengan type assertion
      expect((input.element as HTMLInputElement).value).toBe('');
    });

    it('[Corner Case] form dengan opening_balance besar', () => {
      const form = createMockForm();
      form.opening_balance = 1000000;
      const wrapper = mountShiftSetup(form);

      const input = wrapper.find('input[inputmode="numeric"]');
      // Gunakan type assertion untuk HTMLInputElement
      expect((input.element as HTMLInputElement).value).toBe('1.000.000');
    });
  });
});