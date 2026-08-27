import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MasterShiftTable from '../MasterShiftTable.vue';
import type { MasterShift } from '@/types/shift';

const mockShifts: MasterShift[] = [
  {
    id: 1,
    name: 'Morning Shift',
    start_time: '08:00:00',
    end_time: '16:00:00',
    is_active: true,
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-01T00:00:00+00:00'
  },
  {
    id: 2,
    name: 'Evening Shift',
    start_time: '16:00:00',
    end_time: '00:00:00',
    is_active: false,
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-01T00:00:00+00:00'
  }
];

const createWrapper = (props = {}) => {
  return mount(MasterShiftTable, {
    props: {
      shifts: [],
      isLoading: false,
      errorMessage: null,
      ...props
    }
  });
};

describe('MasterShiftTable Component', () => {
  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan data shifts dengan benar', () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      expect(wrapper.text()).toContain('Morning Shift');
      expect(wrapper.text()).toContain('Evening Shift');
      expect(wrapper.text()).toContain('08:00');
      expect(wrapper.text()).toContain('16:00');
    });

    it('[Happy Path] Emit "edit" dengan data shift saat tombol Edit diklik', async () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      const editButton = wrapper.findAll('button').find(btn => btn.text().includes('Edit'));
      if (!editButton) throw new Error('Tombol Edit tidak ditemukan');
      await editButton.trigger('click');
      
      const emitted = wrapper.emitted('edit');
      expect(emitted).toBeTruthy();
      if (emitted) {
        expect(emitted[0][0]).toEqual(mockShifts[0]);
      }
    });

    it('[Happy Path] Emit "delete" dengan data shift saat tombol Delete diklik', async () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      const deleteButton = wrapper.findAll('button').find(btn => btn.text().includes('Delete'));
      if (!deleteButton) throw new Error('Tombol Delete tidak ditemukan');
      await deleteButton.trigger('click');
      
      const emitted = wrapper.emitted('delete');
      expect(emitted).toBeTruthy();
      if (emitted) {
        expect(emitted[0][0]).toEqual(mockShifts[0]);
      }
    });

    it('[Negative Path] Menampilkan error message saat errorMessage ada', () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Failed to fetch master shifts.' 
      });
      
      expect(wrapper.text()).toContain('Failed to fetch master shifts.');
      expect(wrapper.text()).toContain('Try Again');
    });

    it('[Negative Path] Emit "retry" saat tombol Try Again diklik', async () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Failed to fetch master shifts.' 
      });
      
      const retryButton = wrapper.findAll('button').find(btn => btn.text().includes('Try Again'));
      if (!retryButton) throw new Error('Tombol Try Again tidak ditemukan');
      await retryButton.trigger('click');
      
      expect(wrapper.emitted('retry')).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Data Aktif] Menampilkan badge "Active" untuk shift aktif', () => {
      const wrapper = createWrapper({ shifts: [mockShifts[0]] });
      
      expect(wrapper.text()).toContain('Active');
      expect(wrapper.text()).not.toContain('Inactive');
    });

    it('[Partisi 2 - Data Nonaktif] Menampilkan badge "Inactive" untuk shift nonaktif', () => {
      const wrapper = createWrapper({ shifts: [mockShifts[1]] });
      
      expect(wrapper.text()).toContain('Inactive');
      expect(wrapper.text()).not.toContain('Active');
    });

    it('[Partisi 3 - Data Kosong] Menampilkan empty state saat tidak ada data', () => {
      const wrapper = createWrapper({ shifts: [] });
      
      expect(wrapper.text()).toContain('No Shifts Found');
      expect(wrapper.text()).toContain('There are no master shifts configured yet.');
    });

    it('[Partisi 4 - Loading State] Menampilkan loading spinner saat isLoading=true', () => {
      const wrapper = createWrapper({ shifts: [], isLoading: true });
      
      expect(wrapper.text()).toContain('Loading shifts data...');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('[Partisi 5 - Data dengan Loading] Tetap menampilkan data saat isLoading=true tapi ada data', () => {
      const wrapper = createWrapper({ shifts: mockShifts, isLoading: true });
      
      expect(wrapper.text()).toContain('Morning Shift');
      expect(wrapper.text()).not.toContain('Loading shifts data...');
    });

    it('[Partisi 6 - Format Waktu] Menampilkan waktu format HH:mm dari HH:mm:ss', () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      expect(wrapper.text()).toContain('08:00');
      expect(wrapper.text()).not.toContain('08:00:00');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] 0 data = empty state', () => {
      const wrapper = createWrapper({ shifts: [] });
      
      expect(wrapper.text()).toContain('No Shifts Found');
    });

    it('[BVA - Batas Bawah] 1 data = tampil 1 row', () => {
      const wrapper = createWrapper({ shifts: [mockShifts[0]] });
      
      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('[BVA - Batas Atas] 100 data = tampil 100 row', () => {
      const manyShifts = Array.from({ length: 100 }, (_, i) => ({
        ...mockShifts[0],
        id: i + 1,
        name: `Shift ${i + 1}`
      }));
      
      const wrapper = createWrapper({ shifts: manyShifts });
      
      const rows = wrapper.findAll('tbody tr');
      expect(rows.length).toBe(100);
    });

    it('[BVA - Waktu 00:00] formatTime untuk start_time 00:00:00', () => {
      const midnightShift = { ...mockShifts[0], start_time: '00:00:00' };
      const wrapper = createWrapper({ shifts: [midnightShift] });
      
      expect(wrapper.text()).toContain('00:00');
    });

    it('[BVA - Waktu 23:59] formatTime untuk end_time 23:59:59', () => {
      const lateShift = { ...mockShifts[0], end_time: '23:59:59' };
      const wrapper = createWrapper({ shifts: [lateShift] });
      
      expect(wrapper.text()).toContain('23:59');
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Shift nonaktif memiliki class opacity-60', () => {
      const wrapper = createWrapper({ shifts: [mockShifts[1]] });
      
      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('opacity-60');
    });

    it('[Edge Case] Shift aktif tidak memiliki class opacity-60', () => {
      const wrapper = createWrapper({ shifts: [mockShifts[0]] });
      
      const row = wrapper.find('tbody tr');
      expect(row.classes()).not.toContain('opacity-60');
    });

    it('[Corner Case] Emit "edit" dengan shift yang benar untuk row kedua', async () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      const editButtons = wrapper.findAll('button').filter(btn => btn.text().includes('Edit'));
      if (editButtons.length < 2) throw new Error('Tombol Edit baris kedua tidak ditemukan');
      await editButtons[1].trigger('click');
      
      const emitted = wrapper.emitted('edit');
      expect(emitted).toBeTruthy();
      if (emitted) {
        expect(emitted[0][0]).toEqual(mockShifts[1]);
      }
    });

    it('[Corner Case] Emit "delete" dengan shift yang benar untuk row kedua', async () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      const deleteButtons = wrapper.findAll('button').filter(btn => btn.text().includes('Delete'));
      if (deleteButtons.length < 2) throw new Error('Tombol Delete baris kedua tidak ditemukan');
      await deleteButtons[1].trigger('click');
      
      const emitted = wrapper.emitted('delete');
      expect(emitted).toBeTruthy();
      if (emitted) {
        expect(emitted[0][0]).toEqual(mockShifts[1]);
      }
    });

    it('[Edge Case] Table header memiliki 5 kolom', () => {
      const wrapper = createWrapper({ shifts: mockShifts });
      
      const headers = wrapper.findAll('thead th');
      expect(headers.length).toBe(5);
    });

    it('[Edge Case] Colspan yang benar untuk loading state', () => {
      const wrapper = createWrapper({ shifts: [], isLoading: true });
      
      const td = wrapper.find('tbody td');
      expect(td.attributes('colspan')).toBe('5');
    });

    it('[Edge Case] Colspan yang benar untuk error state', () => {
      const wrapper = createWrapper({ shifts: [], errorMessage: 'Error message' });
      
      const td = wrapper.find('tbody td');
      expect(td.attributes('colspan')).toBe('5');
    });

    it('[Edge Case] Colspan yang benar untuk empty state', () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const td = wrapper.find('tbody td');
      expect(td.attributes('colspan')).toBe('5');
    });

    it('[Corner Case] Error state lebih prioritas daripada empty state', () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Error message' 
      });
      
      expect(wrapper.text()).toContain('Error message');
      expect(wrapper.text()).not.toContain('No Shifts Found');
    });

    it('[Corner Case] Loading state lebih prioritas daripada empty state', () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        isLoading: true 
      });
      
      expect(wrapper.text()).toContain('Loading shifts data...');
      expect(wrapper.text()).not.toContain('No Shifts Found');
    });
  });
});