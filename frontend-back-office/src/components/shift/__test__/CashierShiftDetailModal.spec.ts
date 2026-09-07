import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import CashierShiftDetailModal from '../CashierShiftDetailModal.vue';
import type { CashierShift, ShiftHandover } from '@/types/shift';

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

// =========================================================================
// MOCK DATA
// =========================================================================

// User type dengan username (sesuai dengan CashierShift type)
const mockUser1 = {
  id: 'uuid-1',
  name: 'John Doe',
  username: 'johndoe'
};

const mockUser2 = {
  id: 'uuid-2',
  name: 'Jane Smith',
  username: 'janesmith'
};

const mockUser3 = {
  id: 'uuid-3',
  name: 'Bob Wilson',
  username: 'bobwilson'
};

const mockAdmin = {
  id: 'uuid-admin',
  name: 'Super Admin',
  username: 'admin'
};

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
  user: mockUser1,
  shift: {
    id: 1,
    name: 'Morning Shift',
    start_time: '08:00:00',
    end_time: '16:00:00',
    is_active: true,
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-01T00:00:00+00:00'
  },
  handovers: []
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
  notes: 'Shift closed normally',
  started_at: '2024-01-14T16:00:00+00:00',
  ended_at: '2024-01-15T00:00:00+00:00',
  user: mockUser2,
  shift: {
    id: 2,
    name: 'Evening Shift',
    start_time: '16:00:00',
    end_time: '00:00:00',
    is_active: true,
    created_at: '2024-01-01T00:00:00+00:00',
    updated_at: '2024-01-01T00:00:00+00:00'
  },
  handovers: []
};

const mockForceClosedShift: CashierShift = {
  ...mockClosedShift,
  id: 3,
  variance: -50000,
  closed_by_user: mockAdmin,
  notes: 'Force closed due to emergency',
  handovers: []
};

// Type ShiftHandover dengan from_user dan to_user yang hanya memiliki id dan name (tanpa username)
const mockHandover: ShiftHandover = {
  id: 1,
  amount_counted: 750000,
  notes: 'Handover to afternoon shift',
  created_at: '2024-01-15T12:00:00+00:00',
  from_user: {
    id: 'uuid-1',
    name: 'John Doe'
  },
  to_user: {
    id: 'uuid-3',
    name: 'Bob Wilson'
  }
};

