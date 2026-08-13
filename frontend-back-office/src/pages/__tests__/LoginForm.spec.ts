import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
// Hapus import { useRouter } dari sini karena kita akan mock langsung
import LoginForm from '../Login.vue'; 
import { useAuthStore } from '../../stores/authStore'; 

// 1. Mocking Vue Router dengan mempertahankan fungsi aslinya (importOriginal)
const mockReplace = vi.fn();

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual, // Kembalikan semua fungsi asli seperti createRouter, dll
    useRouter: () => ({
      replace: mockReplace,
    }),
  };
});

describe('Login.vue (System/Integration UI Behavior)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. DATA INTEGRITY & STATE TRANSITION (Transisi UI & Interaksi Form)
  // =========================================================================
  describe('State Transition & UI Integrity', () => {
    it('menonaktifkan seluruh input & menampilkan loading spinner saat authStore.isLoading = true', () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              auth: { isLoading: true }, 
            },
          })],
        },
      });

      // Validasi tombol submit berubah teks dan menjadi disabled
      const submitBtn = wrapper.find('button[type="submit"]');
      expect(submitBtn.text()).toContain('Authenticating...');
      expect((submitBtn.element as HTMLButtonElement).disabled).toBe(true);

      // Validasi input username dan password terkunci
      const inputs = wrapper.findAll('input');
      inputs.forEach((input) => {
        expect((input.element as HTMLInputElement).disabled).toBe(true);
      });
    });

    it('mengubah tipe input password dari password menjadi text saat tombol toggle diklik', async () => {
      const wrapper = mount(LoginForm, {
        global: { plugins: [createTestingPinia()] },
      });

      // Cari input password berdasarkan placeholder uniknya
      const passwordInput = wrapper.find('input[placeholder="••••••••"]');
      // Cari tombol toggle (satu-satunya button type="button" di dalam form ini)
      const toggleBtn = wrapper.find('button[type="button"]');

      // State awal: Tipe harus 'password'
      expect(passwordInput.attributes('type')).toBe('password');

      // Transisi 1: Klik untuk menampilkan password
      await toggleBtn.trigger('click');
      expect(passwordInput.attributes('type')).toBe('text');

      // Transisi 2: Klik lagi untuk menyembunyikan
      await toggleBtn.trigger('click');
      expect(passwordInput.attributes('type')).toBe('password');
    });

    it('beralih ke halaman /dashboard (replace) hanya jika authStore.login() mengembalikan true', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({ stubActions: false })],
        },
      });

      const store = useAuthStore();
      
      // Simulasi backend mengembalikan respons sukses
      vi.mocked(store.login).mockResolvedValueOnce(true);

      const inputs = wrapper.findAll('input');
      await inputs[0].setValue('admin');
      await inputs[1].setValue('password123');

      // Trigger submit form
      await wrapper.find('form').trigger('submit.prevent');

      expect(store.login).toHaveBeenCalledWith({
        username: 'admin',
        password: 'password123',
      });
      
      // Menggunakan replace, BUKAN push (Sesuai kode komponen asli)
      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  // =========================================================================
  // 2. SECURITY, AUTHORIZATION & RATE LIMITING (Respon Penolakan dari Sistem)
  // =========================================================================
  describe('Security, Authorization & Rate Limiting Behavior', () => {
    it('TIDAK meredirect ke /dashboard jika kredensial ditolak (login mengembalikan false)', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({ stubActions: false })],
        },
      });

      const store = useAuthStore();
      vi.mocked(store.login).mockResolvedValueOnce(false); 

      await wrapper.find('form').trigger('submit.prevent');

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('menampilkan banner alert untuk pesan sistem umum (seperti 401 Unauthorized / 429 Rate Limit)', () => {
      const errorMessage = 'Too Many Attempts. Please try again in 60 seconds.';
      
      const wrapper = mount(LoginForm, {
        global: {
          plugins: [createTestingPinia({
            initialState: {
              auth: { errorMessage: errorMessage },
            },
          })],
        },
      });

      // Validasi kotak peringatan (Transition Banner) muncul & memiliki class error
      const errorBanner = wrapper.find('.bg-error\\/10'); 
      expect(errorBanner.exists()).toBe(true);
      expect(errorBanner.text()).toContain(errorMessage);
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

      // Cek apakah pesan dari skema array validationErrors dirender
      expect(wrapper.text()).toContain('Username tidak ditemukan dalam sistem.');
      expect(wrapper.text()).toContain('Password terlalu pendek.');

      // Cek apakah input mendapatkan class border error merah
      const usernameInput = wrapper.findAll('input')[0];
      expect(usernameInput.classes()).toContain('border-error');
      expect(usernameInput.classes()).toContain('text-error');
    });

    it('memanggil authStore.clearError(field) saat pengguna mengetik untuk mereset state error', async () => {
      const wrapper = mount(LoginForm, {
        global: {
          // Aktifkan stubActions untuk memantau panggilan aksi Store tanpa mengeksekusi isinya
          plugins: [createTestingPinia({ stubActions: true })], 
        },
      });

      const store = useAuthStore();
      const usernameInput = wrapper.findAll('input')[0];
      const passwordInput = wrapper.findAll('input')[1];

      // Simulasi user mengetik teks baru untuk menghapus pesan error masing-masing field
      await usernameInput.setValue('admin_baru');
      expect(store.clearError).toHaveBeenCalledWith('username');

      await passwordInput.setValue('pass_baru');
      expect(store.clearError).toHaveBeenCalledWith('password');
    });
  });
});