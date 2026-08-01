import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import Dashboard from '@/pages/Dashboard.vue'; // Sesuaikan lokasi Dashboard.vue Anda
import { useAuthStore } from '@/stores/authStore';

describe('Dashboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('merender teks sambutan dan memanggil authStore.logout() saat tombol Sign Out diklik', async () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [createTestingPinia({ stubActions: true })],
      },
    });

    const store = useAuthStore();

    // 1. Memastikan komponen merender teks sambutan
    expect(wrapper.text()).toContain('Welcome to SelaRasa Back Office!');

    // 2. Cari tombol Sign Out dan klik
    const logoutBtn = wrapper.find('button');
    expect(logoutBtn.text()).toBe('Sign Out');
    
    await logoutBtn.trigger('click');

    // 3. Pastikan fungsi authStore.logout() dipanggil oleh tombol
    expect(store.logout).toHaveBeenCalledTimes(1);
  });
});