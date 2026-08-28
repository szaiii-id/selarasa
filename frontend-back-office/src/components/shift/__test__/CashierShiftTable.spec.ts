import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CashierShiftTable from '../CashierShiftTable.vue';
import type { CashierShift } from '@/types/shift';

const mockOpenShift: CashierShift = {
  id: 1,
  user_id: 'uuid-1',
  shift_id: 1,
  opening_balance: 500000,
  closing_balance: null,
  expected_balance: null,
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

const mockClosedShift: CashierShift = {
  id: 2,
  user_id: 'uuid-2',
  shift_id: 2,
  opening_balance: 500000,
  closing_balance: 1250000,
  expected_balance: 1250000,
  variance: 0,
  status: 'closed',
  notes: null,
  started_at: '2024-01-14T16:00:00+00:00',
  ended_at: '2024-01-15T00:00:00+00:00',
  user: {
    id: 'uuid-2',
    name: 'Jane Smith',
    username: 'janesmith'
  },
  shift: {
    id: 2,
    name: 'Evening Shift',
    start_time: '16:00:00',
    end_time: '00:00:00',
    is_active: true,
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-01T00:00:00+00:00'
  }
};

const mockPagination = {
  current_page: 1,
  last_page: 5,
  per_page: 15,
  total: 75
};

const createWrapper = (props = {}) => {
  return mount(CashierShiftTable, {
    props: {
      shifts: [],
      isLoading: false,
      errorMessage: null,
      pagination: mockPagination,
      ...props
    }
  });
};

describe('CashierShiftTable Component', () => {
  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan data shift open dan closed', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift, mockClosedShift] });
      
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Jane Smith');
      expect(wrapper.text()).toContain('Morning Shift');
      expect(wrapper.text()).toContain('Evening Shift');
    });

    it('[Happy Path] Emit "force-close" dengan shift data saat tombol Force Close diklik', async () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      const forceCloseButton = wrapper.findAll('button').find(btn => btn.text().includes('Force Close'));
      if (!forceCloseButton) throw new Error('Tombol Force Close tidak ditemukan');
      await forceCloseButton.trigger('click');
      
      const emitted = wrapper.emitted('force-close');
      expect(emitted).toBeTruthy();
      expect(emitted?.[0]?.[0]).toEqual(mockOpenShift);
    });

    it('[Happy Path] Emit "page-change" dengan page number saat tombol Next diklik', async () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      const nextButton = wrapper.findAll('button').find(btn => btn.text().includes('Next'));
      if (!nextButton) throw new Error('Tombol Next tidak ditemukan');
      await nextButton.trigger('click');
      
      const emitted = wrapper.emitted('page-change');
      expect(emitted).toBeTruthy();
      expect(emitted?.[0]?.[0]).toBe(2);
    });

    it('[Happy Path] Emit "filter-change" dengan filter status saat dropdown berubah', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const select = wrapper.get('select');
      await select.setValue('open');
      
      const emitted = wrapper.emitted('filter-change');
      expect(emitted).toBeTruthy();
      expect(emitted?.[0]?.[0]).toEqual({ status: 'open' });
    });

    it('[Negative Path] Menampilkan error message saat errorMessage ada', () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Failed to fetch cashier shifts.' 
      });
      
      expect(wrapper.text()).toContain('Failed to fetch cashier shifts.');
      expect(wrapper.text()).toContain('Try Again');
    });

    it('[Negative Path] Emit "retry" saat tombol Try Again diklik', async () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Failed to fetch cashier shifts.' 
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
    it('[Partisi 1 - Shift Open] Menampilkan badge "Open" dan tombol Force Close', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      expect(wrapper.text()).toContain('Open');
      expect(wrapper.text()).toContain('Force Close');
    });

    it('[Partisi 2 - Shift Closed] Menampilkan badge "Closed" dan tanda "-"', () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      expect(wrapper.text()).toContain('Closed');
      expect(wrapper.text()).not.toContain('Force Close');
    });

    it('[Partisi 3 - Data Kosong] Menampilkan empty state', () => {
      const wrapper = createWrapper({ shifts: [] });
      
      expect(wrapper.text()).toContain('No Shifts Found');
      expect(wrapper.text()).toContain('No cashier shifts recorded for this period.');
    });

    it('[Partisi 4 - Loading State] Menampilkan loading spinner', () => {
      const wrapper = createWrapper({ shifts: [], isLoading: true });
      
      expect(wrapper.text()).toContain('Loading cashier shifts...');
      expect(wrapper.find('.animate-spin').exists()).toBe(true);
    });

    it('[Partisi 5 - Filter Today] Emit filter dengan date hari ini', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const todayButton = wrapper.findAll('button').find(btn => btn.text().includes('Today'));
      if (!todayButton) throw new Error('Tombol Today tidak ditemukan');
      await todayButton.trigger('click');
      
      const emitted = wrapper.emitted('filter-change');
      expect(emitted).toBeTruthy();
      expect((emitted?.[0]?.[0] as any)?.date).toBeDefined();
    });

    it('[Partisi 6 - Filter 7 Days] Emit filter kosong untuk 7 days (backend default)', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const sevenDaysButton = wrapper.findAll('button').find(btn => btn.text().includes('7 Days'));
      if (!sevenDaysButton) throw new Error('Tombol 7 Days tidak ditemukan');
      await sevenDaysButton.trigger('click');
      
      const emitted = wrapper.emitted('filter-change');
      expect(emitted).toBeTruthy();
      expect(emitted?.[0]?.[0]).toEqual({});
    });

    it('[Partisi 7 - Filter 30 Days] Emit filter dengan date_from 30 hari lalu', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const thirtyDaysButton = wrapper.findAll('button').find(btn => btn.text().includes('30 Days'));
      if (!thirtyDaysButton) throw new Error('Tombol 30 Days tidak ditemukan');
      await thirtyDaysButton.trigger('click');
      
      const emitted = wrapper.emitted('filter-change');
      expect(emitted).toBeTruthy();
      expect((emitted?.[0]?.[0] as any)?.date_from).toBeDefined();
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] Pagination current_page=1, tombol Prev disabled', () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 1 }
      });
      
      const prevButton = wrapper.findAll('button').find(btn => btn.text().includes('Prev'));
      if (!prevButton) throw new Error('Tombol Prev tidak ditemukan');
      expect(prevButton.attributes('disabled')).toBeDefined();
    });

    it('[BVA - Batas Atas] Pagination current_page=last_page, tombol Next disabled', () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 5, last_page: 5 }
      });
      
      const nextButton = wrapper.findAll('button').find(btn => btn.text().includes('Next'));
      if (!nextButton) throw new Error('Tombol Next tidak ditemukan');
      expect(nextButton.attributes('disabled')).toBeDefined();
    });

    it('[BVA - Page 0] changePage(0) tidak emit karena < 1', async () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 1 }
      });
      
      const prevButton = wrapper.findAll('button').find(btn => btn.text().includes('Prev'));
      if (!prevButton) throw new Error('Tombol Prev tidak ditemukan');
      await prevButton.trigger('click');
      
      expect(wrapper.emitted('page-change')).toBeFalsy();
    });

    it('[BVA - Page > last_page] changePage(6) tidak emit karena > last_page', async () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 5, last_page: 5 }
      });
      
      const nextButton = wrapper.findAll('button').find(btn => btn.text().includes('Next'));
      if (!nextButton) throw new Error('Tombol Next tidak ditemukan');
      await nextButton.trigger('click');
      
      expect(wrapper.emitted('page-change')).toBeFalsy();
    });

    it('[BVA - Closing Balance null] Menampilkan "-" untuk closing balance null', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      expect(wrapper.text()).toContain('-');
    });

    it('[BVA - Closing Balance ada] Menampilkan format currency untuk closing balance', () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      expect(wrapper.text()).toContain('Rp');
    });
  });

  // =========================================================================
  // 4. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Shift open memiliki background warning/5', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      const row = wrapper.find('tbody tr');
      expect(row.classes()).toContain('bg-warning/5');
    });

    it('[Edge Case] Shift closed tidak memiliki background warning/5', () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      const row = wrapper.find('tbody tr');
      expect(row.classes()).not.toContain('bg-warning/5');
    });

    it('[Corner Case] User null menampilkan "Unknown"', () => {
      const shiftWithoutUser = { ...mockOpenShift, user: undefined };
      const wrapper = createWrapper({ shifts: [shiftWithoutUser] });
      
      expect(wrapper.text()).toContain('Unknown');
    });

    it('[Corner Case] Shift null menampilkan "-"', () => {
      const shiftWithoutMasterShift = { ...mockOpenShift, shift: undefined };
      const wrapper = createWrapper({ shifts: [shiftWithoutMasterShift] });
      
      expect(wrapper.text()).toContain('-');
    });

    it('[Edge Case] Table header memiliki 7 kolom', () => {
      const wrapper = createWrapper({ shifts: mockOpenShift ? [mockOpenShift] : [] });
      
      const headers = wrapper.findAll('thead th');
      expect(headers.length).toBe(7);
    });

    it('[Edge Case] Colspan 7 untuk loading state', () => {
      const wrapper = createWrapper({ shifts: [], isLoading: true });
      
      const td = wrapper.find('tbody td');
      expect(td.attributes('colspan')).toBe('7');
    });

    it('[Edge Case] Filter bar memiliki 3 quick date buttons', () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const filterButtons = wrapper.findAll('button').filter(btn => 
        ['Today', '7 Days', '30 Days'].some(label => btn.text().includes(label))
      );
      expect(filterButtons.length).toBe(3);
    });

    it('[Corner Case] Pagination info menampilkan total records', () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: mockPagination
      });
      
      expect(wrapper.text()).toContain('75 total records');
      expect(wrapper.text()).toContain('Showing page 1');
      expect(wrapper.text()).toContain('of 5');
    });
  });
});