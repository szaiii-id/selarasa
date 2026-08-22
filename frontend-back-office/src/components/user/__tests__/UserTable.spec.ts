import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import UserTable from '../UserTable.vue';
import { useAuthStore } from '@/stores/authStore';

// Mock Pinia Store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('UserTable.vue (UI Logic & RBAC Testing)', () => {
  const mockUsers = [
    { id: '1', name: 'Super Admin', username: 'admin', role: 'admin', is_active: true },
    { id: '2', name: 'Kasir Satu', username: 'kasir1', role: 'cashier', is_active: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. STATE RENDERING (Loading, Error, Empty)
  // =========================================================================
  it('[UI] Menampilkan animasi Loading saat isLoading = true', () => {
    const wrapper = mount(UserTable, {
      props: { users: [], isLoading: true, errorMessage: null }
    });
    // Memastikan elemen dengan class animate-spin (loading) ada
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it('[UI] Menampilkan pesan Error dan memancarkan event retry', async () => {
    const wrapper = mount(UserTable, {
      props: { users: [], isLoading: false, errorMessage: 'Koneksi terputus' }
    });
    
    expect(wrapper.text()).toContain('Koneksi terputus');
    
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('retry');
  });

  // =========================================================================
  // 2. EVENT EMITTERS (Happy Path Aksi Tabel)
  // =========================================================================
  it('[Event] Tombol View, Edit, dan Actions memancarkan event dengan payload yang benar', async () => {
    // Pura-puranya kita login sebagai Admin (ID: 99) agar semua tombol terbuka
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: '99', role: 'admin' } } as any);

    const wrapper = mount(UserTable, {
      props: { users: mockUsers, isLoading: false, errorMessage: null }
    });

    const rows = wrapper.findAll('tbody tr');
    
    // Klik "View" di baris pertama (Admin)
    await rows[0].find('button[title="View Detail"]').trigger('click');
    expect(wrapper.emitted('view')![0]).toEqual([mockUsers[0]]); // Membawa object user

    // Klik "Deactivate" di baris pertama (Karena is_active = true)
    await rows[0].find('button[title="Deactivate User"]').trigger('click');
    expect(wrapper.emitted('deactivate')![0]).toEqual(['1']); // Membawa ID saja

    // Klik "Activate" di baris kedua (Karena is_active = false)
    await rows[1].find('button[title="Activate User"]').trigger('click');
    expect(wrapper.emitted('activate')![0]).toEqual(['2']);
  });

  // =========================================================================
  // 3. ROLE-BASED ACCESS CONTROL (RBAC) & PROTEKSI
  // =========================================================================
  it('[RBAC] Menampilkan lencana "You" dan menyembunyikan tombol Edit/Delete pada akun sendiri', () => {
    // Pura-puranya kita login sebagai "Super Admin" (ID: 1)
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: '1', role: 'admin' } } as any);

    const wrapper = mount(UserTable, {
      props: { users: mockUsers, isLoading: false, errorMessage: null }
    });

    const adminRow = wrapper.findAll('tbody tr')[0];
    
    expect(adminRow.text()).toContain('You');
    // Tombol Deactivate/Delete tidak boleh ada di baris sendiri
    expect(adminRow.find('button[title="Deactivate User"]').exists()).toBe(false);
  });

  it('[RBAC] Menampilkan status "Locked" saat Manager melihat baris data Admin', () => {
    // Pura-puranya kita login sebagai "Manager" (ID: 55)
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: '55', role: 'manager' } } as any);

    const wrapper = mount(UserTable, {
      props: { users: mockUsers, isLoading: false, errorMessage: null }
    });

    const adminRow = wrapper.findAll('tbody tr')[0]; // Baris data milik 'Super Admin'
    
    expect(adminRow.text()).toContain('Locked');
    expect(adminRow.find('button[title="Edit User"]').exists()).toBe(false);
    expect(adminRow.find('button[title="Deactivate User"]').exists()).toBe(false);
  });
});