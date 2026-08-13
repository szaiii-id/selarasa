// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import Dashboard from '../Dashboard.vue'; // <-- Sesuaikan dengan path file Dashboard.vue Anda
import { useAuthStore } from '@/stores/authStore';

describe('Dashboard.vue - Frontend Integration Test', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================================
  // 1. HAPPY PATH & RENDERING
  // =====================================================================
  it('Rendering: Menampilkan judul dan teks sambutan dengan benar', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    expect(wrapper.find('h1').text()).toBe('Dashboard');
    expect(wrapper.find('p').text()).toBe('Welcome to SelaRasa point of sale!');
  });

  it('Happy Path: Menekan tombol Sign Out akan memanggil metode logout di authStore', async () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    const store = useAuthStore();
    const logoutButton = wrapper.find('button');

    await logoutButton.trigger('click');

    // Memastikan fungsi store.logout() dipanggil tepat 1 kali
    expect(store.logout).toHaveBeenCalledTimes(1);
  });

  // =====================================================================
  // 2. UI STATE TRANSITION & DOM MANIPULATION
  // =====================================================================
  it('State Transition (Loading): Tombol disable, muncul spinner, dan teks berubah saat isLoading true', async () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [createTestingPinia({ 
          createSpy: vi.fn,
          initialState: { 
            auth: { isLoading: true } 
          } 
        })],
      },
    });

    const logoutButton = wrapper.find('button');
    const svgSpinner = wrapper.find('svg.animate-spin');

    // Pastikan tombol terkunci (disabled)
    expect(logoutButton.attributes('disabled')).toBeDefined();
    
    // Pastikan spinner dimunculkan oleh v-if
    expect(svgSpinner.exists()).toBe(true);
    
    // Pastikan teks berubah sesuai kondisi ternary
    expect(logoutButton.text()).toContain('Signing Out...');
    expect(logoutButton.text()).not.toContain('Sign Out');
  });

});