const mockShiftWithHandovers: CashierShift = {
  ...mockOpenShift,
  id: 4,
  handovers: [mockHandover]
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

const createWrapper = (props = {}): VueWrapper => {
  return mount(CashierShiftDetailModal, {
    props: {
      isOpen: true,
      shift: mockOpenShift,
      ...props
    },
    global: {
      stubs: {
        Transition: false
      }
    }
  });
};

// =========================================================================
// TEST SUITE
// =========================================================================

describe('CashierShiftDetailModal Component', () => {
  // =========================================================================
  // 1. HAPPY & NEGATIVE PATH
  // =========================================================================
  describe('Happy & Negative Path', () => {
    it('[Happy Path] Menampilkan detail shift dengan benar', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.text()).toContain('Shift Session Details');
      expect(wrapper.text()).toContain('Morning Shift');
      expect(wrapper.text()).toContain('Ref: #1');
      expect(wrapper.text()).toContain('John Doe');
      expect(wrapper.text()).toContain('Rp 500.000');
    });

    it('[Happy Path] Emit "close" saat tombol X diklik', async () => {
      const wrapper = createWrapper();
      
      const closeButton = wrapper.findAll('button').find(btn => 
        btn.find('svg').exists() && !btn.text().includes('Close Detail')
      );
      expect(closeButton).toBeTruthy();
      
      await closeButton!.trigger('click');
      
      const emitted = wrapper.emitted('close');
      expect(emitted).toBeTruthy();
    });

    it('[Happy Path] Emit "close" saat tombol "Close Detail" diklik', async () => {
      const wrapper = createWrapper();
      
      const closeDetailButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Close Detail')
      );
      expect(closeDetailButton).toBeTruthy();
      
      await closeDetailButton!.trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Happy Path] Emit "close" saat backdrop diklik', async () => {
      const wrapper = createWrapper();
      
      const backdrop = wrapper.find('.fixed.inset-0');
      expect(backdrop.exists()).toBe(true);
      
      await backdrop.trigger('mousedown');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('[Negative Path] Tidak menampilkan apa-apa saat isOpen=false', () => {
      const wrapper = createWrapper({ isOpen: false });
      
      expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
      expect(wrapper.text()).not.toContain('Shift Session Details');
    });

    it('[Negative Path] Menampilkan header tapi tidak detail saat shift=null', () => {
      const wrapper = createWrapper({ shift: null });
      
      expect(wrapper.text()).toContain('Shift Session Details');
      expect(wrapper.text()).not.toContain('John Doe');
      expect(wrapper.text()).not.toContain('Morning Shift');
    });
  });

  // =========================================================================
  // 2. EQUIVALENCE PARTITIONING
  // =========================================================================
  describe('Equivalence Partitioning', () => {
    it('[Partisi 1 - Shift Open] Menampilkan status "Session is still active"', () => {
      const wrapper = createWrapper({ shift: mockOpenShift });
      
      expect(wrapper.text()).toContain('Session is still active');
      expect(wrapper.text()).toContain('Shift Opened');
      expect(wrapper.text()).not.toContain('Shift Closed');
    });

    it('[Partisi 2 - Shift Closed Normal] Menampilkan status "Shift Closed" dengan user yang menutup', () => {
      const wrapper = createWrapper({ shift: mockClosedShift });
      
      expect(wrapper.text()).toContain('Shift Closed');
      expect(wrapper.text()).toContain('Jane Smith');
      expect(wrapper.text()).toContain('Shift closed normally');
    });

    it('[Partisi 3 - Shift Force Closed] Menampilkan "Shift Closed" dengan admin yang menutup', () => {
      const wrapper = createWrapper({ shift: mockForceClosedShift });
      
      expect(wrapper.text()).toContain('Shift Closed');
      expect(wrapper.text()).toContain('Super Admin');
      expect(wrapper.text()).toContain('Force closed due to emergency');
    });

    it('[Partisi 4 - Variance Minus] Menampilkan variance negatif dengan warna error', () => {
      const wrapper = createWrapper({ shift: mockForceClosedShift });
      
      expect(wrapper.text()).toContain('Variance');
      expect(wrapper.text()).toContain('Rp -50.000');
      
      const varianceCard = wrapper.findAll('.p-4.bg-surface').find(card => 
        card.text().includes('Variance')
      );
      expect(varianceCard?.classes()).toContain('border-error');
    });

    it('[Partisi 5 - Variance Plus] Menampilkan variance positif dengan warna success', () => {
      const shiftWithPositiveVariance: CashierShift = {
        ...mockClosedShift,
        variance: 50000
      };
      const wrapper = createWrapper({ shift: shiftWithPositiveVariance });
      
      expect(wrapper.text()).toContain('Rp 50.000');
      
      const varianceCard = wrapper.findAll('.p-4.bg-surface').find(card => 
        card.text().includes('Variance')
      );
      expect(varianceCard?.classes()).toContain('border-success');
    });

    it('[Partisi 6 - Variance Zero] Menampilkan variance 0 dengan warna default', () => {
      const wrapper = createWrapper({ shift: mockClosedShift });
      
      expect(wrapper.text()).toContain('Rp 0');
      
      const varianceCard = wrapper.findAll('.p-4.bg-surface').find(card => 
        card.text().includes('Variance')
      );
      expect(varianceCard?.classes()).toContain('border-custom-border');
    });
  });

  // =========================================================================
  // 3. HANDOVER TESTS
  // =========================================================================
  describe('Handover Tests', () => {
    it('[Happy Path] Menampilkan handover details dengan benar', () => {
      const wrapper = createWrapper({ shift: mockShiftWithHandovers });
      
      expect(wrapper.text()).toContain('Handover');
      expect(wrapper.text()).toContain('Dari: John Doe');
      expect(wrapper.text()).toContain('Ke: Bob Wilson');
      expect(wrapper.text()).toContain('Rp 750.000');
      expect(wrapper.text()).toContain('Handover to afternoon shift');
    });

    it('[Edge Case] Menampilkan "Unknown" untuk user yang tidak ada di handover', () => {
      const handoverWithNullUsers: ShiftHandover = {
        id: 1,
        amount_counted: 750000,
        notes: null,
        created_at: '2024-01-15T12:00:00+00:00',
        from_user: null,
        to_user: null
      };
      
      const shiftWithIncompleteHandover: CashierShift = {
        ...mockOpenShift,
        handovers: [handoverWithNullUsers]
      };
      const wrapper = createWrapper({ shift: shiftWithIncompleteHandover });
      
      expect(wrapper.text()).toContain('Dari: Unknown');
      expect(wrapper.text()).toContain('Ke: Unknown');
      expect(wrapper.text()).toContain('Rp 750.000');
    });

    it('[Edge Case] Tidak menampilkan notes jika handover tidak memiliki notes', () => {
      const handoverWithoutNotes: ShiftHandover = {
        ...mockHandover,
        notes: null
      };
      
      const shiftWithoutHandoverNotes: CashierShift = {
        ...mockOpenShift,
        handovers: [handoverWithoutNotes]
      };
      const wrapper = createWrapper({ shift: shiftWithoutHandoverNotes });
      
      expect(wrapper.text()).toContain('Handover');
      expect(wrapper.text()).not.toContain('"');
    });

    it('[Corner Case] Menampilkan original cashier dari handover pertama', () => {
      const wrapper = createWrapper({ shift: mockShiftWithHandovers });
      
      // Harus menampilkan "from_user" dari handover pertama sebagai original cashier
      expect(wrapper.text()).toContain('John Doe');
    });
  });

  // =========================================================================
  // 4. BOUNDARY VALUE ANALYSIS (BVA)
  // =========================================================================
  describe('Boundary Value Analysis (BVA)', () => {
    it('[BVA - Closing Balance null] Menampilkan "-" untuk closing balance null', () => {
      const wrapper = createWrapper({ shift: mockOpenShift });
      
      const closingCard = wrapper.findAll('.p-4.bg-surface').find(card => 
        card.text().includes('Closing')
      );
      expect(closingCard?.text()).toContain('-');
    });

    it('[BVA - Expected Balance null] Menampilkan "-" untuk expected balance null', () => {
      const wrapper = createWrapper({ shift: mockOpenShift });
      
      const expectedCard = wrapper.findAll('.p-4.bg-surface').find(card => 
        card.text().includes('Expected')
      );
      expect(expectedCard?.text()).toContain('-');
    });

    it('[BVA - Variance null] Menampilkan "-" untuk variance null', () => {
      const wrapper = createWrapper({ shift: mockOpenShift });
      
      const varianceCard = wrapper.findAll('.p-4.bg-surface').find(card => 
        card.text().includes('Variance')
      );
      expect(varianceCard?.text()).toContain('-');
    });

    it('[BVA - Opening Balance 0] Menampilkan "Rp 0" untuk opening balance 0', () => {
      const shiftWithZeroBalance: CashierShift = {
        ...mockOpenShift,
        opening_balance: 0
      };
      const wrapper = createWrapper({ shift: shiftWithZeroBalance });
      
      expect(wrapper.text()).toContain('Rp 0');
    });
  });

  // =========================================================================
  // 5. EDGE CASES & CORNER CASES
  // =========================================================================
  describe('Edge Cases & Corner Cases', () => {
    it('[Edge Case] Menampilkan "Custom Shift" saat shift.name null', () => {
      const shiftWithoutName: CashierShift = {
        ...mockOpenShift,
        shift: {
          ...mockOpenShift.shift!,
          name: null as any // Force null untuk test
        }
      };
      const wrapper = createWrapper({ shift: shiftWithoutName });
      
      expect(wrapper.text()).toContain('Custom Shift');
    });

    it('[Edge Case] Menampilkan "Unknown" saat user null', () => {
      const shiftWithoutUser: CashierShift = {
        ...mockOpenShift,
        user: undefined
      };
      const wrapper = createWrapper({ shift: shiftWithoutUser });
      
      expect(wrapper.text()).toContain('Unknown');
    });

    it('[Corner Case] Menampilkan format tanggal untuk started_at', () => {
      const wrapper = createWrapper();
      
      // Format tanggal Indonesia (dd/mm/yyyy)
      expect(wrapper.text()).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('[Edge Case] Tidak menampilkan closing notes saat tidak ada notes', () => {
      const shiftWithoutNotes: CashierShift = {
        ...mockClosedShift,
        notes: null
      };
      const wrapper = createWrapper({ shift: shiftWithoutNotes });
      
      expect(wrapper.text()).not.toContain('Closing Note:');
    });

    it('[Edge Case] Menampilkan closing notes saat ada notes', () => {
      const wrapper = createWrapper({ shift: mockForceClosedShift });
      
      expect(wrapper.text()).toContain('Closing Note:');
      expect(wrapper.text()).toContain('Force closed due to emergency');
    });

    it('[Corner Case] Menampilkan "Current Time" untuk shift yang masih open', () => {
      const wrapper = createWrapper({ shift: mockOpenShift });
      
      expect(wrapper.text()).toContain('Current Time');
      expect(wrapper.text()).toContain('Session is still active');
    });

    it('[Edge Case] Menampilkan waktu ended_at untuk shift closed', () => {
      const wrapper = createWrapper({ shift: mockClosedShift });
      
      expect(wrapper.text()).toContain('Shift Closed');
      expect(wrapper.text()).not.toContain('Current Time');
    });

    it('[Edge Case] Format currency untuk angka besar', () => {
      const shiftWithLargeBalance: CashierShift = {
        ...mockClosedShift,
        opening_balance: 1000000000
      };
      const wrapper = createWrapper({ shift: shiftWithLargeBalance });
      
      expect(wrapper.text()).toContain('Rp 1.000.000.000');
    });
  });

  // =========================================================================
  // 6. UI STYLING TESTS
  // =========================================================================
  describe('UI Styling Tests', () => {
    it('[UI] Memiliki class untuk backdrop', () => {
      const wrapper = createWrapper();
      
      const backdrop = wrapper.find('.fixed.inset-0');
      expect(backdrop.exists()).toBe(true);
      expect(backdrop.classes()).toContain('bg-background/80');
      expect(backdrop.classes()).toContain('backdrop-blur-sm');
    });

    it('[UI] Memiliki class untuk card utama', () => {
      const wrapper = createWrapper();
      
      const mainCard = wrapper.find('.bg-surface.w-full');
      expect(mainCard.exists()).toBe(true);
      expect(mainCard.classes()).toContain('max-w-2xl');
      expect(mainCard.classes()).toContain('rounded-[2rem]');
    });

    it('[UI] Menampilkan 4 kartu informasi (Opening, Expected, Closing, Variance)', () => {
      const wrapper = createWrapper();
      
      const infoCards = wrapper.findAll('.p-4.bg-surface');
      expect(infoCards.length).toBeGreaterThanOrEqual(4);
    });

    it('[UI] Menampilkan audit trail dengan timeline', () => {
      const wrapper = createWrapper();
      
      expect(wrapper.text()).toContain('Audit Trail');
      expect(wrapper.find('.border-l-2').exists()).toBe(true);
    });

    it('[UI] Menampilkan dot indikator untuk setiap event', () => {
      const wrapper = createWrapper();
      
      const dots = wrapper.findAll('.rounded-full');
      expect(dots.length).toBeGreaterThan(0);
    });
  });
});