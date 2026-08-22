import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

test.describe('Alur Autentikasi Back Office (E2E) - Real UI & User Journey', () => {

  // =========================================================================
  // HOOK CLEANUP PROFESIONAL: Hapus Cache Docker SETELAH SETIAP TES
  // =========================================================================
  test.afterEach(async () => {
    try {
      execSync('docker exec selarasa_backend php artisan cache:clear', { stdio: 'ignore' });
    } catch (error) {
      // Abaikan error minor jika container sedang sibuk
    }
  });

  // =========================================================================
  // 1. HAPPY PATH & STATE TRANSITION (Level Alur Pengguna)
  // =========================================================================
  test('Pengguna berhasil login, masuk dashboard, dan melakukan logout dengan konfirmasi modal', async ({ page }) => {
    await page.goto('/login');

    // Validasi visual & struktur dokumen
    await expect(page.locator('h1')).toContainText('Back Office');

    // Login sebagai Admin
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01');
    await page.click('button[type="submit"]');

    // Validasi masuk ke Dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('text=di SelaRasa Back Office')).toBeVisible();

    // 1. Klik tombol Sign Out / Logout di Sidebar/Layout
    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout"), a:has-text("Logout")').first();
    await signOutBtn.click();

    // 2. TANGKAP MODAL KONFIRMASI: Pastikan LogoutModal / ConfirmModal muncul
    // Menunggu teks "Ready to Leave?" muncul di layar
    await expect(page.locator('text=Ready to Leave?')).toBeVisible();

    // 3. Klik tombol konfirmasi di dalam modal ("Yes, Logout")
    const confirmLogoutBtn = page.locator('button:has-text("Yes, Logout")');
    await confirmLogoutBtn.click();

    // 4. Pastikan sistem berhasil menendang pengguna kembali ke halaman /login
    await expect(page).toHaveURL(/\/login/);
  });

  // =========================================================================
  // 2. ERROR HANDLING LEVEL UI (Menerjemahkan 422, 401, dan 403 ke UI Manusia)
  // =========================================================================
  test('Menampilkan teks error field berwarna merah saat validasi kosong (HTTP 422)', async ({ page }) => {
    await page.goto('/login');

    // Langsung klik submit tanpa mengisi form
    await page.click('button[type="submit"]');

    // 1. Pastikan pengguna tidak bocor ke halaman Dashboard
    await expect(page).toHaveURL(/\/login/);

    // 2. Validasi UI: Pastikan input berubah menjadi merah (kelas border-error dari Vue)
    const usernameInput = page.locator('input[placeholder="Enter your username"]');
    await expect(usernameInput).toHaveClass(/border-error/);

    // 3. Pastikan pesan error spesifik field dari backend muncul di bawah input
    const fieldError = page.locator('p.text-error.font-medium').first();
    await expect(fieldError).toBeVisible();
  });

  test('Menampilkan Banner Alert saat kredensial salah/ditolak (HTTP 401)', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'password_ngawur');
    await page.click('button[type="submit"]');

    // Validasi UI: Pastikan Transition Banner global muncul di atas form
    const globalErrorBanner = page.locator('.bg-error\\/10');
    await expect(globalErrorBanner).toBeVisible();
    await expect(globalErrorBanner.locator('p')).not.toBeEmpty();
  });

  test('Sistem menolak login dan menampilkan pesan 403 jika Role tidak diizinkan (Cashier mencoba masuk Back Office)', async ({ page }) => {
    await page.goto('/login');

    // Simulasi: Kasir POS mencoba masuk ke portal Back Office menggunakan kredensial yang BENAR
    await page.fill('input[placeholder="Enter your username"]', 'cashier');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01'); 
    
    await page.click('button[type="submit"]');

    // 1. Pastikan pengguna ditendang dan tetap di halaman login
    await expect(page).toHaveURL(/\/login/);

    // 2. Validasi UI: Pastikan pesan error Role Permissions muncul
    const globalErrorBanner = page.locator('.bg-error\\/10');
    await expect(globalErrorBanner).toBeVisible();
  });

  // =========================================================================
  // 3. USABILITY & ACCESSIBILITY (a11y)
  // =========================================================================
  test('Navigasi murni menggunakan keyboard & Toggle Show Password berfungsi', async ({ page }) => {
    await page.goto('/login');

    // 1. Fokus ke kolom username secara manual & ketik
    await page.focus('input[placeholder="Enter your username"]');
    await page.keyboard.type('admin');

    // 2. Berpindah ke kolom password menggunakan TAB
    await page.keyboard.press('Tab');
    await page.keyboard.type('selarasa01');

    // 3. Berpindah ke tombol Toggle Show Password menggunakan TAB
    await page.keyboard.press('Tab');
    
    // 4. Tekan SPASI untuk mengaktifkan toggle
    await page.keyboard.press('Space');
    
    // Validasi integritas DOM: Tipe input harus berubah dari password menjadi text
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 5. Berpindah ke tombol Submit menggunakan TAB lalu tekan ENTER
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Validasi berhasil masuk ke dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // =========================================================================
  // 4. SECURITY & STATE TRANSITION (Protected Route Guard)
  // =========================================================================
  test('Sistem memblokir akses langsung ke /dashboard jika belum login (Redirect)', async ({ page }) => {
    // Pengguna mencoba bypass ke dashboard secara langsung dari URL bar
    await page.goto('/dashboard');

    // Harapan: Axios interceptor (401) atau Vue Router beforeEach menendang user kembali
    await expect(page).toHaveURL(/\/login/);
  });

  // =========================================================================
  // 5. SECURITY PATH - REAL RATE LIMITING (HTTP 429)
  // =========================================================================
  test('Menampilkan peringatan Rate Limit setelah brute-force login beruntun', async ({ page }) => {
    await page.goto('/login');

    // Lakukan 6 kali percobaan agar pasti melewati batas throttle:auth-strict (biasanya 5)
    for (let i = 1; i <= 6; i++) {
      await page.fill('input[placeholder="Enter your username"]', 'hacker');
      await page.fill('input[placeholder="••••••••"]', `tebak_${i}`);
      
      const responsePromise = page.waitForResponse(resp => resp.url().includes('/login'));
      await page.click('button[type="submit"]');
      const response = await responsePromise;

      if (response.status() === 429) {
        break;
      }
    }

    // Pastikan interceptor axios mengubah pesan 429 menjadi teks yang ramah manusia
    const globalErrorBanner = page.locator('.bg-error\\/10 p');
    await expect(globalErrorBanner).toBeVisible();
    await expect(globalErrorBanner).toContainText(/too many requests/i);
  });

});