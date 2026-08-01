import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { useRouter } from 'vue-router';
import LoginForm from '../Login.vue';
import { useAuthStore } from '../../stores/authStore';

// 1. Mocking Vue Router agar bisa melacak navigasi router.push('/dashboard')
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Login.vue (System/Integration UI Behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. DATA INTEGRITY & STATE TRANSITION (Transisi UI saat Autentikasi)
  // =========================================================================
  describe('State Transition & UI Integrity', () => {
    it('menonaktifkan seluruh input & menampilkan loading spinner saat authStore.isLoading = true', () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              auth: { isLoading: true }, // Simulasi sedang dalam request HTTP
            },
          })],
        },
      });

      // Validasi bahwa tombol submit berubah teks dan menjadi disabled
      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.text()).toContain('Authenticating...');
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true);

      // Validasi input username dan password terkunci
      const inputs = wrapper.findAll('input');
      inputs.forEach((input) => {
        expect((input.element as HTMLInputElement).disabled).toBe(true);
      });
    });

    it('beralih ke halaman /dashboard hanya jika authStore.login() mengembalikan true', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({ stubActions: false })],
        },
      });

      const store = useAuthStore();
      // Simulasi backend mengembalikan respons sukses (State beralih ke Authenticated)
      vi.mocked(store.login).mockResolvedValueOnce(true);

      // Isi form username & password
      const inputs = wrapper.findAll('input');
      await inputs[0].setValue('admin');
      await inputs[1].setValue('password123');

      // Trigger submit form
      await wrapper.find('form').trigger('submit.prevent');

      expect(store.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
      });
      // Pastikan router mengarahkan ke halaman dashboard
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  // =========================================================================
  // 2. SECURITY, AUTHORIZATION & RATE LIMITING (Respon Penolakan dari Sistem)
  // =========================================================================
  describe('Security, Authorization & Rate Limiting Behavior', () => {
    it('TIDAK redirect ke /dashboard jika kredensial ditolak (login mengembalikan false)', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({ stubActions: false })],
        },
      });

      const store = useAuthStore();
      vi.mocked(store.login).mockResolvedValueOnce(false); // Penolakan sistem

      await wrapper.find('form').trigger('submit.prevent');

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('menampilkan banner alert untuk pesan sistem umum (seperti 401 Unauthorized / 429 Rate Limit)', () => {
      const errorMessage = 'Too Many Attempts. Please try again in 60 seconds.';
      
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              auth: { errorMessage: errorMessage }, // Pesan error dari server
            },
          })],
        },
      });

      // Validasi bahwa kotak peringatan (Transition Banner) muncul
      expect(wrapper.text()).toContain(errorMessage);
    });
  });

  // =========================================================================
  // 3. CONTRACT / API SCHEMA TESTING (Render Struktur Error Backend)
  // =========================================================================
  describe('Contract / Schema Rendering', () => {
    it('merender tepat pada elemen input saat server mengirim skema error HTTP 422', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              auth: {
                validationErrors: {
                  username: ['Username tidak ditemukan dalam sistem.'],
                  password: ['Password terlalu pendek.'],
                },
              },
            },
          })],
        },
      });

      // Cek apakah pesan dari skema array validationErrors dirender di bawah input yang tepat
      expect(wrapper.text()).toContain('Username tidak ditemukan dalam sistem.');
      expect(wrapper.text()).toContain('Password terlalu pendek.');

      // Cek apakah input mendapatkan class border error merah
      const usernameInput = wrapper.find('input[type="text"]');
      expect(usernameInput.classes()).toContain('border-error');
    });

    it('memanggil authStore.clearError(field) saat pengguna mengetik untuk mereset state error', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({ stubActions: true })],
        },
      });

      const store = useAuthStore();
      const usernameInput = wrapper.find('input[type="text"]');

      // Simulasi user mengetik teks baru pada input username
      await usernameInput.setValue('admin_baru');

      expect(store.clearError).toHaveBeenCalledWith('username');
    });
  });
});