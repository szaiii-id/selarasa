// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import Login from '../Login.vue';
import { useAuthStore } from '@/stores/authStore';

// =====================================================================
// SETUP & PARTIAL MOCKING
// =====================================================================

// 1. Buat SATU instance mock tunggal di luar agar bisa dipakai bersama
const mockReplace = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual, 
    useRouter: vi.fn(() => ({
      replace: mockReplace, // 2. Gunakan instance mock tunggal tersebut
    })),
  };
});

describe('Login.vue - Frontend Integration Test', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =====================================================================
  // 1. HAPPY PATH
  // =====================================================================
  it('Happy Path: Mengisi form, menekan tombol login, dan beralih ke dashboard jika sukses', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
      },
    });

    const store = useAuthStore();
    // Beritahu mock Pinia untuk me-return "true" saat login dipanggil
    vi.mocked(store.login).mockResolvedValue(true);

    const usernameInput = wrapper.find('input[placeholder="Enter your username"]');
    const passwordInput = wrapper.find('input[placeholder="••••••••"]');
    const form = wrapper.find('form');

    await usernameInput.setValue('cashier');
    await passwordInput.setValue('password123');
    await form.trigger('submit.prevent');

    await flushPromises(); 

    expect(store.login).toHaveBeenCalledWith({
      username: 'cashier',
      password: 'password123',
    });
    
    // 3. Lakukan assertion (pengecekan) pada mock global
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  // =====================================================================
  // 2. NEGATIVE PATH & CONTRACT TESTING
  // =====================================================================
  it('Negative Path: Menampilkan pesan error global (Alert) jika otentikasi gagal', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ 
          createSpy: vi.fn,
          initialState: {
            auth: { errorMessage: 'Invalid credentials. Please try again.' }
          }
        })],
      },
    });

    const errorAlert = wrapper.find('.bg-error\\/10');
    expect(errorAlert.exists()).toBe(true);
    expect(errorAlert.text()).toContain('Invalid credentials. Please try again.');
  });

  it('Contract / Validation Testing: Menampilkan pesan error spesifik di bawah input', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ 
          createSpy: vi.fn,
          initialState: {
            auth: { 
              validationErrors: { 
                username: ['Username is required.'],
                password: ['Password must be at least 8 characters.']
              } 
            }
          }
        })],
      },
    });

    const errorTexts = wrapper.findAll('p.text-error');
    expect(errorTexts.length).toBe(2);
    expect(errorTexts[0].text()).toBe('Username is required.');
    expect(errorTexts[1].text()).toBe('Password must be at least 8 characters.');

    const inputs = wrapper.findAll('input');
    expect(inputs[0].classes()).toContain('border-error');
    expect(inputs[1].classes()).toContain('border-error');
  });

  // =====================================================================
  // 3. UI STATE TRANSITION & DOM MANIPULATION
  // =====================================================================
  it('State Transition (Loading): Tombol harus disable dan teks berubah saat isLoading true', async () => {
    const wrapper = mount(Login, {
      global: {
        plugins: [createTestingPinia({ 
          createSpy: vi.fn,
          initialState: { auth: { isLoading: true } }
        })],
      },
    });

    const submitButton = wrapper.find('button[type="submit"]');
    const svgSpinner = wrapper.find('svg.animate-spin');

    expect(submitButton.attributes('disabled')).toBeDefined();
    expect(submitButton.text()).toContain('Authenticating...');
    expect(svgSpinner.exists()).toBe(true);
  });

  it('DOM Interaction: Mengubah input type password menjadi text saat icon mata diklik', async () => {
    const wrapper = mount(Login, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] }, 
    });

    const passwordInput = wrapper.find('input[placeholder="••••••••"]');
    const toggleButton = wrapper.find('button[type="button"]');

    expect(passwordInput.attributes('type')).toBe('password');

    await toggleButton.trigger('click');
    expect(passwordInput.attributes('type')).toBe('text');

    await toggleButton.trigger('click');
    expect(passwordInput.attributes('type')).toBe('password');
  });

  it('Clear Error: Mengetik di input harus memanggil store.clearError()', async () => {
    const wrapper = mount(Login, {
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    const store = useAuthStore();

    const usernameInput = wrapper.find('input[placeholder="Enter your username"]');
    await usernameInput.setValue('a');

    expect(store.clearError).toHaveBeenCalledWith('username');
  });
});