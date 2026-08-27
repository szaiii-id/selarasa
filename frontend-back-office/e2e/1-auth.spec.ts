import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

test.describe('Alur Autentikasi Back Office (E2E) - Real UI & User Journey', () => {

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      
    }
  });

  test('Pengguna berhasil login, masuk dashboard, dan melakukan logout dengan konfirmasi modal', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });

    await expect(page.locator('h1')).toContainText('Back Office');

    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('Dashboard');

    const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Logout"), a:has-text("Logout")').first();
    await signOutBtn.click();

    await expect(page.locator('text=Ready to Leave?')).toBeVisible();

    const confirmLogoutBtn = page.locator('button:has-text("Yes, Logout")');
    await confirmLogoutBtn.click();

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('Menampilkan teks error field berwarna merah saat validasi kosong (HTTP 422)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);

    const usernameInput = page.locator('input[placeholder="Enter your username"]');
    await expect(usernameInput).toHaveClass(/border-error/);

    const fieldError = page.locator('p.text-error.font-medium').first();
    await expect(fieldError).toBeVisible();
  });

  test('Menampilkan Banner Alert saat kredensial salah/ditolak (HTTP 401)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });

    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'password_ngawur');
    await page.click('button[type="submit"]');

    const globalErrorBanner = page.locator('.bg-error\\/10');
    await expect(globalErrorBanner).toBeVisible();
    await expect(globalErrorBanner.locator('p')).not.toBeEmpty();
  });

  test('Sistem menolak login dan menampilkan pesan 403 jika Role tidak diizinkan (Cashier mencoba masuk Back Office)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });

    await page.fill('input[placeholder="Enter your username"]', 'cashier');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01'); 
    
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);

    const globalErrorBanner = page.locator('.bg-error\\/10');
    await expect(globalErrorBanner).toBeVisible();
  });

  test('Navigasi murni menggunakan keyboard & Toggle Show Password berfungsi', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });

    await page.focus('input[placeholder="Enter your username"]');
    await page.keyboard.type('admin');

    await page.keyboard.press('Tab');
    await page.keyboard.type('selarasa01');

    await page.keyboard.press('Tab');
    
    await page.keyboard.press('Space');
    
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
  });

  test('Sistem memblokir akses langsung ke /dashboard jika belum login (Redirect)', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('Menampilkan peringatan Rate Limit setelah brute-force login beruntun', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });

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

    const globalErrorBanner = page.locator('.bg-error\\/10 p');
    await expect(globalErrorBanner).toBeVisible();
    await expect(globalErrorBanner).toContainText(/too many requests/i);
  });

});