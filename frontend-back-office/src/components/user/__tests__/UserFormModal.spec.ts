import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import UserFormModal from '../UserFormModal.vue';
import { useAuthStore } from '@/stores/authStore';

// Mock Pinia Store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('UserFormModal.vue (Complex Form & Logic Testing)', () => {
  const defaultErrors = {};
  
  beforeEach(() => {
    vi.clearAllMocks();
    // Default Mock: Login sebagai Admin
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: '99', role: 'admin' } } as any);
  });

  // --- PERBAIKAN DI SINI ---
  // Jadikan async agar kita bisa menunggu setProps selesai
  const mountModal = async (propsData: any = {}) => {
    const wrapper = mount(UserFormModal, {
      props: {
        isOpen: false, // MULAI DARI FALSE (Tertutup)
        isLoading: false,
        userToEdit: null,
        errors: defaultErrors,
        ...propsData
      },
      global: {
        stubs: { Teleport: true, Transition: true }
      }
    });

    // SIMULASIKAN MODAL DIBUKA (Ini akan memicu 'watch' di dalam komponen)
    await wrapper.setProps({ isOpen: true });

    return wrapper;
  };

  // =========================================================================
  // 1. STATE INITIALIZATION (Create vs Edit Mode)
  // =========================================================================
  it('[Mode] Form kosong saat Create Mode, dan terisi data saat Edit Mode', async () => {
    const wrapperCreate = await mountModal({ userToEdit: null }); // Tambahkan await
    expect(wrapperCreate.find('h2').text()).toBe('Add New User');
    expect((wrapperCreate.find('input[type="text"]').element as HTMLInputElement).value).toBe('');

    const mockUser = { id: '1', name: 'John Doe', username: 'johndoe', role: 'manager', is_active: true };
    const wrapperEdit = await mountModal({ userToEdit: mockUser }); // Tambahkan await
    
    expect(wrapperEdit.find('h2').text()).toBe('Edit User');
    expect((wrapperEdit.find('input[type="text"]').element as HTMLInputElement).value).toBe('John Doe');
  });

  // =========================================================================
  // 2. FORM VALIDATION & DATA MANIPULATION
  // =========================================================================
  it('[Validation] Menghapus spasi secara otomatis pada input Username', async () => {
    const wrapper = await mountModal(); // Tambahkan await
    const inputs = wrapper.findAll('input[type="text"]');
    const usernameInput = inputs[1]; // Input kedua adalah username

    // Simulasi user mengetik dengan spasi
    await usernameInput.setValue('john doe 123');
    
    // Pastikan model data langsung terpotong spasinya
    expect((usernameInput.element as HTMLInputElement).value).toBe('johndoe123');
  });

  it('[Validation] Tombol Submit disable jika field wajib kosong', async () => {
    const wrapper = await mountModal({ userToEdit: null }); // Tambahkan await
    const submitBtn = wrapper.findAll('button').find(b => b.text() === 'Create User')!;
    
    // Posisi awal kosong -> Harus disabled
    expect(submitBtn.attributes('disabled')).toBeDefined();

    // Isi sebagian -> Masih disabled
    await wrapper.findAll('input[type="text"]')[0].setValue('Budi');
    expect(submitBtn.attributes('disabled')).toBeDefined();

    // Isi semua termasuk password -> Active
    await wrapper.findAll('input[type="text"]')[1].setValue('budi');
    await wrapper.find('input[type="password"]').setValue('password123');
    expect(submitBtn.attributes('disabled')).toBeUndefined();
  });

  // =========================================================================
  // 3. PAYLOAD FORMATTING (Edge Case Password & PIN saat Edit)
  // =========================================================================
  it('[Payload] Menghapus properti password dan pin_code jika kosong saat Edit Mode', async () => {
    const mockUser = { id: '1', name: 'John Doe', username: 'johndoe', role: 'manager', is_active: true };
    const wrapper = await mountModal({ userToEdit: mockUser }); // Tambahkan await

    // Kita TIDAK mengisi form password dan TIDAK menekan generate PIN
    const submitBtn = wrapper.findAll('button').find(b => b.text() === 'Save Changes')!;
    await submitBtn.trigger('click');

    const emitted = wrapper.emitted('submit');
    expect(emitted).toBeTruthy();
    
    const payload = emitted![0][0] as any;
    expect(payload.password).toBeUndefined(); // Tidak boleh ada agar tidak ke-reset
    expect(payload.pin_code).toBeUndefined();
    expect(payload.name).toBe('John Doe'); // Data lain tetap ada
  });

  // =========================================================================
  // 4. RBAC (Role Based Access Control)
  // =========================================================================
  it('[RBAC] Opsi Admin tidak muncul di dropdown jika user yang login BUKAN Admin', async () => {
    // Mock login sebagai Manager
    vi.mocked(useAuthStore).mockReturnValue({ user: { id: '55', role: 'manager' } } as any);
    
    const wrapper = await mountModal(); // Tambahkan await
    const select = wrapper.find('select');
    
    // Pastikan <option value="admin"> tidak ada
    expect(select.html()).not.toContain('value="admin"');
    expect(select.html()).toContain('value="manager"'); // Manager tetap ada
  });

  // =========================================================================
  // 5. EDGE CASE: UNSAVED CHANGES (isDirty)
  // =========================================================================
  it('[Edge Case] Memunculkan konfirmasi Unsaved Changes jika data diedit dan mencoba ditutup', async () => {
    const wrapper = await mountModal(); // Tambahkan await

    // 1. Coba tutup saat form belum diapa-apakan (isDirty = false)
    const closeBtn = wrapper.findAll('button').find(b => b.html().includes('M6 18L18 6M6 6l12 12'))!; // Tombol X
    await closeBtn.trigger('click');
    
    // Emit 'close' langsung dipanggil
    expect(wrapper.emitted('close')).toHaveLength(1);

    // 2. User mengetik sesuatu (isDirty = true)
    await wrapper.findAll('input[type="text"]')[0].setValue('Tulisan Baru');
    
    // 3. Coba tutup lagi
    await closeBtn.trigger('click');

    // Emit 'close' TIDAK BOLEH bertambah (ditahan)
    expect(wrapper.emitted('close')).toHaveLength(1); 
    
    // Modal peringatan "Unsaved Changes" harus muncul di layar
    expect(wrapper.text()).toContain('Unsaved Changes');
    
    // 4. User klik "Discard" di dalam modal peringatan
    const discardBtn = wrapper.findAll('button').find(b => b.text() === 'Discard')!;
    await discardBtn.trigger('click');

    // Barulah emit 'close' dipanggil untuk kedua kalinya
    expect(wrapper.emitted('close')).toHaveLength(2);
  });
});