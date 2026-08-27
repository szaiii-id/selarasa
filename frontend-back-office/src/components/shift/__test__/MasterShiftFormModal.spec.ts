import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MasterShiftFormModal from '../MasterShiftFormModal.vue';
import type { MasterShift } from '@/types/shift';

const mockShift: MasterShift = {
  id: 1,
  name: 'Morning Shift',
  start_time: '08:00:00',
  end_time: '16:00:00',
  is_active: true,
  created_at: '2024-01-01T00:00:00+00:00',
  updated_at: '2024-01-01T00:00:00+00:00'
};

const createWrapper = (props = {}) => {
  return mount(MasterShiftFormModal, {
    props: {
      isOpen: false,
      isLoading: false,
      shiftToEdit: null,
      errors: {},
      ...props
    }
  });
};

describe('MasterShiftFormModal Component', () => {
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

    it('[Happy Path] Mode Create: Title "Create Master Shift" saat shiftToEdit=null', () => {
      const wrapper = createWrapper({ isOpen: true, shiftToEdit: null });
      
      expect(wrapper.text()).toContain('Create Master Shift');
      expect(wrapper.text()).not.toContain('Edit Master Shift');
    });

    it('[Happy Path] Mode Edit: Title "Edit Master Shift" saat shiftToEdit ada', () => {
      const wrapper = createWrapper({ isOpen: true, shiftToEdit: mockShift });
      
      expect(wrapper.text()).toContain('Edit Master Shift');
      expect(wrapper.text()).not.toContain('Create Master Shift');
    });

    it('[Happy Path] Emit "submit" dengan payload yang benar saat form disubmit (Create Mode)', async () => {
      const wrapper = createWrapper({ isOpen: true, shiftToEdit: null });
      
      await wrapper.vm.$nextTick();
      
      await wrapper.find('input[type="text"]').setValue('Night Shift');
      await wrapper.findAll('input[type="time"]')[0].setValue('00:00');
      await wrapper.findAll('input[type="time"]')[1].setValue('08:00');
      
      const saveButton = wrapper.findAll('button').find(btn => btn.text().includes('Save Shift'));
      await saveButton!.trigger('click');
      
      const emitted = wrapper.emitted('submit');
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toEqual({
        name: 'Night Shift',
        start_time: '00:00',
        end_time: '08:00',
        is_active: true
      });
    });

    it('[Happy Path] Emit "submit" dengan data yang benar saat Edit Mode', async () => {
        // Mulai dari isOpen=false, lalu buka modal
        const wrapper = createWrapper({ isOpen: false, shiftToEdit: mockShift });
        
        // Buka modal
        await wrapper.setProps({ isOpen: true });
        
        // Tunggu watcher mengisi form
        await wrapper.vm.$nextTick();
        await wrapper.vm.$nextTick();
        
        const saveButton = wrapper.findAll('button').find(btn => btn.text().includes('Save Shift'));
        await saveButton!.trigger('click');
        
        const emitted = wrapper.emitted('submit');
        expect(emitted).toBeTruthy();
        expect(emitted![0][0]).toEqual({
            name: 'Morning Shift',
            start_time: '08:00',
            end_time: '16:00',
            is_active: true
        });
    });

    it('[Negative Path] Emit "close" saat tombol close di header diklik', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      // Tombol close adalah button pertama (di header)
      const closeButton = wrapper.findAll('button')[0];
      await closeButton.trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Negative Path] Emit "close" saat tombol Cancel diklik', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      const cancelButton = wrapper.findAll('button').find(btn => btn.text().includes('Cancel'));
      await cancelButton!.trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Create Mode] Form di-reset ke default saat modal dibuka tanpa shiftToEdit', async () => {
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: null });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const nameInput = wrapper.find('input[type="text"]');
      const timeInputs = wrapper.findAll('input[type="time"]');
      
      expect((nameInput.element as HTMLInputElement).value).toBe('');
      expect((timeInputs[0].element as HTMLInputElement).value).toBe('08:00');
      expect((timeInputs[1].element as HTMLInputElement).value).toBe('16:00');
    });

    it('[Partisi 2 - Edit Mode] Form diisi dengan data shiftToEdit saat modal dibuka', async () => {
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: mockShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const nameInput = wrapper.find('input[type="text"]');
      const timeInputs = wrapper.findAll('input[type="time"]');
      
      expect((nameInput.element as HTMLInputElement).value).toBe('Morning Shift');
      expect((timeInputs[0].element as HTMLInputElement).value).toBe('08:00');
      expect((timeInputs[1].element as HTMLInputElement).value).toBe('16:00');
    });

    it('[Partisi 3 - Toggle Active] Checkbox is_active default true di Create Mode', async () => {
      const wrapper = createWrapper({ isOpen: true, shiftToEdit: null });
      
      await wrapper.vm.$nextTick();
      
      const checkbox = wrapper.find('input[type="checkbox"]');
      expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    });

    it('[Partisi 4 - Toggle Inactive] Checkbox is_active false saat edit shift nonaktif', async () => {
      const inactiveShift = { ...mockShift, is_active: false };
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: inactiveShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const checkbox = wrapper.find('input[type="checkbox"]');
      expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    });

    it('[Partisi 5 - Error Display] Menampilkan error message untuk field name', () => {
      const wrapper = createWrapper({
        isOpen: true,
        shiftToEdit: null,
        errors: { name: ['The name has already been taken.'] }
      });
      
      expect(wrapper.text()).toContain('The name has already been taken.');
    });

    it('[Partisi 6 - Error Display] Menampilkan error message untuk start_time', () => {
      const wrapper = createWrapper({
        isOpen: true,
        shiftToEdit: null,
        errors: { start_time: ['Start time is required.'] }
      });
      
      expect(wrapper.text()).toContain('Start time is required.');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] Form kosong saat Create Mode', async () => {
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: null });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('');
    });

    it('[BVA - Batas Atas] Form terisi penuh saat Edit Mode', async () => {
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: mockShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('Morning Shift');
    });

    it('[BVA - Waktu 00:00] formatTime substring untuk start_time 00:00:00', async () => {
      const midnightShift = { ...mockShift, start_time: '00:00:00' };
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: midnightShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const timeInputs = wrapper.findAll('input[type="time"]');
      expect((timeInputs[0].element as HTMLInputElement).value).toBe('00:00');
    });

    it('[BVA - Waktu 23:59] formatTime substring untuk end_time 23:59:59', async () => {
      const lateShift = { ...mockShift, end_time: '23:59:59' };
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: lateShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const timeInputs = wrapper.findAll('input[type="time"]');
      expect((timeInputs[1].element as HTMLInputElement).value).toBe('23:59');
    });

    it('[BVA - Loading State] Semua input disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });
      
      const inputs = wrapper.findAll('input');
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined();
      });
    });

    it('[BVA - Submit Button Text] Text berubah menjadi "Saving..." saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });
      
      expect(wrapper.text()).toContain('Saving...');
      expect(wrapper.text()).not.toContain('Save Shift');
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Errors object kosong tidak menampilkan error message', () => {
      const wrapper = createWrapper({ isOpen: true, errors: {} });
      
      expect(wrapper.findAll('.text-error.font-medium').length).toBe(0);
    });

    it('[Edge Case] Errors dengan multiple field menampilkan semua error', () => {
      const wrapper = createWrapper({
        isOpen: true,
        errors: {
          name: ['Name is required.'],
          start_time: ['Start time is required.'],
          end_time: ['End time is required.']
        }
      });
      
      expect(wrapper.text()).toContain('Name is required.');
      expect(wrapper.text()).toContain('Start time is required.');
      expect(wrapper.text()).toContain('End time is required.');
    });

    it('[Corner Case] Watcher reset form saat modal dibuka ulang', async () => {
      const wrapper = createWrapper({ isOpen: false, shiftToEdit: mockShift });
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      await wrapper.find('input[type="text"]').setValue('Changed Shift');
      
      await wrapper.setProps({ isOpen: false });
      await wrapper.vm.$nextTick();
      
      await wrapper.setProps({ isOpen: true });
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      
      const nameInput = wrapper.find('input[type="text"]');
      expect((nameInput.element as HTMLInputElement).value).toBe('Morning Shift');
    });

    it('[Corner Case] Cancel button disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });
      
      const buttons = wrapper.findAll('button');
      const cancelButton = buttons.find(btn => btn.text().includes('Cancel'));
      expect(cancelButton?.attributes('disabled')).toBeDefined();
    });

    it('[Edge Case] Close button di header disabled saat isLoading=true', () => {
      const wrapper = createWrapper({ isOpen: true, isLoading: true });
      
      const headerCloseButton = wrapper.findAll('button')[0];
      expect(headerCloseButton.attributes('disabled')).toBeDefined();
    });

    it('[Edge Case] Mousedown pada backdrop emit "close"', async () => {
      const wrapper = createWrapper({ isOpen: true });
      
      await wrapper.find('.fixed').trigger('mousedown.self');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Edge Case] Checkbox toggle mengubah nilai is_active', async () => {
      const wrapper = createWrapper({ isOpen: true, shiftToEdit: null });
      
      await wrapper.vm.$nextTick();
      
      const checkbox = wrapper.find('input[type="checkbox"]');
      await checkbox.setValue(false);
      
      const saveButton = wrapper.findAll('button').find(btn => btn.text().includes('Save Shift'));
      await saveButton!.trigger('click');
      
      const emitted = wrapper.emitted('submit');
      expect(emitted![0][0].is_active).toBe(false);
    });
  });
});