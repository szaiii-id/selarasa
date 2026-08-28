import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Alur Manajemen Shift (Shift Management E2E - Full Journey)', () => {

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore cache clear errors
    }
  });

  test.describe('A. ADMIN ROLE JOURNEY (Full Access)', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
      
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      await page.goto('/shifts');
      await expect(page).toHaveURL(/\/shifts/);
      
      await expect(page.locator('table')).toBeVisible();
    });

    test('Menampilkan tab Master Shifts secara default dengan data dari backend', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Shift Management');
      
      const masterTab = page.locator('button:has-text("Master Shifts")');
      await expect(masterTab).toHaveClass(/bg-primary/);
      
      await expect(page.locator('table')).toBeVisible();
      
      await expect(page.locator('th')).toContainText(['Shift Name', 'Start Time', 'End Time', 'Status', 'Actions']);
      
      await expect(page.locator('tbody')).toContainText('Morning Shift');
      await expect(page.locator('tbody')).toContainText('Evening Shift');
    });

    test('Admin berhasil membuat master shift baru', async ({ page }) => {
      await page.click('button:has-text("Add New Shift")');
      
      await expect(page.locator('h3:has-text("Create Master Shift")')).toBeVisible();
      
      const uniqueShiftName = `Test Shift ${Date.now().toString().slice(-5)}`;
      await page.fill('input[placeholder="e.g. Morning Shift"]', uniqueShiftName);
      
      const timeInputs = page.locator('input[type="time"]');
      await timeInputs.nth(0).fill('10:00');
      await timeInputs.nth(1).fill('18:00');
      
      await page.click('button:has-text("Save Shift")');
      
      await expect(page.locator('h3:has-text("Shift Created")')).toBeVisible();
      
      const successMessage = page.locator('p.text-text-secondary.text-sm.font-medium.mb-6');
      await expect(successMessage).toContainText(uniqueShiftName);
      
      await page.click('button:has-text("Got it, thanks!")');
      
      await expect(page.locator('tbody')).toContainText(uniqueShiftName);
    });

    test('Menampilkan error validasi merah saat nama shift duplikat (HTTP 422)', async ({ page }) => {
      await page.click('button:has-text("Add New Shift")');
      
      await page.fill('input[placeholder="e.g. Morning Shift"]', 'Morning Shift');
      
      const timeInputs = page.locator('input[type="time"]');
      await timeInputs.nth(0).fill('08:00');
      await timeInputs.nth(1).fill('16:00');
      
      await page.click('button:has-text("Save Shift")');
      
      const errorText = page.locator('p.text-error.font-medium').last();
      await expect(errorText).toBeVisible();
      await expect(errorText).toContainText('already exists');
    });

    test('Admin berhasil mengedit master shift', async ({ page }) => {
      const firstEditButton = page.locator('button:has-text("Edit")').first();
      await firstEditButton.click();
      
      await expect(page.locator('h3:has-text("Edit Master Shift")')).toBeVisible();
      
      const updatedName = `Updated Shift ${Date.now().toString().slice(-5)}`;
      await page.fill('input[placeholder="e.g. Morning Shift"]', updatedName);
      
      await page.click('button:has-text("Save Shift")');
      
      await expect(page.locator('h3:has-text("Shift Updated")')).toBeVisible();
      
      await page.click('button:has-text("Got it, thanks!")');
      
      await expect(page.locator('tbody')).toContainText(updatedName);
    });

