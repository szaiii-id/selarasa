import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmModal from '../ConfirmModal.vue';

describe('ConfirmModal.vue (Common Component Testing)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountModal = async (propsData: any = {}) => {
    const wrapper = mount(ConfirmModal, {
      props: {
        isOpen: false, // Mulai dari false untuk memicu re-render
        title: 'Konfirmasi Aksi',
        message: 'Apakah Anda yakin?',
        ...propsData
      },
      global: {
        // Mock Teleport dan Transition agar elemen bisa di-query oleh test
        stubs: { Teleport: true, Transition: true }
      }
    });

    // Buka modal
    await wrapper.setProps({ isOpen: true });
    return wrapper;
  };

  // =========================================================================
  // 1. STATE RENDERING (Title, Message, Default Text)
  // =========================================================================
  it('[UI] Menampilkan judul, pesan, dan teks tombol default (Confirm)', async () => {
    const wrapper = await mountModal();

    expect(wrapper.text()).toContain('Konfirmasi Aksi');
    expect(wrapper.text()).toContain('Apakah Anda yakin?');
    // Tambahkan ! di akhir pencarian index array
    expect(wrapper.findAll('button')[1]!.text()).toContain('Confirm');
  });

  it('[UI] Mengganti teks tombol jika prop confirmText diberikan', async () => {
    const wrapper = await mountModal({ confirmText: 'Yes, Delete It' });
    // Tambahkan ! di akhir pencarian index array
    expect(wrapper.findAll('button')[1]!.text()).toContain('Yes, Delete It');
  });

  // =========================================================================
  // 2. THEME RENDERING (Equivalence Partitioning)
  // =========================================================================
  it('[Theme] Menggunakan warna merah (bg-error) secara default atau saat theme = "danger"', async () => {
    const wrapper = await mountModal({ theme: 'danger' });
    const confirmBtn = wrapper.findAll('button')[1]!; // <-- Tambahkan !
    
    expect(confirmBtn.classes()).toContain('bg-error');
    expect(confirmBtn.classes()).not.toContain('bg-primary');
  });

  it('[Theme] Menggunakan warna kuning (bg-yellow-500) saat theme = "warning"', async () => {
    const wrapper = await mountModal({ theme: 'warning' });
    const confirmBtn = wrapper.findAll('button')[1]!; // <-- Tambahkan !
    
    expect(confirmBtn.classes()).toContain('bg-yellow-500');
  });

  it('[Theme] Menggunakan warna primer (bg-primary) saat theme = "primary"', async () => {
    const wrapper = await mountModal({ theme: 'primary' });
    const confirmBtn = wrapper.findAll('button')[1]!; // <-- Tambahkan !
    
    expect(confirmBtn.classes()).toContain('bg-primary');
  });

  // =========================================================================
  // 3. EVENT EMITTERS (Happy Path)
  // =========================================================================
  it('[Event] Memancarkan event "close" saat tombol Cancel diklik', async () => {
    const wrapper = await mountModal();
    const cancelBtn = wrapper.findAll('button')[0]!; // <-- Tambahkan !
    
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('[Event] Memancarkan event "confirm" saat tombol aksi diklik', async () => {
    const wrapper = await mountModal();
    const confirmBtn = wrapper.findAll('button')[1]!; // <-- Tambahkan !
    
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  // =========================================================================
  // 4. LOADING STATE (BVA & Edge Case)
  // =========================================================================
  it('[Loading] Menonaktifkan tombol, menampilkan spinner, dan menyembunyikan teks saat isLoading = true', async () => {
    const wrapper = await mountModal({ isLoading: true, confirmText: 'Hapus Data' });
    
    const cancelBtn = wrapper.findAll('button')[0]!; // <-- Tambahkan !
    const confirmBtn = wrapper.findAll('button')[1]!; // <-- Tambahkan !

    // 1. Kedua tombol harus disabled
    expect(cancelBtn.attributes('disabled')).toBeDefined();
    expect(confirmBtn.attributes('disabled')).toBeDefined();

    // 2. Spinner (svg dengan class animate-spin) harus muncul
    expect(wrapper.find('.animate-spin').exists()).toBe(true);

    // 3. Teks konfirmasi harus HILANG (karena pakai v-if/v-else di template)
    expect(confirmBtn.text()).not.toContain('Hapus Data');
  });

});