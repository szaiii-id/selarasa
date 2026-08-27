import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import UserIndex from '../UserIndex.vue'; 
import { useUserStore } from '@/stores/userStore';
import { useAuthStore } from '@/stores/authStore';

// Import child components untuk referensi findComponent
import UserPageHeader from '@/components/user/UserPageHeader.vue';
import UserTable from '@/components/user/UserTable.vue';
import UserFormModal from '@/components/user/UserFormModal.vue';
import ConfirmModal from '@/components/common/ConfirmModal.vue';
import SuccessModal from '@/components/user/SuccessModal.vue';
import UserPagination from '@/components/user/UserPagination.vue';

const mockPush = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush, // Pastikan menggunakan push karena kode asli memakai router.push
      replace: vi.fn(),
    }),
    useRoute: () => ({
      query: {},
    }),
  };
});

describe('UserIndex.vue (System/Integration UI Behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper untuk melakukan mount halaman dengan Pinia dan stubs modal
  const mountPage = (initialState = {}) => {
    return mount(UserIndex, {
      global: {
        plugins: [createTestingPinia({ 
          initialState,
          stubActions: false 
        })],
        stubs: {
          BackofficeLayout: { template: '<div><slot /></div>' },
          UserFormModal: true,
          ConfirmModal: true,
          SuccessModal: true,
          UserViewModal: true,
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
    
    it('memanggil fetchUsers dari userStore saat komponen pertama kali dirender (onMounted)', () => {
      mountPage();
      const userStore = useUserStore();
      
      expect(userStore.fetchUsers).toHaveBeenCalledTimes(1);
      expect(userStore.fetchUsers).toHaveBeenCalledWith({
        search: '', role: '', is_active: '', page: 1
      });
    });

    it('membuka FormModal mode Create saat header memancarkan event "add"', async () => {
      const wrapper = mountPage();
      const header = wrapper.findComponent(UserPageHeader);
      
      await header.vm.$emit('add');
      
      const formModal = wrapper.findComponent(UserFormModal);
      expect(formModal.props('isOpen')).toBe(true);
      expect(formModal.props('userToEdit')).toBeNull();
    });

    it('menghubungkan event @delete dari Table ke ConfirmModal dengan payload dan tema bahaya', async () => {
      const wrapper = mountPage({
        user: { users: [{ id: '1', name: 'Budi Santoso' }] }
      });
      
      await wrapper.findComponent(UserTable).vm.$emit('delete', '1');
      
      const confirmModal = wrapper.findComponent(ConfirmModal);
      expect(confirmModal.props('isOpen')).toBe(true);
      expect(confirmModal.props('theme')).toBe('danger');
      expect(confirmModal.props('message')).toContain('PERMANENTLY delete Budi Santoso');
    });

    it('memanggil action createUser di store dan menampilkan SuccessModal saat form disubmit', async () => {
      const wrapper = mountPage();
      const userStore = useUserStore();
      
      vi.mocked(userStore.createUser).mockResolvedValueOnce({ id: '99', pin_code: '123456', username: 'kasir' });

      const payload = { name: 'Kasir', role: 'cashier' };
      
      // Submit dan tunggu semua promise asinkron selesai
      await wrapper.findComponent(UserFormModal).vm.$emit('submit', payload);
      await flushPromises();

      expect(userStore.createUser).toHaveBeenCalledWith(payload);

      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('isOpen')).toBe(true);
      expect(successModal.props('pinCode')).toBe('123456');
    });
  });

  // =========================================================================
  // 2. SECURITY & AUTHORIZATION (Skenario Auto-Logout / Relogin)
  // =========================================================================
  describe('Security & Authorization Behavior', () => {
    
it('memaksa logout & redirect ke /login secara sistemik jika pengguna mengedit kredensialnya sendiri', async () => {
      const wrapper = mountPage({
        auth: { user: { id: '123', name: 'Admin Utama' } },
        user: { users: [{ id: '123', name: 'Admin Utama' }] }
      });
      
      const userStore = useUserStore();
      const authStore = useAuthStore();
      
      vi.mocked(userStore.updateUser).mockResolvedValueOnce(true);

      // 1. Edit data sendiri (ID 123)
      await wrapper.findComponent(UserTable).vm.$emit('edit', { id: '123', name: 'Admin Utama' });

      // 2. Submit dengan PIN baru (Memicu requiresRelogin = true)
      await wrapper.findComponent(UserFormModal).vm.$emit('submit', { 
        name: 'Admin Berubah', 
        pin_code: '654321' 
      });

      await flushPromises();

      const successModal = wrapper.findComponent(SuccessModal);
      expect(successModal.props('message')).toContain('your session will end');

      // 3. Panggil langsung method handleSuccessModalClose
      await (wrapper.vm as any).handleSuccessModalClose();

      expect(authStore.logout).toHaveBeenCalledTimes(1);
      
      // Karena kode asli menggunakan router.push('/login'), pastikan kita mengecek mockPush
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

  });

  // =========================================================================
  // 3. CONTRACT / SCHEMA RENDERING (Distribusi Props dari Store ke Child)
  // =========================================================================
  describe('Contract / Schema Rendering', () => {
    
    it('mendistribusikan state Store murni (users, isLoading, error) secara reaktif ke komponen Table', () => {
      const mockUsers = [{ id: '1', name: 'Test User' }];
      
      const wrapper = mountPage({
        user: {
          users: mockUsers,
          isLoading: true,
          errorMessage: 'Terjadi kesalahan jaringan'
        }
      });

      const tableProps = wrapper.findComponent(UserTable).props();
      
      expect(tableProps.users).toEqual(mockUsers);
      expect(tableProps.isLoading).toBe(true);
      expect(tableProps.errorMessage).toBe('Terjadi kesalahan jaringan');
    });

    it('mendistribusikan metadata paginasi murni ke komponen UserPagination', () => {
      const mockPagination = { current_page: 3, last_page: 10, total: 150 };
      
      const wrapper = mountPage({
        user: { pagination: mockPagination }
      });

      const paginationProps = wrapper.findComponent(UserPagination).props();
      
      expect(paginationProps.currentPage).toBe(3);
      expect(paginationProps.lastPage).toBe(10);
      expect(paginationProps.total).toBe(150);
    });

  });
});