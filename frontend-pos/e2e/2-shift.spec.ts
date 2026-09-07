// e2e/2-shift.spec.ts
import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

/**
 * Helper: Reset semua shift dari database
 */
function resetShifts() {
  try {
    const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
    execSync(`docker exec ${containerName} php artisan tinker --execute="
      \\App\\Models\\CashierShift::query()->delete();
      echo 'Shifts cleared';
    "`, { stdio: 'ignore' });
  } catch (error) {
    // Ignore
  }
}

/**
 * Helper: Login sebagai user tertentu
 */
async function loginAs(page: any, username: string = 'admin') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 15000 });
  
  await page.fill('input[placeholder="Enter your username"]', username);
  await page.fill('input[placeholder="••••••••"]', 'selarasa01');
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/(home|shift\/open)/, { timeout: 15000 });
  
  // Disable idle timeout (matikan auto-lock 3 menit)
  await page.evaluate(() => {
    const originalSetTimeout = window.setTimeout.bind(window);
    (window as any).setTimeout = function(callback: any, delay?: number, ...args: any[]) {
      if (delay && delay > 60000) {
        return originalSetTimeout(callback, 999999999, ...args);
      }
      return originalSetTimeout(callback, delay, ...args);
    };
  });
}

/**
 * Helper: Masukkan PIN 6 digit
 */
async function enterPin(page: any, pin: string = '123456') {
  for (const digit of pin) {
    await page.click(`button:has-text("${digit}")`);
  }
}

/**
 * Helper: Buat shift sampai berhasil
 */
async function createShift(page: any) {
  // Pilih shift Morning Shift
  await page.click('button:has-text("Morning Shift")');
  
  // Isi opening balance
  await page.locator('input[inputmode="numeric"]').fill('500000');
  
  // Klik Continue
  await page.click('button:has-text("Continue")');
  
  // Verifikasi step 2
  await expect(page.locator('text=Verify your shift details')).toBeVisible();
  
  // Masukkan PIN 123456
  await enterPin(page, '123456');
  
  // Submit
  await page.click('button:has-text("Start Shift Now")');
  
  // Tunggu redirect
  await page.waitForURL(/\/home/, { timeout: 20000 });
}

/**
 * Helper: Login dan pastikan di /shift/open
 */
async function goToOpenShift(page: any) {
  await loginAs(page, 'admin');
  
  if (page.url().includes('/home')) {
    await page.goto('/shift/open');
    await page.waitForLoadState('networkidle');
  }
  
  await expect(page).toHaveURL(/\/shift\/open/);
}

/**
 * Helper: Login dan buat shift jika perlu
 */
async function loginAndEnsureShift(page: any) {
  await loginAs(page, 'admin');
  
  if (page.url().includes('/shift/open')) {
    await createShift(page);
  }
  
  await expect(page).toHaveURL(/\/home/);
}

