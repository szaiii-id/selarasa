import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import ShiftManagementPage from '../ShiftManagementPage.vue';
import { useShiftStore } from '@/stores/shiftStore';

import MasterShiftTable from '@/components/shift/MasterShiftTable.vue';
import CashierShiftTable from '@/components/shift/CashierShiftTable.vue';
import MasterShiftFormModal from '@/components/shift/MasterShiftFormModal.vue';
import ForceCloseModal from '@/components/shift/ForceCloseModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import SuccessModal from '@/components/common/SuccessModal.vue';

const mockPush = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
      replace: vi.fn(),
    }),
    useRoute: () => ({
      query: {},
    }),
  };
});

describe('ShiftManagementPage.vue (System/Integration UI Behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountPage = (initialState = {}) => {
    return mount(ShiftManagementPage, {
      global: {
        plugins: [createTestingPinia({ 
          initialState,
          stubActions: false 
        })],
        stubs: {
          BackofficeLayout: { template: '<div><slot /></div>' },
          MasterShiftFormModal: true,
          ForceCloseModal: true,
          ConfirmModal: true,
          SuccessModal: true,
          Transition: true,
          Teleport: true
        }
      },
    });
  };

  // =========================================================================
  // 1. DATA INTEGRITY & STATE TRANSITION (Wiring & Interaksi Antar Komponen)
  // =========================================================================
  describe('State Transition & Component Wiring', () => {
    it('memanggil fetchMasterShifts dari shiftStore saat komponen pertama kali dirender (onMounted)', () => {
      mountPage();
      const shiftStore = useShiftStore();
      
      expect(shiftStore.fetchMasterShifts).toHaveBeenCalledTimes(1);
    });

    it('menampilkan tab Master Shifts secara default', () => {
      const wrapper = mountPage();
      
      expect(wrapper.text()).toContain('Master Shifts');
      expect(wrapper.findComponent(MasterShiftTable).exists()).toBe(true);
      expect(wrapper.findComponent(CashierShiftTable).exists()).toBe(false);
    });

    it('berpindah ke tab Cashier Shifts dan memanggil fetchCashierShifts saat tab diklik', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Klik tab Cashier Shifts
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledTimes(1);
      expect(wrapper.findComponent(CashierShiftTable).exists()).toBe(true);
      expect(wrapper.findComponent(MasterShiftTable).exists()).toBe(false);
    });

    it('berpindah kembali ke tab Master Shifts dan memanggil fetchMasterShifts', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      // Pindah kembali ke Master
      const masterTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Master Shifts'));
      await masterTabButton!.trigger('click');
      
      expect(shiftStore.fetchMasterShifts).toHaveBeenCalledTimes(2);
      expect(wrapper.findComponent(MasterShiftTable).exists()).toBe(true);
    });

    it('membuka FormModal mode Create saat tombol "Add New Shift" diklik', async () => {
      const wrapper = mountPage();
      
      const addButton = wrapper.findAll('button').find(btn => btn.text().includes('Add New Shift'));
      await addButton!.trigger('click');
      
      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(true);
      expect(formModal.props('shiftToEdit')).toBeNull();
    });

    it('menghubungkan event @edit dari MasterShiftTable ke FormModal mode Edit', async () => {
      const wrapper = mountPage({
        shift: { masterShifts: [{ id: 1, name: 'Morning Shift' }] }
      });
      
      await wrapper.findComponent(MasterShiftTable).vm.$emit('edit', { id: 1, name: 'Morning Shift' });
      
      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(true);
      expect(formModal.props('shiftToEdit')).toEqual({ id: 1, name: 'Morning Shift' });
    });

    it('menghubungkan event @delete dari MasterShiftTable ke ConfirmModal dengan tema danger', async () => {
    const wrapper = mountPage({
        shift: { masterShifts: [{ id: 1, name: 'Morning Shift' }] }
    });
    
    await wrapper.findComponent(MasterShiftTable).vm.$emit('delete', { id: 1, name: 'Morning Shift' });
    
    const confirmModal = wrapper.findComponent(ConfirmModal);
    expect(confirmModal.props('isOpen')).toBe(true);
    expect(confirmModal.props('theme')).toBe('danger');
    expect(confirmModal.props('message')).toContain('PERMANENTLY delete');
    expect(confirmModal.props('message')).toContain('Morning Shift');
    });

    it('menghubungkan event @force-close dari CashierShiftTable ke ForceCloseModal', async () => {
      const wrapper = mountPage();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      const mockShift = {
        id: 1,
        user_id: 'uuid-1',
        shift_id: 1,
        opening_balance: 500000,
        status: 'open',
        user: { id: 'uuid-1', name: 'John Doe', username: 'johndoe' }
      };
      
      await wrapper.findComponent(CashierShiftTable).vm.$emit('force-close', mockShift);
      
      const forceCloseModal = wrapper.findComponent(ForceCloseModal);
      expect(forceCloseModal.props('isOpen')).toBe(true);
      expect(forceCloseModal.props('shift')).toEqual(mockShift);
    });

    it('memanggil action createMasterShift di store dan menampilkan SuccessModal saat form disubmit', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      vi.mocked(shiftStore.createMasterShift).mockResolvedValueOnce(true);

      const payload = { name: 'Night Shift', start_time: '00:00', end_time: '08:00' };
      
      await wrapper.findComponent(MasterShiftFormModal).vm.$emit('submit', payload);
      await flushPromises();

      expect(shiftStore.createMasterShift).toHaveBeenCalledWith(payload);

      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('title')).toBe('Shift Created');
    });

    it('memanggil action updateMasterShift saat form disubmit dengan shiftToEdit', async () => {
      const wrapper = mountPage({
        shift: { masterShifts: [{ id: 1, name: 'Morning Shift' }] }
      });
      const shiftStore = useShiftStore();
      
      // Buka mode edit
      await wrapper.findComponent(MasterShiftTable).vm.$emit('edit', { id: 1, name: 'Morning Shift' });
      
      vi.mocked(shiftStore.updateMasterShift).mockResolvedValueOnce(true);
      
      const payload = { name: 'Morning Shift Updated', start_time: '08:00', end_time: '16:00' };
      
      await wrapper.findComponent(MasterShiftFormModal).vm.$emit('submit', payload);
      await flushPromises();

      expect(shiftStore.updateMasterShift).toHaveBeenCalledWith(1, payload);
    });

    it('memanggil action deleteMasterShift dan menampilkan SuccessModal saat konfirmasi delete', async () => {
      const wrapper = mountPage({
        shift: { masterShifts: [{ id: 1, name: 'Morning Shift' }] }
      });
      const shiftStore = useShiftStore();
      
      // Buka confirm modal
      await wrapper.findComponent(MasterShiftTable).vm.$emit('delete', { id: 1, name: 'Morning Shift' });
      
      vi.mocked(shiftStore.deleteMasterShift).mockResolvedValueOnce(true);
      
      await wrapper.findComponent(ConfirmModal).vm.$emit('confirm');
      await flushPromises();

      expect(shiftStore.deleteMasterShift).toHaveBeenCalledWith(1);
      
      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('title')).toBe('Shift Deleted');
    });

    it('memanggil action forceCloseShift dan menampilkan SuccessModal saat force close disubmit', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      const mockShift = {
        id: 1,
        user_id: 'uuid-1',
        shift_id: 1,
        opening_balance: 500000,
        status: 'open',
        user: { id: 'uuid-1', name: 'John Doe', username: 'johndoe' }
      };
      
      // Buka force close modal
      await wrapper.findComponent(CashierShiftTable).vm.$emit('force-close', mockShift);
      
      vi.mocked(shiftStore.forceCloseShift).mockResolvedValueOnce(true);
      
      const payload = { expected_balance: 500000, notes: 'Emergency' };
      
      await wrapper.findComponent(ForceCloseModal).vm.$emit('submit', payload);
      await flushPromises();

      expect(shiftStore.forceCloseShift).toHaveBeenCalledWith(1, payload);
      
      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('title')).toBe('Shift Force Closed');
    });
  });

  // =========================================================================
  // 2. CONTRACT / SCHEMA RENDERING (Distribusi Props dari Store ke Child)
  // =========================================================================
  describe('Contract / Schema Rendering', () => {
    it('mendistribusikan state masterShifts ke MasterShiftTable', () => {
      const mockShifts = [
        { id: 1, name: 'Morning Shift', is_active: true },
        { id: 2, name: 'Evening Shift', is_active: false }
      ];
      
      const wrapper = mountPage({
        shift: { masterShifts: mockShifts }
      });

      const tableProps = wrapper.findComponent(MasterShiftTable).props();
      
      expect(tableProps.shifts).toEqual(mockShifts);
    });

    it('mendistribusikan isLoading dan errorMessage ke MasterShiftTable', () => {
      const wrapper = mountPage({
        shift: {
          isLoading: true,
          errorMessage: 'Failed to fetch master shifts.'
        }
      });

      const tableProps = wrapper.findComponent(MasterShiftTable).props();
      
      expect(tableProps.isLoading).toBe(true);
      expect(tableProps.errorMessage).toBe('Failed to fetch master shifts.');
    });

    it('mendistribusikan shiftHistory dan pagination ke CashierShiftTable', async () => {
      const mockShiftHistory = [
        { id: 1, user_id: 'uuid-1', shift_id: 1, status: 'open' }
      ];
      const mockPagination = { current_page: 1, last_page: 5, per_page: 15, total: 75 };
      
      const wrapper = mountPage({
        shift: {
          shiftHistory: mockShiftHistory,
          pagination: mockPagination
        }
      });

      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      const tableProps = wrapper.findComponent(CashierShiftTable).props();
      
      expect(tableProps.shifts).toEqual(mockShiftHistory);
      expect(tableProps.pagination).toEqual(mockPagination);
    });

    it('menampilkan total master shifts di header', () => {
      const wrapper = mountPage({
        shift: { masterShifts: [{ id: 1 }, { id: 2 }, { id: 3 }] }
      });
      
      expect(wrapper.text()).toContain('Total: 3 master shifts');
    });

    it('mendistribusikan validationErrors ke MasterShiftFormModal', () => {
      const mockErrors = { name: ['Name is required.'] };
      
      const wrapper = mountPage({
        shift: { validationErrors: mockErrors }
      });

      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('errors')).toEqual(mockErrors);
    });
  });

  // =========================================================================
  // 3. TAB NAVIGATION & UI STATE
  // =========================================================================
  describe('Tab Navigation & UI State', () => {
    it('tab Master Shifts memiliki class active (bg-primary)', () => {
      const wrapper = mountPage();
      
      const masterTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Master Shifts'));
      expect(masterTabButton!.classes()).toContain('bg-primary');
    });

    it('tab Cashier Shifts menjadi active setelah diklik', async () => {
      const wrapper = mountPage();
      
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      expect(cashierTabButton!.classes()).toContain('bg-primary');
    });

    it('hanya memanggil fetchMasterShifts sekali saat onMounted', () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      expect(shiftStore.fetchMasterShifts).toHaveBeenCalledTimes(1);
      expect(shiftStore.fetchCashierShifts).not.toHaveBeenCalled();
    });

    it('memanggil fetchCashierShifts saat pindah ke tab Cashier', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledTimes(1);
    });

    it('memanggil fetchCashierShifts dengan filters saat event filter-change', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      const filters = { status: 'open' };
      await wrapper.findComponent(CashierShiftTable).vm.$emit('filter-change', filters);
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledWith(filters);
    });

    it('memanggil fetchCashierShifts dengan page saat event page-change', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => btn.text().includes('Cashier Shifts'));
      await cashierTabButton!.trigger('click');
      
      await wrapper.findComponent(CashierShiftTable).vm.$emit('page-change', 3);
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledWith({ page: 3 });
    });

    it('memanggil loadMasterShifts saat event retry dari MasterShiftTable', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      await wrapper.findComponent(MasterShiftTable).vm.$emit('retry');
      
      expect(shiftStore.fetchMasterShifts).toHaveBeenCalledTimes(2);
    });
  });
});