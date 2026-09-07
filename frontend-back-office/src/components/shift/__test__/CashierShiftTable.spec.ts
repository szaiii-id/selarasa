import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import CashierShiftTable from '../CashierShiftTable.vue';
import type { CashierShift } from '@/types/shift';

// =========================================================================
// MOCK COMPOSABLES
// =========================================================================

vi.mock('@/composables/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDateTime: (date: string) => {
      if (!date) return '-';
      return new Date(date).toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  })
}));

vi.mock('@/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: () => ({
    formatCurrency: (amount: number | null) => {
      if (amount === null || amount === undefined) return '-';
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
  })
}));

vi.mock('@/composables/useUserInitials', () => ({
  useUserInitials: () => ({
    getInitials: (name: string) => {
      if (!name || name === 'Unknown') return '?';
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
  })
}));

// =========================================================================
// MOCK DATA
// =========================================================================

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

// =========================================================================
// TYPE DEFINITIONS & HELPER FUNCTIONS
// =========================================================================

type EmittedEventMap = {
  'view': CashierShift;
  'force-close': CashierShift;
  'retry': void;
  'page-change': number;
  'filter-change': Record<string, any>;
};

/**
 * Helper function untuk mengambil emitted event dengan aman
 * Menggunakan type assertion untuk menghindari error TypeScript
 */
function getEmittedEvent<T extends keyof EmittedEventMap>(
  wrapper: VueWrapper,
  eventName: T
): EmittedEventMap[T] | undefined {
  const emitted = wrapper.emitted(eventName) as unknown[][] | undefined;
  
  if (emitted && emitted.length > 0) {
    return emitted[0]![0] as EmittedEventMap[T];
  }
  
  return undefined;
}

/**
 * Helper function untuk expect emitted event
 * Akan throw error jika event tidak di-emit
 */
function expectEmittedEvent<T extends keyof EmittedEventMap>(
  wrapper: VueWrapper,
  eventName: T
): EmittedEventMap[T] {
  const event = getEmittedEvent(wrapper, eventName);
  
  if (event === undefined) {
    throw new Error(`Event "${eventName}" was not emitted`);
  }
  
  return event;
}

/**
 * Helper function untuk membuat wrapper dengan props default
 */
const createWrapper = (props = {}): VueWrapper => {
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

/**
 * Helper function untuk mencari button berdasarkan text
 * Mengembalikan undefined jika tidak ditemukan
 */
function findButtonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find(btn => btn.text().includes(text));
}

// =========================================================================
// TEST SUITE
// =========================================================================

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
      expect(wrapper.text()).toContain('Rp 500.000');
      expect(wrapper.text()).toContain('Rp 1.250.000');
    });

    it('[Happy Path] Emit "view" dengan shift data saat tombol View diklik', async () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      const viewButton = findButtonByText(wrapper, 'View');
      expect(viewButton).toBeTruthy();
      
      await viewButton!.trigger('click');
      
      // Menggunakan helper function yang aman
      const emittedShift = expectEmittedEvent(wrapper, 'view');
      expect(emittedShift).toEqual(mockOpenShift);
    });

    it('[Happy Path] Emit "force-close" dengan shift data saat tombol Force Close diklik', async () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      const forceCloseButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Close') && !btn.text().includes('View')
      );
      expect(forceCloseButton).toBeTruthy();
      
      await forceCloseButton!.trigger('click');
      
      // Menggunakan optional chaining dengan fallback
      const emitted = wrapper.emitted('force-close');
      expect(emitted?.[0]?.[0]).toEqual(mockOpenShift);
    });

    it('[Happy Path] Emit "page-change" dengan page number saat tombol Next diklik', async () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      const nextButton = findButtonByText(wrapper, 'Next');
      expect(nextButton).toBeTruthy();
      
      await nextButton!.trigger('click');
      
      // Menggunakan type assertion dengan non-null
      const emittedPage = (wrapper.emitted('page-change') as unknown[][])![0]![0];
      expect(emittedPage).toBe(2);
    });

    it('[Happy Path] Emit "page-change" dengan page number saat tombol Prev diklik', async () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 2 }
      });
      
      const prevButton = findButtonByText(wrapper, 'Prev');
      expect(prevButton).toBeTruthy();
      
      await prevButton!.trigger('click');
      
      // Menggunakan helper function
      const emittedPage = expectEmittedEvent(wrapper, 'page-change');
      expect(emittedPage).toBe(1);
    });

    it('[Happy Path] Emit "filter-change" dengan filter status saat dropdown berubah', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const select = wrapper.get('select');
      await select.setValue('open');
      
      // Menggunakan helper function dengan type assertion
      const emittedFilter = expectEmittedEvent(wrapper, 'filter-change');
      expect(emittedFilter).toEqual({ status: 'open' });
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
      
      const retryButton = findButtonByText(wrapper, 'Try Again');
      expect(retryButton).toBeTruthy();
      
      await retryButton!.trigger('click');
      
      // Menggunakan truthy assertion
      expect(wrapper.emitted('retry')).toBeTruthy();
    });

    it('[Negative Path] Tidak emit "force-close" untuk shift closed', async () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      const forceCloseButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Close') && !btn.text().includes('View')
      );
      expect(forceCloseButton).toBeFalsy();
    });

    it('[Negative Path] Tidak menampilkan data saat shifts kosong', () => {
      const wrapper = createWrapper({ shifts: [] });
      
      expect(wrapper.text()).toContain('No Shifts Found');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Shift Open] Menampilkan badge "Open" dan tombol Force Close', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      expect(wrapper.text()).toContain('Open');
      expect(wrapper.text()).toContain('Close');
      expect(wrapper.find('.bg-warning\\/15').exists()).toBe(true);
    });

    it('[Partisi 2 - Shift Closed] Menampilkan badge "Closed" dan tidak ada tombol Force Close', () => {
      const wrapper = createWrapper({ shifts: [mockClosedShift] });
      
      expect(wrapper.text()).toContain('Closed');
      const forceCloseButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Close') && !btn.text().includes('View')
      );
      expect(forceCloseButton).toBeFalsy();
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

    it('[Partisi 5 - Error State] Menampilkan error message', () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Network error' 
      });
      
      expect(wrapper.text()).toContain('Network error');
      expect(wrapper.find('.text-error').exists()).toBe(true);
    });

    it('[Partisi 6 - Filter Today] Emit filter dengan date hari ini', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const todayButton = findButtonByText(wrapper, 'Today');
      expect(todayButton).toBeTruthy();
      
      await todayButton!.trigger('click');
      
      const emittedFilter = expectEmittedEvent(wrapper, 'filter-change');
      expect(emittedFilter).toHaveProperty('date');
    });

    it('[Partisi 7 - Filter 7 Days] Emit filter kosong untuk 7 days', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const sevenDaysButton = findButtonByText(wrapper, '7 Days');
      expect(sevenDaysButton).toBeTruthy();
      
      await sevenDaysButton!.trigger('click');
      
      const emittedFilter = expectEmittedEvent(wrapper, 'filter-change');
      expect(emittedFilter).toEqual({});
    });

    it('[Partisi 8 - Filter 30 Days] Emit filter dengan date_from', async () => {
      const wrapper = createWrapper({ shifts: [] });
      
      const thirtyDaysButton = findButtonByText(wrapper, '30 Days');
      expect(thirtyDaysButton).toBeTruthy();
      
      await thirtyDaysButton!.trigger('click');
      
      const emittedFilter = expectEmittedEvent(wrapper, 'filter-change');
      expect(emittedFilter).toHaveProperty('date_from');
    });
  });

  // =========================================================================
  // 3. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Batas Bawah] current_page=1, tombol Prev disabled', () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 1 }
      });
      
      const prevButton = findButtonByText(wrapper, 'Prev');
      expect(prevButton?.attributes('disabled')).toBeDefined();
    });

    it('[BVA - Batas Atas] current_page=last_page, tombol Next disabled', () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 5, last_page: 5 }
      });
      
      const nextButton = findButtonByText(wrapper, 'Next');
      expect(nextButton?.attributes('disabled')).toBeDefined();
    });

    it('[BVA - Page 0] Tidak emit page-change saat current_page=1 dan klik Prev', async () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 1 }
      });
      
      const prevButton = findButtonByText(wrapper, 'Prev');
      await prevButton?.trigger('click');
      
      expect(wrapper.emitted('page-change')).toBeFalsy();
    });

    it('[BVA - Page > last_page] Tidak emit page-change saat current_page=last_page dan klik Next', async () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 5, last_page: 5 }
      });
      
      const nextButton = findButtonByText(wrapper, 'Next');
      await nextButton?.trigger('click');
      
      expect(wrapper.emitted('page-change')).toBeFalsy();
    });

    it('[BVA - Closing Balance null] Menampilkan "-" untuk closing balance null', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      const allCells = wrapper.findAll('td');
      const hasDash = allCells.some(td => td.text().trim() === '-');
      expect(hasDash).toBe(true);
    });

    it('[BVA - Closing Balance 0] Menampilkan "Rp 0" untuk closing balance 0', () => {
      const shiftWithZeroBalance = { 
        ...mockClosedShift, 
        closing_balance: 0 
      };
      const wrapper = createWrapper({ shifts: [shiftWithZeroBalance] });
      
      expect(wrapper.text()).toContain('Rp 0');
    });

    it('[BVA - Pagination last_page=1] Hanya 1 halaman, kedua tombol disabled', () => {
      const wrapper = createWrapper({ 
        shifts: [mockClosedShift],
        pagination: { ...mockPagination, current_page: 1, last_page: 1 }
      });
      
      const prevButton = findButtonByText(wrapper, 'Prev');
      const nextButton = findButtonByText(wrapper, 'Next');
      
      expect(prevButton?.attributes('disabled')).toBeDefined();
      expect(nextButton?.attributes('disabled')).toBeDefined();
    });

    it('[BVA - Total Records 0] Menampilkan "0 total records"', () => {
      const wrapper = createWrapper({ 
        shifts: [],
        pagination: { ...mockPagination, total: 0, last_page: 0, current_page: 0 }
      });
      
      expect(wrapper.text()).toContain('0 total records');
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
      const shiftWithoutUser = { 
        ...mockOpenShift, 
        user: undefined 
      } as CashierShift;
      const wrapper = createWrapper({ shifts: [shiftWithoutUser] });
      
      expect(wrapper.text()).toContain('Unknown');
    });

    it('[Corner Case] Shift null menampilkan "-"', () => {
      const shiftWithoutMasterShift = { 
        ...mockOpenShift, 
        shift: undefined 
      } as CashierShift;
      const wrapper = createWrapper({ shifts: [shiftWithoutMasterShift] });
      
      expect(wrapper.text()).toContain('-');
    });

    it('[Edge Case] Table header memiliki 7 kolom', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      const headers = wrapper.findAll('thead th');
      expect(headers.length).toBe(7);
    });

    it('[Edge Case] Colspan 7 untuk loading state', () => {
      const wrapper = createWrapper({ shifts: [], isLoading: true });
      
      const td = wrapper.find('tbody td');
      expect(td.attributes('colspan')).toBe('7');
    });

    it('[Edge Case] Colspan 7 untuk error state', () => {
      const wrapper = createWrapper({ 
        shifts: [], 
        errorMessage: 'Error occurred' 
      });
      
      const td = wrapper.find('tbody td');
      expect(td.attributes('colspan')).toBe('7');
    });

    it('[Edge Case] Colspan 7 untuk empty state', () => {
      const wrapper = createWrapper({ shifts: [] });
      
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

    it('[Corner Case] Menampilkan badge "Force Closed by Manager" jika ada closed_by_user', () => {
      const mockForceClosedShift = {
        ...mockClosedShift,
        closed_by_user: {
          id: 'uuid-admin',
          name: 'Super Admin',
          username: 'admin'
        }
      };
      
      const wrapper = createWrapper({ shifts: [mockForceClosedShift] });
      
      expect(wrapper.text()).toContain('by Super Admin');
    });

    it('[Corner Case] Initials untuk user dengan 2 kata', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      // John Doe -> JD
      expect(wrapper.text()).toContain('JD');
    });

    it('[Corner Case] Initials untuk user dengan 1 kata', () => {
      const shiftWithSingleWordName = {
        ...mockOpenShift,
        user: {
          id: 'uuid-3',
          name: 'John',
          username: 'john'
        }
      };
      
      const wrapper = createWrapper({ shifts: [shiftWithSingleWordName] });
      
      // John -> J
      expect(wrapper.text()).toContain('J');
    });

    it('[Edge Case] Format currency untuk angka besar', () => {
      const shiftWithLargeBalance = {
        ...mockClosedShift,
        closing_balance: 1000000000
      };
      
      const wrapper = createWrapper({ shifts: [shiftWithLargeBalance] });
      
      // Rp 1.000.000.000
      expect(wrapper.text()).toContain('Rp 1.000.000.000');
    });

    it('[Corner Case] Shift dengan notes tidak mempengaruhi tampilan', () => {
      const shiftWithNotes = {
        ...mockClosedShift,
        notes: 'This is a test note'
      };
      
      const wrapper = createWrapper({ shifts: [shiftWithNotes] });
      
      // Notes tidak ditampilkan di tabel
      expect(wrapper.text()).not.toContain('This is a test note');
    });

    it('[Edge Case] Format tanggal untuk started_at', () => {
      const wrapper = createWrapper({ shifts: [mockOpenShift] });
      
      // Format tanggal Indonesia (dd/mm/yyyy)
      expect(wrapper.text()).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('[Corner Case] Shift dengan username mengandung karakter spesial', () => {
      const shiftWithSpecialUsername = {
        ...mockOpenShift,
        user: {
          id: 'uuid-4',
          name: 'Test User',
          username: 'test.user_123'
        }
      };
      
      const wrapper = createWrapper({ shifts: [shiftWithSpecialUsername] });
      
      expect(wrapper.text()).toContain('@test.user_123');
    });
  });
});