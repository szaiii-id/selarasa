import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import Dashboard from '@/pages/Dashboard.vue';
import { useAuthStore } from '@/stores/authStore';

// 1. Mocking vue-router
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
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
  // 1. DATA INTEGRITY & STATE TRANSITION (Render Awal & Integrasi Store)
  // =========================================================================
  describe('State Transition & UI Integrity', () => {
    
    it('merender antarmuka Dashboard dengan integritas teks, nama user, dan peran (role) dari Pinia Store', () => {
      const wrapper = mount(Dashboard, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              auth: {
                user: { name: 'Budi Tester', role: 'admin' }
              }
            }
          })],
          stubs: {
            // Stub Layout dan komponen router internal agar tes bersih dari elemen luar
            BackofficeLayout: { template: '<div><slot /></div>' },
            RouterLink: true,
          },
        },
      });

      // Memastikan judul utama dirender
      expect(wrapper.find('h1').text()).toBe('Dashboard');
      
      // Memastikan nama pengguna dan peran yang aktif tampil secara dinamis dari store
      const pageText = wrapper.text();
      expect(pageText).toContain('Budi Tester');
      expect(pageText).toContain('admin');
      expect(pageText).toContain('SelaRasa Back Office');
    });

    it('merender elemen widget dan daftar aktivitas gulir (Scroll Test) dengan benar', () => {
      const wrapper = mount(Dashboard, {
        global: {
          plugins: [createTestingPinia()],
          stubs: {
            BackofficeLayout: { template: '<div><slot /></div>' },
            RouterLink: true,
          },
        },
      });

      // Memastikan widget transaksi hari ini muncul
      expect(wrapper.text()).toContain('Total Transaksi Hari Ini');
      
      // Memastikan loop 20 data dummy aktivitas terbaru berhasil dirender di DOM
      expect(wrapper.text()).toContain('Data Dummy Transaksi ke-1');
      expect(wrapper.text()).toContain('Data Dummy Transaksi ke-20');
    });

  });
});