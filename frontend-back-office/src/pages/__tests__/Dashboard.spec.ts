import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import Dashboard from '@/pages/Dashboard.vue'; // Sesuaikan lokasi file
import { useAuthStore } from '@/stores/authStore';

// 1. Mock vue-router dengan importOriginal agar createRouter tidak hilang
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual, // Kembalikan semua fungsi asli seperti createRouter, createWebHistory
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
    }),
  };
});

describe('Dashboard.vue (UI Integration & State Transition)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. DATA INTEGRITY & STATE TRANSITION (Render Awal & Aksi Pengguna)
  // =========================================================================
  describe('State Transition & UI Integrity', () => {
    
    it('merender antarmuka Dashboard dengan integritas teks yang benar (Contract Data)', () => {
      const wrapper = mount(Dashboard, {
        global: {
          plugins: [createTestingPinia()],
        },
      });

      // Memastikan elemen UI (Typography) dirender sesuai desain sistem
      expect(wrapper.find('h1').text()).toBe('Dashboard');
      expect(wrapper.text()).toContain('Welcome to SelaRasa Back Office!');
    });

    it('memicu transisi pemutusan sesi (logout) ke sistem AuthStore saat tombol Sign Out diklik', async () => {
      const wrapper = mount(Dashboard, {
        global: {
          // stubActions: true memastikan kita memantau pemanggilan fungsi tanpa menembak API beneran
          plugins: [createTestingPinia({ stubActions: true })],
        },
      });

      const store = useAuthStore();
      const logoutBtn = wrapper.find('button');
      
      // Validasi tombol yang tepat ditemukan
      expect(logoutBtn.text()).toBe('Sign Out');
      expect(logoutBtn.classes()).toContain('bg-error'); // Validasi kelas warna bahaya
      
      // Eksekusi klik tombol
      await logoutBtn.trigger('click');

      // Memastikan interaksi UI berhasil diteruskan ke Store Management
      expect(store.logout).toHaveBeenCalledTimes(1);
    });

  });
});