import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Alur Autentikasi & Navigasi POS (E2E - Full Journey)', () => {

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore cache clear errors
    }
  });

  test.describe('A. LOGIN FLOW', () => {
    
    test('Admin berhasil login dan redirect ke /home atau /shift/open', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      // Admin bisa redirect ke /home (jika ada shift) atau /shift/open (jika tidak ada shift)
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
    });

    test('Manager berhasil login dan redirect ke /home atau /shift/open', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[placeholder="Enter your username"]', 'manager');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
    });

    test('Cashier berhasil login dan redirect ke /home atau /shift/open', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[placeholder="Enter your username"]', 'cashier');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
    });

    test('Login gagal menampilkan error banner', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[placeholder="Enter your username"]', 'wrong_user');
      await page.fill('input[placeholder="••••••••"]', 'wrong_password');
      await page.click('button[type="submit"]');
      
      const errorBanner = page.locator('.bg-error\\/10');
      await expect(errorBanner).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    });

    test('Toggle show/hide password', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const passwordInput = page.locator('input[placeholder="••••••••"]');
      
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      await page.click('button[type="button"]');
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      await page.click('button[type="button"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('Mengetik di input username memanggil clearError', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[placeholder="Enter your username"]', 'wrong');
      await page.fill('input[placeholder="••••••••"]', 'wrong');
      await page.click('button[type="submit"]');
      await expect(page.locator('.bg-error\\/10')).toBeVisible();
      
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await expect(page.locator('.bg-error\\/10')).not.toBeVisible();
    });
  });

  test.describe('B. NAVIGATION GUARD', () => {

    test('User belum login redirect ke /login saat akses /home', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/home');
      
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('User belum login redirect ke /login saat akses /shift/open', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/shift/open');
      
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('Root path / redirect ke /login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/');
      
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('User sudah login redirect dari /login ke /home atau /shift/open', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
      
      // Coba akses /login lagi
      await page.goto('/login');
      
      // Harus redirect dari /login
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 10000 });
    });

    test('URL tidak dikenal redirect ke /login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/unknown-page');
      
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('C. SHIFT GUARD', () => {

    test('User tanpa shift aktif diarahkan ke /shift/open', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      // Jika tidak ada shift, harus di /shift/open
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
      
      if (page.url().includes('/shift/open')) {
        // Verifikasi halaman Open Shift muncul
        await expect(page.locator('h1')).toContainText('Start Shift');
      }
    });

    test('User di /shift/open tidak bisa akses /home tanpa shift', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
      
      if (page.url().includes('/shift/open')) {
        await page.goto('/home');
        await expect(page).toHaveURL(/\/shift\/open/, { timeout: 10000 });
      }
    });
  });

  test.describe('D. UI VISUAL', () => {

    test('Menampilkan judul Point of Sale dan SelaRasa', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // h1 berisi "Point of Sale"
      await expect(page.locator('h1')).toContainText('Point of Sale');
      
      // Brand SelaRasa
      await expect(page.locator('text=SelaRasa')).toBeVisible();
      
      // Subtitle
      await expect(page.locator('text=Sign In to Your Account')).toBeVisible();
    });

    test('Tombol Sign In enabled dan berisi teks yang benar', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
      await expect(submitButton).toContainText('Sign In');
    });

    test('Responsive: Form login terlihat di viewport mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('input[placeholder="Enter your username"]')).toBeVisible();
      await expect(page.locator('input[placeholder="••••••••"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });
});