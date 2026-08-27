import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ForceCloseModal from '../ForceCloseModal.vue';
import type { CashierShift } from '@/types/shift';

const mockOpenShift: CashierShift = {
  id: 1,
  user_id: 'uuid-1',
  shift_id: 1,
  opening_balance: 500000,
  closing_balance: null,
  expected_balance: 1250000,
  variance: null,
  status: 'open',
  notes: null,
  started_at: '2024-01-15T08:00:00+00:00',
  ended_at: null,
  user: {
    id: 'uuid-1',
    name: 'John Doe',
    username: 'johndoe'
  },
  shift: {
    id: 1,
    name: 'Morning Shift',
    start_time: '08:00:00',
    end_time: '16:00:00',
    is_active: true,
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-01T00:00:00+00:00'
  }
};

const createWrapper = (props = {}) => {
  return mount(ForceCloseModal, {
    props: {
      isOpen: false,
      isLoading: false,
      shift: null,
      errors: {},
      ...props
    }
  });
};

describe('ForceCloseModal Component', () => {
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

    it('[Happy Path] Menampilkan info shift saat shift ada', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Morning Shift');
      expect(wrapper.text()).toContain('Opening Balance:');
    });

    it('[Happy Path] Emit "submit" dengan payload yang benar saat form diisi', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: mockOpenShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      // Isi form
      await wrapper.find('input[type="number"]').setValue(1250000);
      await wrapper.findAll('input[type="number"]')[1].setValue(1200000);
      await wrapper.find('textarea').setValue('Cashier left without closing');
      
      const submitButton = wrapper.findAll('button').find(btn => btn.text().includes('Force Close Shift'));
      await submitButton!.trigger('click');
      
      const emitted = wrapper.emitted('submit');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({
        expected_balance: 1250000,
        closing_balance: 1200000,
        notes: 'Cashier left without closing'
      });
    });

    it('[Negative Path] Emit "close" saat tombol close di header diklik', async () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      const closeButton = wrapper.findAll('button')[0];
      await closeButton.trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Negative Path] Emit "close" saat tombol Cancel diklik', async () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Cancel'));
      await cancelButton!.trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Form Reset] Form diisi dengan expected_balance dari shift', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: mockOpenShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const numberInputs = wrapper.findAll('input[type="number"]');
      expect((numberInputs[0].element as HTMLInputElement).value).toBe('1250000');
      expect((numberInputs[1].element as HTMLInputElement).value).toBe('1250000');
    });

    it('[Partisi 2 - Form Kosong] Form di-reset ke 0 saat shift tidak ada', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: null });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      
      const numberInputs = wrapper.findAll('input[type="number"]');
      expect((numberInputs[0].element as HTMLInputElement).value).toBe('0');
    });

    it('[Partisi 3 - Notes Kosong] Notes di-reset ke string kosong saat modal dibuka', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: mockOpenShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const textarea = wrapper.find('textarea');
      expect((textarea.element as HTMLTextAreaElement).value).toBe('');
    });

    it('[Partisi 4 - Error Display] Menampilkan error untuk expected_balance', () => {
      const wrapper = createWrapper({
        isOpen: true,
        shift: mockOpenShift,
        errors: { expected_balance: ['Expected balance is required.'] }
      });
      
      expect(wrapper.text()).toContain('Expected balance is required.');
    });

    it('[Partisi 5 - Error Display] Menampilkan error untuk notes', () => {
      const wrapper = createWrapper({
        isOpen: true,
        shift: mockOpenShift,
        errors: { notes: ['Please provide a reason.'] }
      });
      
      expect(wrapper.text()).toContain('Please provide a reason.');
    });

    it('[Partisi 6 - Warning Message] Menampilkan warning irreversible', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      expect(wrapper.text()).toContain('irreversible');
      expect(wrapper.text()).toContain('FORCE CLOSED BY MANAGER');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] expected_balance 0 saat shift null', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: null });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      
      const numberInputs = wrapper.findAll('input[type="number"]');
      expect((numberInputs[0].element as HTMLInputElement).value).toBe('0');
    });

    it('[BVA - Batas Atas] expected_balance dari shift.expected_balance', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: mockOpenShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const numberInputs = wrapper.findAll('input[type="number"]');
      expect((numberInputs[0].element as HTMLInputElement).value).toBe('1250000');
    });

    it('[BVA - Loading State] Semua input dan textarea disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift, isLoading: true });
      
      const inputs = wrapper.findAll('input');
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined();
      });
      
      const textarea = wrapper.find('textarea');
      expect(textarea.attributes('disabled')).toBeDefined();
    });


    it('[BVA - Button Disabled] Submit button disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift, isLoading: true });
      
      const submitButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Processing...') || btn.text().includes('Force Close Shift')
      );
      expect(submitButton!.attributes('disabled')).toBeDefined();
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Shift dengan user null menampilkan "Unknown"', () => {
      const shiftWithoutUser = { ...mockOpenShift, user: undefined };
      const wrapper = createWrapper({ isOpen: true, shift: shiftWithoutUser });
      
      expect(wrapper.text()).toContain('Unknown');
    });

    it('[Edge Case] Shift dengan shift null menampilkan "-"', () => {
      const shiftWithoutMasterShift = { ...mockOpenShift, shift: undefined };
      const wrapper = createWrapper({ isOpen: true, shift: shiftWithoutMasterShift });
      
      expect(wrapper.text()).toContain('-');
    });

    it('[Corner Case] Watcher reset form saat modal dibuka ulang', async () => {
      const wrapper = createWrapper({ isOpen: false, shift: mockOpenShift });
      
      // Buka pertama
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      // Ubah form
      await wrapper.find('textarea').setValue('Changed notes');
      
      // Tutup
      await wrapper.setProps({ isOpen: false });
      await wrapper.vm.$nextTick();
      
      // Buka lagi
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const textarea = wrapper.find('textarea');
      expect((textarea.element as HTMLTextAreaElement).value).toBe('');
    });

    it('[Edge Case] Cancel button disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift, isLoading: true });
      
      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Cancel'));
      expect(cancelButton!.attributes('disabled')).toBeDefined();
    });

    it('[Edge Case] Close button di header disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift, isLoading: true });
      
      const headerCloseButton = wrapper.findAll('button')[0];
      expect(headerCloseButton.attributes('disabled')).toBeDefined();
    });

    it('[Edge Case] Mousedown pada backdrop emit "close"', async () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      await wrapper.find('.fixed').trigger('mousedown.self');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Edge Case] Textarea memiliki placeholder yang benar', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      const textarea = wrapper.find('textarea');
      expect(textarea.attributes('placeholder')).toContain('Device crash');
    });

    it('[Edge Case] Header memiliki background error/5', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      const header = wrapper.find('.bg-error\\/5');
      expect(header.exists()).toBe(true);
    });

    it('[Corner Case] Form menampilkan 2 input number', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      const numberInputs = wrapper.findAll('input[type="number"]');
      expect(numberInputs.length).toBe(2);
    });

    it('[Edge Case] Closing balance optional - label menampilkan "(optional)"', () => {
      const wrapper = createWrapper({ isOpen: true, shift: mockOpenShift });
      
      expect(wrapper.text()).toContain('(optional)');
    });
  });
});