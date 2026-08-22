import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SuccessModal from '../SuccessModal.vue';

describe('SuccessModal.vue (UI, Clipboard API & Timers)', () => {
  
  // Setup & Cleanup Mocks
  beforeEach(() => {
    vi.clearAllMocks();
    
    // 1. Mocking Modern Clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
    
    // 2. Mocking Secure Context (HTTPS)
    Object.defineProperty(window, 'isSecureContext', { value: true, writable: true });
    
    // 3. Mocking Traditional Fallback (execCommand)
    document.execCommand = vi.fn();
    
    // 4. Mocking Alert (untuk antisipasi error)
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Fungsi Helper untuk me-mount dengan trigger Watcher
  const mountModal = async (propsData: any = {}) => {
    const wrapper = mount(SuccessModal, {
      props: { isOpen: false, ...propsData },
      global: { stubs: { Teleport: true, Transition: true } }
    });
    // Buka modal agar Watcher 'isOpen' tereksekusi
    await wrapper.setProps({ isOpen: true });
    return wrapper;
  };

  // =========================================================================
  // 1. STATE RENDERING (Basic UI vs PIN UI)
  // =========================================================================
  it('[UI] Menampilkan teks bawaan (default) jika title dan message tidak dikirim', async () => {
    const wrapper = await mountModal();
    
    expect(wrapper.text()).toContain('Success!');
    expect(wrapper.text()).toContain('Action completed successfully.');
    // Kotak PIN tidak boleh ada
    expect(wrapper.text()).not.toContain('Generated PIN');
  });

  it('[UI] Menampilkan kotak kredensial PIN dan Username jika props pinCode dikirim', async () => {
    const wrapper = await mountModal({ 
      title: 'Akun Dibuat', 
      pinCode: '123456', 
      username: 'johndoe' 
    });
    
    expect(wrapper.text()).toContain('Akun Dibuat');
    expect(wrapper.text()).toContain('123456');
    expect(wrapper.text()).toContain('@johndoe');
    expect(wrapper.find('button').text()).toContain('Copy PIN Code'); // Tombol copy harus muncul
  });

  // =========================================================================
  // 2. EVENT EMITTERS
  // =========================================================================
  it('[Event] Memancarkan event "close" saat tombol Done diklik', async () => {
    const wrapper = await mountModal();
    
    const doneBtn = wrapper.findAll('button').find(b => b.text() === 'Done')!;
    await doneBtn.trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  // =========================================================================
  // 3. CLIPBOARD API TESTING (Modern & Fallback)
  // =========================================================================
  it('[Clipboard] Menggunakan Modern API (navigator.clipboard) di lingkungan HTTPS (Secure Context)', async () => {
    const wrapper = await mountModal({ pinCode: '999999' });
    
    const copyBtn = wrapper.findAll('button').find(b => b.text() === 'Copy PIN Code')!;
    await copyBtn.trigger('click');

    // Pastikan writeText dipanggil dengan angka PIN yang benar
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('999999');
    
    // Pastikan UI tombol berubah sesaat
    expect(wrapper.text()).toContain('Copied to Clipboard!');
  });

  it('[Clipboard] Menggunakan Fallback (document.execCommand) jika navigator.clipboard tidak tersedia (HTTP Biasa)', async () => {
    // Simulasikan lingkungan tidak aman (tanpa HTTPS / tanpa navigator API)
    Object.defineProperty(window, 'isSecureContext', { value: false });
    
    const wrapper = await mountModal({ pinCode: '555555' });
    const copyBtn = wrapper.findAll('button').find(b => b.text() === 'Copy PIN Code')!;
    
    await copyBtn.trigger('click');

    // Karena tidak Secure, navigator.clipboard TIDAK BOLEH dipanggil
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    
    // Tapi execCommand('copy') HARUS dipanggil
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(wrapper.text()).toContain('Copied to Clipboard!');
  });

  // =========================================================================
  // 4. TIMERS & LIFECYCLE WATCHER
  // =========================================================================
  it('[Timer & Watcher] Status "Copied" hilang setelah 2 detik, dan reset saat modal dibuka ulang', async () => {
    vi.useFakeTimers(); // Bajak waktu sistem
    const wrapper = await mountModal({ pinCode: '111111' });
    
    const copyBtn = wrapper.findAll('button').find(b => b.text() === 'Copy PIN Code')!;
    
    // 1. User klik Copy
    await copyBtn.trigger('click');
    expect(wrapper.text()).toContain('Copied to Clipboard!');

    // 2. Majukan waktu 2 detik (2000ms)
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick(); // Tunggu Vue merender ulang UI

    // Status harus kembali normal
    expect(wrapper.text()).toContain('Copy PIN Code');
    expect(wrapper.text()).not.toContain('Copied to Clipboard!');

    // 3. Uji Watcher (Buka Ulang Modal)
    // Buat isCopied = true lagi
    await copyBtn.trigger('click'); 
    
    // Tutup dan buka modal secara instan via Props
    await wrapper.setProps({ isOpen: false });
    await wrapper.setProps({ isOpen: true });

    // Watcher harus mereset isCopied menjadi false tanpa perlu menunggu 2 detik
    expect(wrapper.text()).toContain('Copy PIN Code');
  });

});