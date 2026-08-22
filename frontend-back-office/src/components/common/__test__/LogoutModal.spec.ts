import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LogoutModal from '../LogoutModal.vue'; // <-- NAMA FILE SUDAH DISESUAIKAN

describe('LogoutModal.vue (Common Component Testing)', () => {
  // Helper untuk melakukan mount dan membuka modal (memicu lifecycle & watcher jika ada)
  const mountModal = async (propsData: any = {}) => {
    const wrapper = mount(LogoutModal, { // <-- NAMA KOMPONEN SUDAH DISESUAIKAN
      props: {
        isOpen: false, // Mulai dari tertutup
        isLoading: false,
        ...propsData
      },
      global: {
        // Stub untuk Teleport dan Transition agar bisa dirender oleh Vue Test Utils
        stubs: { Teleport: true, Transition: true }
      }
    });

    // Buka modal secara programatis
    await wrapper.setProps({ isOpen: true });
    return wrapper;
  };

  // =========================================================================
  // 1. STATE RENDERING (UI Teks & Ikon)
  // =========================================================================
  it('[UI] Menampilkan modal beserta teks judul dan deskripsi default dengan benar', async () => {
    const wrapper = await mountModal();
    
    // Pastikan teks bawaan komponen ter-render
    expect(wrapper.text()).toContain('Ready to Leave?');
    expect(wrapper.text()).toContain('Are you sure you want to logout');
    
    const confirmBtn = wrapper.findAll('button')[1];
    expect(confirmBtn.text()).toContain('Yes, Logout');
  });

  it('[UI] Tidak me-render isi modal jika isOpen bernilai false', () => {
    const wrapper = mount(LogoutModal, { // <-- NAMA KOMPONEN SUDAH DISESUAIKAN
      props: { isOpen: false },
      global: { stubs: { Teleport: true, Transition: true } }
    });

    // Karena v-if="isOpen" ada di pembungkus terluar, maka DOM tidak boleh memiliki elemen tersebut
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
  });

  // =========================================================================
  // 2. EVENT EMITTERS (Happy Path)
  // =========================================================================
  it('[Event] Memancarkan event "close" saat tombol Cancel diklik', async () => {
    const wrapper = await mountModal();
    const cancelBtn = wrapper.findAll('button')[0]; 
    
    await cancelBtn.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('[Event] Memancarkan event "confirm" saat tombol "Yes, Logout" diklik', async () => {
    const wrapper = await mountModal();
    const confirmBtn = wrapper.findAll('button')[1]; 
    
    await confirmBtn.trigger('click');
    expect(wrapper.emitted('confirm')).toHaveLength(1);
  });

  it('[Event] Memancarkan event "close" saat area background (backdrop) diklik', async () => {
    const wrapper = await mountModal();
    
    // Mencari elemen backdrop transparan (elemen pertama di dalam root yang memiliki event click)
    const backdrop = wrapper.find('.bg-black\\/20'); 
    
    await backdrop.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  // =========================================================================
  // 3. LOADING STATE (BVA & Edge Case)
  // =========================================================================
  it('[Loading] Menonaktifkan tombol dan mengubah teks saat isLoading = true', async () => {
    const wrapper = await mountModal({ isLoading: true });
    
    const cancelBtn = wrapper.findAll('button')[0];
    const confirmBtn = wrapper.findAll('button')[1];

    // 1. Memastikan kedua tombol ter-disable agar tidak terjadi double-request
    expect(cancelBtn.attributes('disabled')).toBeDefined();
    expect(confirmBtn.attributes('disabled')).toBeDefined();

    // 2. Teks tombol konfirmasi harus berubah sesuai dengan v-if/v-else di HTML
    expect(confirmBtn.text()).toContain('Logging out...');
    expect(confirmBtn.text()).not.toContain('Yes, Logout');
  });

});