test.describe('Alur POS Shift (E2E - Full Journey)', () => {

  test.beforeEach(async () => {
    resetShifts();
  });

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore
    }
  });

  test.describe('A. OPEN SHIFT FLOW', () => {

    test('Menampilkan halaman Start Shift dengan form lengkap', async ({ page }) => {
      await goToOpenShift(page);
      
      await expect(page.locator('h1')).toContainText('Start Shift');
      await expect(page.locator('text=Select Active Shift')).toBeVisible();
      await expect(page.locator('text=Count Cash Drawer')).toBeVisible();
      await expect(page.locator('text=Notes')).toBeVisible();
      await expect(page.locator('button:has-text("Continue")')).toBeVisible();
    });

    test('Menampilkan daftar master shift dari backend', async ({ page }) => {
      await goToOpenShift(page);
      
      await expect(page.locator('text=Morning Shift')).toBeVisible();
      await expect(page.locator('text=Evening Shift')).toBeVisible();
      await expect(page.locator('text=Night Shift')).toBeVisible();
    });

    test('Berhasil start shift dengan PIN 123456', async ({ page }) => {
      await goToOpenShift(page);
      await createShift(page);
      
      // Verifikasi Home muncul
      await expect(page.locator('h2:has-text("Product Catalog")')).toBeVisible();
    });

    test('Validasi: Tombol submit disabled jika PIN kurang dari 6 digit', async ({ page }) => {
      await goToOpenShift(page);
      
      // Pilih shift
      await page.click('button:has-text("Morning Shift")');
      await page.locator('input[inputmode="numeric"]').fill('500000');
      await page.click('button:has-text("Continue")');
      
      // Submit button disabled karena PIN belum diisi
      const submitButton = page.locator('button:has-text("Start Shift Now")');
      await expect(submitButton).toBeDisabled();
      
      // Isi 3 digit
      await page.click('button:has-text("1")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("3")');
      
      // Masih disabled
      await expect(submitButton).toBeDisabled();
      
      // Isi 3 digit lagi
      await page.click('button:has-text("4")');
      await page.click('button:has-text("5")');
      await page.click('button:has-text("6")');
      
      // Sekarang enabled
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('B. HOME & CART FLOW', () => {

    test('Menampilkan Product Catalog dan Cart kosong', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      await expect(page.locator('h2:has-text("Product Catalog")')).toBeVisible();
      await expect(page.locator('text=Cart (0)')).toBeVisible();
      await expect(page.locator('text=Cart is empty')).toBeVisible();
      await expect(page.locator('text=PAY NOW')).toBeVisible();
    });

    test('Filter produk berdasarkan kategori', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      // Klik kategori Coffee
      await page.click('button:has-text("Coffee")');
      await page.waitForTimeout(500);
      
      // Verifikasi produk coffee muncul
      await expect(page.locator('text=Espresso')).toBeVisible();
      await expect(page.locator('text=Cafe Latte')).toBeVisible();
      
      // Produk non-coffee tidak muncul
      await expect(page.locator('text=Matcha Frappe')).not.toBeVisible();
    });

    test('Mencari produk dengan keyword', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      const searchInput = page.locator('input[placeholder="Search products..."]');
      await searchInput.fill('espresso');
      await page.waitForTimeout(500);
      
      await expect(page.locator('text=Espresso')).toBeVisible();
      await expect(page.locator('text=Cafe Latte')).not.toBeVisible();
    });

    test('Menambahkan produk ke keranjang', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      // Klik produk Espresso menggunakan selector yang spesifik
      await page.locator('div.group').filter({ hasText: 'Espresso' }).first().click();
      
      // Verifikasi cart bertambah
      await expect(page.locator('text=Cart (1)')).toBeVisible();
    });
  });

  test.describe('C. CLOSE SHIFT FLOW', () => {

    test('Menampilkan modal End Shift', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      await page.click('button:has-text("End Shift")');
      
      await expect(page.locator('h1:has-text("End Shift")')).toBeVisible();
      await expect(page.locator('text=Count your cash drawer to end shift')).toBeVisible();
      await expect(page.locator('text=Total Cash in Drawer')).toBeVisible();
    });

    test('Validasi: Tidak bisa lanjut tanpa closing balance', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      await page.click('button:has-text("End Shift")');
      await page.click('button:has-text("Continue")');
      
      await expect(page.locator('text=Please enter the total cash in drawer')).toBeVisible();
    });

    test('Menutup modal End Shift dengan tombol Cancel', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      await page.click('button:has-text("End Shift")');
      await expect(page.locator('h1:has-text("End Shift")')).toBeVisible();
      
      await page.click('button:has-text("Cancel")');
      
      await expect(page.locator('h1:has-text("End Shift")')).not.toBeVisible();
    });
  });

  test.describe('D. LOCK SCREEN FLOW', () => {

    test('Mengunci layar dan membuka dengan PIN yang benar', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      // Klik Lock Screen
      await page.click('button[title="Lock Screen"]');
      
      // Verifikasi layar kunci
      await expect(page.locator('text=Session Locked')).toBeVisible();
      
      // Masukkan PIN 123456
      await enterPin(page, '123456');
      
      // Verifikasi unlock
      await expect(page.locator('text=Session Locked')).not.toBeVisible();
    });

    test('Menampilkan error saat PIN salah', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      await page.click('button[title="Lock Screen"]');
      await expect(page.locator('text=Session Locked')).toBeVisible();
      
      // Masukkan PIN salah
      await enterPin(page, '999999');
      
      // Verifikasi error muncul
      await expect(page.locator('text=Incorrect PIN')).toBeVisible();
    });

    test('Tombol CLEAR mengosongkan PIN', async ({ page }) => {
      await loginAndEnsureShift(page);
      
      await page.click('button[title="Lock Screen"]');
      await expect(page.locator('text=Session Locked')).toBeVisible();
      
      // Isi 3 digit
      await page.click('button:has-text("1")');
      await page.click('button:has-text("2")');
      await page.click('button:has-text("3")');
      
      // Klik CLEAR
      await page.click('button:has-text("CLEAR")');
      
      // Verifikasi dots kosong
      const filledDots = page.locator('.bg-primary.border-primary.scale-125');
      await expect(filledDots).toHaveCount(0);
    });
  });
});