test('Menampilkan konfirmasi delete sebelum menghapus shift', async ({ page }) => {
  // Arrange: Klik tombol Delete pada row pertama
  const firstDeleteButton = page.locator('button:has-text("Delete")').first();
  await firstDeleteButton.click();
  
  // Assert: Verifikasi ConfirmModal muncul
  const confirmModalTitle = page.getByRole('heading', { name: 'Delete Master Shift?' });
  await expect(confirmModalTitle).toBeVisible();
  
  // Assert: Verifikasi pesan konfirmasi
  const confirmMessage = page.getByText(/PERMANENTLY delete/i);
  await expect(confirmMessage).toBeVisible();
  
  // Act: Klik Cancel
  await page.getByRole('button', { name: 'Cancel' }).click();
  
  // Assert: Modal tertutup dan data masih ada
  await expect(confirmModalTitle).not.toBeVisible();
  await expect(page.locator('tbody')).toContainText('Morning Shift');
});
    test('Berpindah ke tab Cashier Shifts dan menampilkan data 7 hari terakhir', async ({ page }) => {
      await page.click('button:has-text("Cashier Shifts")');
      
      const cashierTab = page.locator('button:has-text("Cashier Shifts")');
      await expect(cashierTab).toHaveClass(/bg-primary/);
      
      await expect(page.locator('table')).toBeVisible();
      
      await expect(page.locator('th')).toContainText(['Cashier', 'Shift', 'Opening', 'Closing', 'Status', 'Started', 'Actions']);
      
      await expect(page.locator('select')).toBeVisible();
      await expect(page.locator('button:has-text("Today")')).toBeVisible();
      await expect(page.locator('button:has-text("7 Days")')).toBeVisible();
      await expect(page.locator('button:has-text("30 Days")')).toBeVisible();
    });

    test('Filter status Open pada Cashier Shifts', async ({ page }) => {
      await page.click('button:has-text("Cashier Shifts")');
      
      await page.selectOption('select', 'open');
      
      await page.waitForTimeout(1000);
      
      const statusBadges = page.locator('tbody span:has-text("Open")');
      await expect(statusBadges.first()).toBeVisible();
      
      const closedBadges = page.locator('tbody span:has-text("Closed")');
      await expect(closedBadges).toHaveCount(0);
    });

    test('Filter Today pada Cashier Shifts', async ({ page }) => {
      await page.click('button:has-text("Cashier Shifts")');
      
      await page.click('button:has-text("Today")');
      
      await page.waitForTimeout(1000);
      
      const todayButton = page.locator('button:has-text("Today")');
      await expect(todayButton).toHaveClass(/bg-primary/);
    });

    test('Menampilkan Force Close modal untuk shift yang open', async ({ page }) => {
      await page.click('button:has-text("Cashier Shifts")');
      
      await page.selectOption('select', 'open');
      await page.waitForTimeout(1000);
      
      const forceCloseButton = page.locator('button:has-text("Force Close")').first();
      
      if (await forceCloseButton.isVisible()) {
        await forceCloseButton.click();
        
        await expect(page.locator('h3:has-text("Force Close Shift")')).toBeVisible();
        await expect(page.locator('textarea')).toBeVisible();
        
        await expect(page.locator('text=irreversible')).toBeVisible();
        
        await page.click('button:has-text("Cancel")');
      } else {
        test.skip();
      }
    });

    test('Menampilkan error validasi saat force close tanpa notes (HTTP 422)', async ({ page }) => {
      await page.click('button:has-text("Cashier Shifts")');
      
      await page.selectOption('select', 'open');
      await page.waitForTimeout(1000);
      
      const forceCloseButton = page.locator('button:has-text("Force Close")').first();
      
      if (await forceCloseButton.isVisible()) {
        await forceCloseButton.click();
        
        await page.click('button:has-text("Force Close Shift")');
        
        const errorText = page.locator('p.text-error.font-medium').last();
        await expect(errorText).toBeVisible();
        await expect(errorText).toContainText('reason');
      } else {
        test.skip();
      }
    });

    test('Navigasi pagination pada Cashier Shifts', async ({ page }) => {
      await page.click('button:has-text("Cashier Shifts")');
      
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Showing page')).toBeVisible();
      
      const nextButton = page.locator('button:has-text("Next")');
      const prevButton = page.locator('button:has-text("Prev")');
      
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
        
        await expect(prevButton).toBeEnabled();
      }
    });

    test('Aksesibilitas: Navigasi keyboard pada tab switching', async ({ page }) => {
      await page.focus('button:has-text("Master Shifts")');
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      const cashierTab = page.locator('button:has-text("Cashier Shifts")');
      await expect(cashierTab).toHaveClass(/bg-primary/);
      
      await expect(page.locator('table')).toBeVisible();
    });

    test('Responsive: Table tetap terlihat pada viewport mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await expect(page.locator('table')).toBeVisible();
      
      const scrollContainer = page.locator('.overflow-x-auto');
      await expect(scrollContainer).toBeVisible();
      
      await expect(page.locator('button:has-text("Add New Shift")')).toBeVisible();
    });
  });

  test.describe('B. MANAGER ROLE JOURNEY (RBAC & UI Protection)', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
      
      await page.fill('input[placeholder="Enter your username"]', 'manager');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('Manager dapat mengakses Shift Management', async ({ page }) => {
      await page.goto('/shifts');
      
      await expect(page).toHaveURL(/\/shifts/);
      await expect(page.locator('h1')).toContainText('Shift Management');
      await expect(page.locator('table')).toBeVisible();
    });

    test('Manager dapat melihat dan memfilter Cashier Shifts', async ({ page }) => {
      await page.goto('/shifts');
      
      await page.click('button:has-text("Cashier Shifts")');
      
      await expect(page.locator('select')).toBeVisible();
      await expect(page.locator('button:has-text("7 Days")')).toBeVisible();
      
      await page.selectOption('select', 'open');
      await page.waitForTimeout(1000);
      
      await expect(page.locator('table')).toBeVisible();
    });

    test('Manager dapat membuka Force Close modal', async ({ page }) => {
      await page.goto('/shifts');
      
      await page.click('button:has-text("Cashier Shifts")');
      
      await page.selectOption('select', 'open');
      await page.waitForTimeout(1000);
      
      const forceCloseButton = page.locator('button:has-text("Force Close")').first();
      
      if (await forceCloseButton.isVisible()) {
        await forceCloseButton.click();
        await expect(page.locator('h3:has-text("Force Close Shift")')).toBeVisible();
        await page.click('button:has-text("Cancel")');
      } else {
        test.skip();
      }
    });
  });

  test.describe('C. CASHIER ROLE JOURNEY (Access Denied)', () => {
    
    test('Cashier tidak dapat login ke Back Office', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
      
      await page.fill('input[placeholder="Enter your username"]', 'cashier');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
      
      const errorBanner = page.locator('.bg-error\\/10');
      await expect(errorBanner).toBeVisible();
    });
  });

  test.describe('D. INVENTORY ROLE JOURNEY (Access Denied)', () => {
    
    test('Inventory dapat login tapi TIDAK dapat akses Shift Management', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
      
      await page.fill('input[placeholder="Enter your username"]', 'inventory');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');
      
      // Inventory BISA login ke dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
      
      // Coba akses shift management
      await page.goto('/shifts');
      
      // Redirect ke dashboard karena tidak punya akses
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Dashboard');
    });
  });

});