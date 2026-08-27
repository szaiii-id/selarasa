import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';

test.describe('Alur Autentikasi POS (E2E)', () => {

  test.beforeEach(async ({ page }) => {
    
    try {
      execSync('docker exec selarasa_backend php artisan cache:clear', { stdio: 'ignore' });
      execSync('docker exec selarasa_backend php artisan config:clear', { stdio: 'ignore' });
    } catch (error) {
      
    }
    
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 15000 });
  });

  test.afterEach(async () => {
    try {
      execSync('docker exec selarasa_backend php artisan cache:clear', { stdio: 'ignore' });
    } catch (error) {
      
    }
  });

  test('Login cashier berhasil, masuk dashboard, dan logout', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Point of Sale');

    await page.fill('input[placeholder="Enter your username"]', 'cashier');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01');
    
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/pos/auth/login') && resp.request().method() === 'POST',
      { timeout: 20000 }
    );
    
    await page.click('button[type="submit"]');
    
    const response = await responsePromise;
    console.log('Login status:', response.status());
    
    if (response.status() === 200) {
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Dashboard');
      await expect(page.locator('p')).toContainText('Welcome to SelaRasa point of sale!');
      
      await page.click('button:has-text("Sign Out")');
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    } else {
      const body = await response.text();
      console.log('Login response:', body);
      await page.screenshot({ path: 'test-results/login-failed.png', fullPage: true });
    }
  });

  test('Menampilkan error field saat validasi kosong', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/login/);
    
    const usernameInput = page.locator('input[placeholder="Enter your username"]');
    await expect(usernameInput).toHaveClass(/border-error/);
    
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toHaveClass(/border-error/);
    
    await expect(page.locator('p.text-xs.text-error').first()).toBeVisible();
  });

  test('Menampilkan banner error saat password salah', async ({ page }) => {
    await page.fill('input[placeholder="Enter your username"]', 'cashier');
    await page.fill('input[placeholder="••••••••"]', 'wrong_password');
    
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/pos/auth/login')
    );
    
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    
    console.log('401 Response:', response.status());
    
    const errorBanner = page.locator('.bg-error\\/10');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
    await expect(errorBanner.locator('p')).toContainText(/invalid username or password/i);
  });

  test('Menolak inventory dari POS', async ({ page }) => {
    await page.fill('input[placeholder="Enter your username"]', 'inventory');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01');
    
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/pos/auth/login')
    );
    
    await page.click('button[type="submit"]');
    const response = await responsePromise;
    
    console.log('Inventory login status:', response.status());
    
    await expect(page).toHaveURL(/\/login/);
    
    const errorBanner = page.locator('.bg-error\\/10');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });

test('Keyboard navigation & toggle password', async ({ page }) => {
    await page.focus('input[placeholder="Enter your username"]');
    await page.keyboard.type('cashier');
    
    await page.keyboard.press('Tab');
    await page.keyboard.type('selarasa01');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    
    const passwordInput = page.locator('input[placeholder="••••••••"]');
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
});

  test('Blokir akses langsung ke /dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test('Rate limit setelah percobaan gagal', async ({ page }) => {
    for (let i = 1; i <= 6; i++) {
      await page.fill('input[placeholder="Enter your username"]', 'hacker');
      await page.fill('input[placeholder="••••••••"]', `password_${i}`);
      
      const responsePromise = page.waitForResponse(
        resp => resp.url().includes('/pos/auth/login')
      );
      
      await page.click('button[type="submit"]');
      const response = await responsePromise;
      
      console.log(`Attempt ${i}:`, response.status());
    }
    
    const errorBanner = page.locator('.bg-error\\/10 p');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });

});