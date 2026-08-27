import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

const uniqueSessionId = Date.now().toString().slice(-5);
const testUser = {
  name: `QA Engineer ${uniqueSessionId}`,
  username: `qa_tester_${uniqueSessionId}`,
  password: 'Password123!',
};

test.describe('Alur Manajemen Pengguna (User Management E2E - Full Journey)', () => {

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      
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
      await page.goto('/users');
      await expect(page).toHaveURL(/\/users/);
      
      await expect(page.locator('table')).toBeVisible();
    });

    test('Filter pencarian mengubah URL Query Param secara dinamis (State URL Sync)', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search name or username..."]');
      const roleSelect = page.locator('select').first();

      await searchInput.fill('manager');
      await page.waitForTimeout(500); 

      expect(page.url()).toContain('search=manager');

      await roleSelect.selectOption({ label: 'Manager' });
      await page.waitForTimeout(500);
      expect(page.url()).toContain('role=manager');

      const tableBody = page.locator('tbody');
      await expect(tableBody).toContainText('manager');
    });

    test('Admin berhasil membuat user baru, menerima PIN, dan menyalin ke Clipboard', async ({ context, page }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await page.click('button:has-text("Add User")');
      await expect(page.locator('h2:has-text("Add New User")')).toBeVisible();

      await page.fill('input[placeholder="e.g. John Doe"]', testUser.name);
      await page.fill('input[placeholder="No spaces allowed"]', testUser.username);
      await page.fill('input[placeholder="Min. 8 characters"]', testUser.password);
      
      const roleSelect = page.locator('select').filter({ hasText: 'Cashier' }).first();
      await roleSelect.selectOption('cashier');

      await page.click('button:has-text("Create User")');

      const successModal = page.locator('h2:has-text("User Created!")');
      await expect(successModal).toBeVisible();

      const copyBtn = page.locator('button:has-text("Copy PIN Code")');
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();
      
      await expect(page.locator('text=Copied to Clipboard!')).toBeVisible();

      await page.click('button:has-text("Done")');

      const searchInput = page.locator('input[placeholder="Search name or username..."]');
      await searchInput.fill(testUser.username);
      await page.waitForTimeout(500);
      await expect(page.locator('tbody')).toContainText(testUser.username);
    });

    test('Menampilkan peringatan Unsaved Changes saat Admin mencoba menutup form yang sudah diisi', async ({ page }) => {
      await page.click('button:has-text("Add User")');
      await expect(page.locator('h2:has-text("Add New User")')).toBeVisible();

      const submitBtn = page.locator('button:has-text("Create User")');
      
      await expect(submitBtn).toBeDisabled(); 

      await page.fill('input[placeholder="e.g. John Doe"]', 'Data Setengah Matang');

      await page.mouse.click(10, 10); 

      await expect(page.locator('h3:has-text("Unsaved Changes")')).toBeVisible();

      await page.click('button:has-text("Discard")');
      
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    });

    test('Mendukung aksesibilitas navigasi murni menggunakan Keyboard di dalam Modal', async ({ page }) => {
      await page.click('button:has-text("Add User")');
      
      await page.waitForTimeout(400);

      await page.focus('input[placeholder="e.g. John Doe"]');
      await page.keyboard.type('Aksesibilitas User');

      await page.keyboard.press('Tab');
      await page.keyboard.type('a11y_user');

      await page.keyboard.press('Tab');
      await page.keyboard.type('rahasia123');

      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      
      const passwordInput = page.locator('input[placeholder="Min. 8 characters"]');
      await expect(passwordInput).toHaveAttribute('type', 'text');

      await page.keyboard.press('Escape');
      await expect(page.locator('h3:has-text("Unsaved Changes")')).toBeVisible();
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
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
    });

    test('UI memproteksi akun Admin agar tidak bisa diedit/dihapus oleh Manager (Badge Locked)', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search name or username..."]');
      await searchInput.fill('admin');
      await page.waitForTimeout(500);

      const adminRow = page.locator('tbody tr').first();
      await expect(adminRow).toBeVisible();

      const viewBtn = adminRow.locator('button:has-text("View")');
      await expect(viewBtn).toBeVisible();

      await expect(adminRow.locator('button:has-text("Edit")')).toHaveCount(0);
      await expect(adminRow.locator('button:has-text("Deactivate")')).toHaveCount(0);
      await expect(adminRow.locator('button:has-text("Delete")')).toHaveCount(0);

      const lockedBadge = adminRow.locator('span:has-text("Locked")');
      await expect(lockedBadge).toBeVisible();
    });

test('UI melindungi akun milik sendiri (Self-Protection) dari tombol Deactivate/Delete', async ({ page }) => {
      // Karena akun yang sedang login adalah 'manager', kita cari baris yang memiliki tombol Edit 
      // DAN TIDAK memiliki tombol Deactivate/Delete (atau langsung cari baris yang memuat teks "You").
      
      // Tunggu sampai tabel ter-render dengan sempurna
      const selfRow = page.locator('tbody tr').filter({ has: page.locator('span', { hasText: 'You' }) }).first();
      
      await expect(selfRow).toBeVisible({ timeout: 15000 });

      await expect(selfRow.locator('button:has-text("Edit")')).toBeVisible();
      await expect(selfRow.locator('button:has-text("Deactivate")')).toHaveCount(0);
      await expect(selfRow.locator('button:has-text("Delete")')).toHaveCount(0);
    });
  });

});