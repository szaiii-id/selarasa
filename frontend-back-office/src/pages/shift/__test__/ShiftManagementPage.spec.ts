import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { ref } from 'vue';

import ShiftManagementPage from '../ShiftManagementPage.vue';
import { useShiftStore } from '@/stores/shiftStore';

import MasterShiftTable from '@/components/shift/MasterShiftTable.vue';
import CashierShiftTable from '@/components/shift/CashierShiftTable.vue';
import MasterShiftFormModal from '@/components/shift/MasterShiftFormModal.vue';
import ForceCloseModal from '@/components/shift/ForceCloseModal.vue';
import CashierShiftDetailModal from '@/components/shift/CashierShiftDetailModal.vue';
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

// Mock useModal composable dengan state yang proper
vi.mock('@/composables/useModal', () => {
  return {
    useModal: <T,>(initialValue: T | null = null) => {
      const data = ref<T | null>(initialValue);
      const isOpen = ref(false);
      
      const open = (value: T) => {
        data.value = value;
        isOpen.value = true;
      };
      
      const close = () => {
        data.value = initialValue;
        isOpen.value = false;
      };
      
      return {
        data,
        isOpen,
        open,
        close
      };
    }
  };
});

describe('ShiftManagementPage.vue (System/Integration UI Behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockShiftStore = () => ({
    masterShifts: [],
    shiftHistory: [],
    isLoading: false,
    errorMessage: null,
    validationErrors: {},
    pagination: {
      current_page: 1,
      last_page: 5,
      per_page: 15,
      total: 75
    },
    fetchMasterShifts: vi.fn(),
    fetchCashierShifts: vi.fn(),
    createMasterShift: vi.fn(),
    updateMasterShift: vi.fn(),
    deleteMasterShift: vi.fn(),
    forceCloseShift: vi.fn(),
  });

  const mountPage = (initialState = {}) => {
    const defaultState = {
      shift: createMockShiftStore()
    };

    return mount(ShiftManagementPage, {
      global: {
        plugins: [
          createTestingPinia({ 
            initialState: {
              ...defaultState,
              ...initialState
            },
            stubActions: false,
            createSpy: vi.fn
          })
        ],
        stubs: {
          BackofficeLayout: { template: '<div><slot /></div>' },
          MasterShiftTable: {
            name: 'MasterShiftTable',
            template: '<div class="master-shift-table"><slot /></div>',
            props: ['shifts', 'isLoading', 'errorMessage'],
            emits: ['edit', 'delete', 'retry']
          },
          CashierShiftTable: {
            name: 'CashierShiftTable',
            template: '<div class="cashier-shift-table"><slot /></div>',
            props: ['shifts', 'isLoading', 'errorMessage', 'pagination'],
            emits: ['view', 'force-close', 'retry', 'page-change', 'filter-change']
          },
          MasterShiftFormModal: {
            name: 'MasterShiftFormModal',
            template: '<div class="master-shift-form-modal"><slot /></div>',
            props: ['isOpen', 'isLoading', 'shiftToEdit', 'errors'],
            emits: ['close', 'submit']
          },
          ForceCloseModal: {
            name: 'ForceCloseModal',
            template: '<div class="force-close-modal"><slot /></div>',
            props: ['isOpen', 'isLoading', 'shift', 'errors'],
            emits: ['close', 'submit']
          },
          CashierShiftDetailModal: {
            name: 'CashierShiftDetailModal',
            template: '<div class="cashier-shift-detail-modal"><slot /></div>',
            props: ['isOpen', 'shift'],
            emits: ['close']
          },
          ConfirmModal: {
            name: 'ConfirmModal',
            template: '<div class="confirm-modal"><slot /></div>',
            props: ['isOpen', 'title', 'message', 'confirmText', 'theme', 'isLoading'],
            emits: ['close', 'confirm']
          },
          SuccessModal: {
            name: 'SuccessModal',
            template: '<div class="success-modal"><slot /></div>',
            props: ['isOpen', 'title', 'message'],
            emits: ['close']
          },
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
      const wrapper = mountPage();
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
      
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      expect(cashierTabButton).toBeTruthy();
      
      await cashierTabButton!.trigger('click');
      await flushPromises();
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledTimes(1);
      expect(wrapper.findComponent(CashierShiftTable).exists()).toBe(true);
      expect(wrapper.findComponent(MasterShiftTable).exists()).toBe(false);
    });

    it('berpindah kembali ke tab Master Shifts dan memanggil fetchMasterShifts', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      // Pindah kembali ke Master
      const masterTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Master Shifts')
      );
      await masterTabButton!.trigger('click');
      
      expect(shiftStore.fetchMasterShifts).toHaveBeenCalledTimes(2);
      expect(wrapper.findComponent(MasterShiftTable).exists()).toBe(true);
      expect(wrapper.findComponent(CashierShiftTable).exists()).toBe(false);
    });

    it('membuka FormModal mode Create saat tombol "Add New Shift" diklik', async () => {
      const wrapper = mountPage();
      
      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add New Shift')
      );
      expect(addButton).toBeTruthy();
      
      await addButton!.trigger('click');
      await flushPromises();
      
      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(true);
      expect(formModal.props('shiftToEdit')).toBeNull();
    });

    it('menghubungkan event @edit dari MasterShiftTable ke FormModal mode Edit', async () => {
      const wrapper = mountPage();
      
      const mockShift = { id: 1, name: 'Morning Shift' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('edit', mockShift);
      await flushPromises();
      
      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(true);
      expect(formModal.props('shiftToEdit')).toEqual(mockShift);
    });

    it('menghubungkan event @delete dari MasterShiftTable ke ConfirmModal dengan tema danger', async () => {
      const wrapper = mountPage();
      
      const mockShift = { id: 1, name: 'Morning Shift' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('delete', mockShift);
      await flushPromises();
      
      const confirmModal = wrapper.findComponent(ConfirmModal);
      expect(confirmModal.props('isOpen')).toBe(true);
      expect(confirmModal.props('theme')).toBe('danger');
      // Perbaiki assertion message
      expect(confirmModal.props('message')).toContain('PERMANENTLY delete');
      expect(confirmModal.props('message')).toContain('Morning Shift');
    });

    it('menghubungkan event @force-close dari CashierShiftTable ke ForceCloseModal', async () => {
      const wrapper = mountPage();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
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
      await flushPromises();
      
      const forceCloseModal = wrapper.findComponent(ForceCloseModal);
      expect(forceCloseModal.props('isOpen')).toBe(true);
      expect(forceCloseModal.props('shift')).toEqual(mockShift);
    });

    it('menghubungkan event @view dari CashierShiftTable ke CashierShiftDetailModal', async () => {
      const wrapper = mountPage();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      await flushPromises();
      
      const mockShift = {
        id: 1,
        user_id: 'uuid-1',
        shift_id: 1,
        opening_balance: 500000,
        status: 'open',
        user: { id: 'uuid-1', name: 'John Doe', username: 'johndoe' }
      };
      
      await wrapper.findComponent(CashierShiftTable).vm.$emit('view', mockShift);
      await flushPromises();
      
      const detailModal = wrapper.findComponent(CashierShiftDetailModal);
      expect(detailModal.exists()).toBe(true);
      expect(detailModal.props('isOpen')).toBe(true);
      expect(detailModal.props('shift')).toEqual(mockShift);
    });

    it('memanggil action createMasterShift di store dan menampilkan SuccessModal saat form disubmit', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      vi.mocked(shiftStore.createMasterShift).mockResolvedValueOnce(true);

      const payload = { name: 'Night Shift', start_time: '00:00', end_time: '08:00' };
      
      await wrapper.findComponent(MasterShiftFormModal).vm.$emit('submit', payload);
      await flushPromises();
      await flushPromises(); // Double flush untuk memastikan semua promise resolved

      expect(shiftStore.createMasterShift).toHaveBeenCalledWith(payload);

      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.exists()).toBe(true);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('title')).toBe('Shift Created');
    });

    it('memanggil action updateMasterShift saat form disubmit dengan shiftToEdit', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Buka mode edit
      const mockShift = { id: 1, name: 'Morning Shift' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('edit', mockShift);
      await flushPromises();
      
      vi.mocked(shiftStore.updateMasterShift).mockResolvedValueOnce(true);
      
      const payload = { name: 'Morning Shift Updated', start_time: '08:00', end_time: '16:00' };
      
      await wrapper.findComponent(MasterShiftFormModal).vm.$emit('submit', payload);
      await flushPromises();
      await flushPromises();

      expect(shiftStore.updateMasterShift).toHaveBeenCalledWith(1, payload);
      
      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.exists()).toBe(true);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('title')).toBe('Shift Updated');
    });

    it('memanggil action deleteMasterShift dan menampilkan SuccessModal saat konfirmasi delete', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Buka confirm modal
      const mockShift = { id: 1, name: 'Morning Shift' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('delete', mockShift);
      await flushPromises();
      
      vi.mocked(shiftStore.deleteMasterShift).mockResolvedValueOnce(true);
      
      await wrapper.findComponent(ConfirmModal).vm.$emit('confirm');
      await flushPromises();
      await flushPromises();

      expect(shiftStore.deleteMasterShift).toHaveBeenCalledWith(1);
      
      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.exists()).toBe(true);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('title')).toBe('Shift Deleted');
    });

    it('memanggil action forceCloseShift dan menampilkan SuccessModal saat force close disubmit', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      await flushPromises();
      
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
      await flushPromises();
      
      vi.mocked(shiftStore.forceCloseShift).mockResolvedValueOnce(true);
      
      const payload = { expected_balance: 500000, notes: 'Emergency' };
      
      await wrapper.findComponent(ForceCloseModal).vm.$emit('submit', payload);
      await flushPromises();
      await flushPromises();

      expect(shiftStore.forceCloseShift).toHaveBeenCalledWith(1, payload);
      
      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.exists()).toBe(true);
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
        shift: {
          masterShifts: mockShifts,
          fetchMasterShifts: vi.fn(),
          fetchCashierShifts: vi.fn(),
          createMasterShift: vi.fn(),
          updateMasterShift: vi.fn(),
          deleteMasterShift: vi.fn(),
          forceCloseShift: vi.fn(),
        }
      });

      const tableProps = wrapper.findComponent(MasterShiftTable).props();
      
      expect(tableProps.shifts).toEqual(mockShifts);
    });

    it('mendistribusikan isLoading dan errorMessage ke MasterShiftTable', () => {
      const wrapper = mountPage({
        shift: {
          isLoading: true,
          errorMessage: 'Failed to fetch master shifts.',
          fetchMasterShifts: vi.fn(),
          fetchCashierShifts: vi.fn(),
          createMasterShift: vi.fn(),
          updateMasterShift: vi.fn(),
          deleteMasterShift: vi.fn(),
          forceCloseShift: vi.fn(),
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
          pagination: mockPagination,
          fetchMasterShifts: vi.fn(),
          fetchCashierShifts: vi.fn(),
          createMasterShift: vi.fn(),
          updateMasterShift: vi.fn(),
          deleteMasterShift: vi.fn(),
          forceCloseShift: vi.fn(),
        }
      });

      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      const tableProps = wrapper.findComponent(CashierShiftTable).props();
      
      expect(tableProps.shifts).toEqual(mockShiftHistory);
      expect(tableProps.pagination).toEqual(mockPagination);
    });

    it('menampilkan total master shifts di header', () => {
      const wrapper = mountPage({
        shift: {
          masterShifts: [{ id: 1 }, { id: 2 }, { id: 3 }],
          fetchMasterShifts: vi.fn(),
          fetchCashierShifts: vi.fn(),
          createMasterShift: vi.fn(),
          updateMasterShift: vi.fn(),
          deleteMasterShift: vi.fn(),
          forceCloseShift: vi.fn(),
        }
      });
      
      expect(wrapper.text()).toContain('Total: 3 master shifts');
    });

    it('mendistribusikan validationErrors ke MasterShiftFormModal', () => {
      const mockErrors = { name: ['Name is required.'] };
      
      const wrapper = mountPage({
        shift: {
          validationErrors: mockErrors,
          fetchMasterShifts: vi.fn(),
          fetchCashierShifts: vi.fn(),
          createMasterShift: vi.fn(),
          updateMasterShift: vi.fn(),
          deleteMasterShift: vi.fn(),
          forceCloseShift: vi.fn(),
        }
      });

      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('errors')).toEqual(mockErrors);
    });
  });

  // =========================================================================
  // 3. TAB NAVIGATION & UI STATE
  // =========================================================================
  describe('Tab Navigation & UI State', () => {
    it('tab Master Shifts memiliki class active (bg-primary) secara default', () => {
      const wrapper = mountPage();
      
      const masterTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Master Shifts')
      );
      expect(masterTabButton?.classes()).toContain('bg-primary');
    });

    it('tab Cashier Shifts menjadi active setelah diklik', async () => {
      const wrapper = mountPage();
      
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      expect(cashierTabButton?.classes()).toContain('bg-primary');
    });

    it('tab Master Shifts kehilangan class active setelah pindah ke Cashier', async () => {
      const wrapper = mountPage();
      
      const masterTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Master Shifts')
      );
      
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      expect(masterTabButton?.classes()).not.toContain('bg-primary');
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
      
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledTimes(1);
    });

    it('memanggil fetchCashierShifts dengan filters saat event filter-change', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      const filters = { status: 'open' };
      await wrapper.findComponent(CashierShiftTable).vm.$emit('filter-change', filters);
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledWith(filters);
    });

    it('memanggil fetchCashierShifts dengan page saat event page-change', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
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

    it('memanggil loadCashierShifts saat event retry dari CashierShiftTable', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      
      await wrapper.findComponent(CashierShiftTable).vm.$emit('retry');
      
      expect(shiftStore.fetchCashierShifts).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 4. MODAL STATE MANAGEMENT
  // =========================================================================
  describe('Modal State Management', () => {
    it('menutup FormModal saat event close diterima', async () => {
      const wrapper = mountPage();
      
      // Buka form modal
      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add New Shift')
      );
      await addButton!.trigger('click');
      await flushPromises();
      
      // Verifikasi modal terbuka
      let formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(true);
      
      // Tutup form modal
      await formModal.vm.$emit('close');
      await flushPromises();
      
      // Verifikasi modal tertutup
      formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(false);
    });

    it('menutup ConfirmModal saat event close diterima', async () => {
      const wrapper = mountPage();
      
      // Buka confirm modal
      const mockShift = { id: 1, name: 'Morning Shift' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('delete', mockShift);
      await flushPromises();
      
      // Verifikasi modal terbuka
      let confirmModal = wrapper.findComponent(ConfirmModal);
      expect(confirmModal.props('isOpen')).toBe(true);
      
      // Tutup confirm modal
      await confirmModal.vm.$emit('close');
      await flushPromises();
      
      // Verifikasi modal tertutup
      confirmModal = wrapper.findComponent(ConfirmModal);
      expect(confirmModal.props('isOpen')).toBe(false);
    });

    it('menutup ForceCloseModal saat event close diterima', async () => {
      const wrapper = mountPage();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      await flushPromises();
      
      // Buka force close modal
      const mockShift = {
        id: 1,
        user_id: 'uuid-1',
        shift_id: 1,
        status: 'open',
        user: { id: 'uuid-1', name: 'John Doe', username: 'johndoe' }
      };
      await wrapper.findComponent(CashierShiftTable).vm.$emit('force-close', mockShift);
      await flushPromises();
      
      // Verifikasi modal terbuka
      let forceCloseModal = wrapper.findComponent(ForceCloseModal);
      expect(forceCloseModal.props('isOpen')).toBe(true);
      
      // Tutup force close modal
      await forceCloseModal.vm.$emit('close');
      await flushPromises();
      
      // Verifikasi modal tertutup
      forceCloseModal = wrapper.findComponent(ForceCloseModal);
      expect(forceCloseModal.props('isOpen')).toBe(false);
    });

    it('menutup SuccessModal saat event close diterima', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Trigger success
      vi.mocked(shiftStore.createMasterShift).mockResolvedValueOnce(true);
      const payload = { name: 'Night Shift', start_time: '00:00', end_time: '08:00' };
      await wrapper.findComponent(MasterShiftFormModal).vm.$emit('submit', payload);
      await flushPromises();
      await flushPromises();
      
      // Verifikasi modal terbuka
      let successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(true);
      
      // Tutup success modal
      await successModal.vm.$emit('close');
      await flushPromises();
      
      // Verifikasi modal tertutup
      successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(false);
    });

    it('tidak menutup FormModal saat submit gagal', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Buka form modal
      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add New Shift')
      );
      await addButton!.trigger('click');
      await flushPromises();
      
      vi.mocked(shiftStore.createMasterShift).mockResolvedValueOnce(false);
      
      const payload = { name: 'Night Shift', start_time: '00:00', end_time: '08:00' };
      await wrapper.findComponent(MasterShiftFormModal).vm.$emit('submit', payload);
      await flushPromises();
      
      const formModal = wrapper.findComponent(MasterShiftFormModal);
      expect(formModal.props('isOpen')).toBe(true);
    });
  });

  // =========================================================================
  // 5. EDGE CASES & BOUNDARY CONDITIONS
  // =========================================================================
  describe('Edge Cases & Boundary Conditions', () => {
    it('menangani delete dengan shift name kosong', async () => {
      const wrapper = mountPage();
      
      const mockShift = { id: 2, name: '' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('delete', mockShift);
      await flushPromises();
      
      const confirmModal = wrapper.findComponent(ConfirmModal);
      expect(confirmModal.props('message')).toContain('this shift');
    });

    it('menangani force close dengan user null', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Pindah ke tab Cashier
      const cashierTabButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Cashier Shifts')
      );
      await cashierTabButton!.trigger('click');
      await flushPromises();
      
      const mockShift = {
        id: 1,
        user_id: 'uuid-1',
        shift_id: 1,
        status: 'open',
        user: null
      };
      
      await wrapper.findComponent(CashierShiftTable).vm.$emit('force-close', mockShift);
      await flushPromises();
      
      vi.mocked(shiftStore.forceCloseShift).mockResolvedValueOnce(true);
      
      const payload = { expected_balance: 500000, notes: 'Emergency' };
      await wrapper.findComponent(ForceCloseModal).vm.$emit('submit', payload);
      await flushPromises();
      await flushPromises();
      
      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('message')).toContain('cashier');
    });

    it('mereset validationErrors saat membuka form create', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Set validation errors
      shiftStore.validationErrors = { name: ['Error'] };
      
      // Buka form create
      const addButton = wrapper.findAll('button').find(btn => 
        btn.text().includes('Add New Shift')
      );
      await addButton!.trigger('click');
      
      expect(shiftStore.validationErrors).toEqual({});
    });

    it('mereset validationErrors dan errorMessage saat membuka form edit', async () => {
      const wrapper = mountPage();
      const shiftStore = useShiftStore();
      
      // Set validation errors dan error message
      shiftStore.validationErrors = { name: ['Error'] };
      shiftStore.errorMessage = 'Previous error';
      
      // Buka form edit
      const mockShift = { id: 1, name: 'Morning Shift' };
      await wrapper.findComponent(MasterShiftTable).vm.$emit('edit', mockShift);
      
      expect(shiftStore.validationErrors).toEqual({});
      expect(shiftStore.errorMessage).toBeNull();
    });
  });
});