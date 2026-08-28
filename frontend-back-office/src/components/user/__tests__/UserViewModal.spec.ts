import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import UserViewModal from '../UserViewModal.vue';

describe('UserViewModal.vue (Presentation & Fallback Testing)', () => {
  
  const mockUserFull = {
    id: '1',
    name: 'Budi Santoso',
    username: 'budisan',
    role: 'manager',
    is_active: true,
    joined_at: '21 Aug 2026',
    account_age: '2 months',
    last_login_at: '21 Aug 2026, 09:00',
    last_login_ip: '192.168.1.100'
  };

  const mockUserEmpty = {
    id: '2',
    name: 'Kasir Baru',
    username: 'kasirbaru',
    role: 'cashier',
    is_active: false,
    joined_at: null,
    account_age: null,
    last_login_at: null,
    last_login_ip: null
  };

  const mountModal = (propsData: any = {}) => {
    return mount(UserViewModal, {
      props: {
        isOpen: true,
        user: mockUserFull,
        ...propsData
      },
      global: {
        // Mock BrandLogo agar tidak perlu me-render SVG atau dependensinya yang asli
        stubs: { BrandLogo: true }
      }
    });
  };

  // =========================================================================
  // 1. HAPPY PATH (Data Lengkap)
  // =========================================================================
  it('[UI] Menampilkan detail informasi user dengan format yang benar saat data lengkap', () => {
    const wrapper = mountModal();

    // Memeriksa Inisial Nama (Huruf pertama)
    expect(wrapper.find('.w-12.h-12').text()).toBe('B');

    // Memeriksa Nama dan Username
    expect(wrapper.text()).toContain('Budi Santoso');
    expect(wrapper.text()).toContain('@budisan');

    // Memeriksa Status Active
    expect(wrapper.text()).toContain('Active');

    // Memeriksa Aktivitas (Joined & Last Login)
    expect(wrapper.text()).toContain('21 Aug 2026');
    expect(wrapper.text()).toContain('2 months');
    expect(wrapper.text()).toContain('192.168.1.100');
  });

  // =========================================================================
  // 2. EDGE CASES & FALLBACKS (Data Kosong / Null)
  // =========================================================================
  it('[Fallback] Menampilkan teks default yang elegan saat backend mengirim nilai null pada timestamp/IP', () => {
    const wrapper = mountModal({ user: mockUserEmpty });

    const text = wrapper.text();

    // Harus menampilkan fallback string yang Anda tentukan di template
    expect(text).toContain('Inactive');
    expect(text).toContain('-');             // joined_at || '-'
    expect(text).toContain('Just now');      // account_age || 'Just now'
    expect(text).toContain('Never');         // last_login_at || 'Never'
    expect(text).toContain('Unknown');       // last_login_ip || 'Unknown'
  });

  it('[Visibility] Modal tidak me-render apapun jika isOpen bernilai false', () => {
    const wrapper = mountModal({ isOpen: false });
    
    // Backdrop dan konten modal harusnya tidak ada di dalam DOM
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false);
  });

  // =========================================================================
  // 3. EVENT EMITTERS
  // =========================================================================
  it('[Event] Memancarkan event "close" saat tombol X (Close) ditekan', async () => {
    const wrapper = mountModal();

    const closeBtn = wrapper.find('button');
    await closeBtn.trigger('click');

    expect(wrapper.emitted()).toHaveProperty('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('[Event] Memancarkan event "close" saat background (backdrop) ditekan', async () => {
    const wrapper = mountModal();

    // Cari elemen backdrop (yang memiliki class .fixed dan .inset-0)
    const backdrop = wrapper.find('.fixed.inset-0');
    
    // Trigger klik langsung pada background (menguji fungsi @click.self)
    await backdrop.trigger('click');

    expect(wrapper.emitted()).toHaveProperty('close');
  });
});