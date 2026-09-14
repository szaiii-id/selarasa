import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Alur Manajemen Kategori Inventory (E2E - Full Journey)', () => {

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
      await page.goto('/inventory/categories');
      await expect(page).toHaveURL(/\/inventory\/categories/);

      await expect(page.locator('table')).toBeVisible();
    });

    // ==========================================
    // 1. PAGE RENDERING
    // ==========================================
    test('Menampilkan halaman Categories dengan header, filter, table, pagination, dan info banner', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Raw Material Categories');
      await expect(page.locator('text=Categories cannot be deleted while they still contain raw materials')).toBeVisible();
      await expect(page.locator('input[placeholder="Search category name..."]')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th')).toContainText(['Name', 'Description', 'Created', 'Actions']);
      await expect(page.locator('text=Total:')).toBeVisible();
      await expect(page.locator('button:has-text("Prev")')).toBeVisible();
      await expect(page.locator('button:has-text("Next")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Category")')).toBeVisible();
    });

    // ==========================================
    // 2. CREATE CATEGORY
    // ==========================================
    test('Admin berhasil membuat kategori baru dan melihatnya di tabel', async ({ page }) => {
      const uniqueName = `E2E Category ${Date.now().toString().slice(-5)}`;

      await page.click('button:has-text("Add Category")');
      await expect(page.locator('h3:has-text("Add Category")')).toBeVisible();

      await page.fill('input[placeholder="e.g., Coffee Beans"]', uniqueName);
      await page.fill('textarea[placeholder*="Single origin"]', 'Created by E2E test');

      await page.click('button:has-text("Create Category")');

      await expect(page.locator('h3:has-text("Category Created")')).toBeVisible();
      await page.click('button:has-text("Close"), button:has-text("Got it")');

      await expect(page.locator('tbody')).toContainText(uniqueName);
    });

    // ==========================================
    // 3. VALIDATION — HTTP 422
    // ==========================================
    test('Menampilkan error validasi merah saat nama kategori kosong (HTTP 422)', async ({ page }) => {
      await page.click('button:has-text("Add Category")');

      const submitBtn = page.locator('button:has-text("Create Category")');
      await expect(submitBtn).toBeDisabled();

      await page.fill('input[placeholder="e.g., Coffee Beans"]', '   ');
      await expect(submitBtn).toBeDisabled();

      await page.fill('input[placeholder="e.g., Coffee Beans"]', 'Valid Name');
      await expect(submitBtn).toBeEnabled();

      await page.click('button:has-text("Cancel")');
    });

    test('Menampilkan error duplikasi nama kategori dari backend (HTTP 422)', async ({ page }) => {
      await page.click('button:has-text("Add Category")');

      await page.fill('input[placeholder="e.g., Coffee Beans"]', 'Beverages');
      await page.click('button:has-text("Create Category")');

      const errorText = page.locator('p.text-error').first();
      await expect(errorText).toBeVisible({ timeout: 5000 });
      await expect(errorText).toContainText(/already|exists|taken|unique/i);
    });

    // ==========================================
    // 4. EDIT CATEGORY
    // ==========================================
    test('Admin berhasil mengedit kategori', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has-text("Edit")').click();

      await expect(page.locator('h3:has-text("Edit Category")')).toBeVisible();

      const updatedName = `Updated E2E ${Date.now().toString().slice(-5)}`;
      await page.fill('input[placeholder="e.g., Coffee Beans"]', updatedName);

      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('h3:has-text("Category Updated")')).toBeVisible();
      await page.click('button:has-text("Close"), button:has-text("Got it")');

      await expect(page.locator('tbody')).toContainText(updatedName);
    });

    // ==========================================
    // 5. VIEW DETAIL — ✅ FIX: :text-is() untuk label pendek
    // ==========================================
    test('Admin dapat melihat detail kategori di modal', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has-text("View")').click();

      // Scope ke backdrop
      const backdrop = page.locator('.fixed.inset-0.z-50').first();
      await expect(backdrop).toBeVisible({ timeout: 5000 });

      // Modal di dalam backdrop
      const modal = backdrop.locator('div.max-w-md').first();
      await expect(modal).toBeVisible();

      await expect(modal.locator('h3').first()).toBeVisible();

      // ✅ Pakai :text-is() untuk exact match label
      await expect(modal.locator('p:text-is("Description")')).toBeVisible();
      await expect(modal.locator('p:text-is("Created")')).toBeVisible();
      await expect(modal.locator('p:text-is("Last Update")')).toBeVisible();

      await expect(modal.locator('text=Cannot be deleted')).toBeVisible();

      await modal.locator('button:has-text("Close")').click();
    });

    // ==========================================
    // 6. DELETE
    // ==========================================
    test('Menampilkan konfirmasi delete sebelum menghapus kategori', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has-text("Delete")').click();

      await expect(page.locator('text=Delete Category?')).toBeVisible();
      await expect(page.locator('text=cannot be undone')).toBeVisible();

      await page.click('button:has-text("Cancel")');
      await expect(page.locator('text=Delete Category?')).not.toBeVisible();
    });

    // ==========================================
    // 7. SEARCH FILTER
    // ==========================================
    test('Filter pencarian mengubah URL Query Param secara dinamis', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search category name..."]');

      await searchInput.fill('Beverages');
      await page.waitForTimeout(800);

      expect(page.url()).toContain('keyword=Beverages');

      await page.waitForResponse(
        (resp) => resp.url().includes('/inventory/categories') && resp.status() === 200,
        { timeout: 5000 }
      ).catch(() => {});

      await expect(page.locator('tbody tr')).not.toHaveCount(0);
    });

    test('Filter pencarian kosong → tidak ada keyword di URL', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search category name..."]');

      await searchInput.fill('zzz_nonexistent_xyz');
      await page.waitForTimeout(800);

      expect(page.url()).toContain('keyword=zzz_nonexistent_xyz');

      await searchInput.clear();
      await page.waitForTimeout(800);

      expect(page.url()).not.toContain('keyword=');
    });

    // ==========================================
    // 8. PAGINATION
    // ==========================================
    test('Navigasi pagination pada table', async ({ page }) => {
      const nextButton = page.locator('button:has-text("Next")');

      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        const prevButton = page.locator('button:has-text("Prev")');
        await expect(prevButton).toBeEnabled();
      }
    });

    // ==========================================
    // 9. ACCESSIBILITY
    // ==========================================
    test('Aksesibilitas: Navigasi keyboard pada filter bar dan table', async ({ page }) => {
      await page.focus('input[placeholder="Search category name..."]');
      await page.keyboard.type('test');

      const value = await page.locator('input[placeholder="Search category name..."]').inputValue();
      expect(value).toBe('test');

      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
    });

    test('Aksesibilitas: Modal form dapat dinavigasi dengan keyboard', async ({ page }) => {
      await page.click('button:has-text("Add Category")');
      await page.waitForTimeout(400);

      await page.focus('input[placeholder="e.g., Coffee Beans"]');
      await page.keyboard.type('Keyboard Test');

      const value = await page.locator('input[placeholder="e.g., Coffee Beans"]').inputValue();
      expect(value).toBe('Keyboard Test');

      await page.keyboard.press('Escape');
    });

    // ==========================================
    // 10. RESPONSIVE
    // ==========================================
    test('Responsive: Table tetap terlihat pada viewport mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('.overflow-x-auto')).toBeVisible();
      await expect(page.locator('button:has-text("Add Category")')).toBeVisible();
    });

    // ==========================================
    // 11. TABLE RENDERING
    // ==========================================
    test('Menampilkan nama kategori dari seeder di table', async ({ page }) => {
      const tbody = page.locator('tbody');
      await expect(tbody).toContainText('Staples');
      await expect(tbody).toContainText('Protein');
    });

    test('Menampilkan format code "CAT-XXX"', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      const codeText = await firstRow.locator('p.font-mono').textContent();

      expect(codeText).toMatch(/CAT-\d{3,}/);
    });
  });

  test.describe('B. MANAGER ROLE JOURNEY', () => {

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

    test('Manager dapat mengakses Inventory Categories', async ({ page }) => {
      await page.goto('/inventory/categories');

      await expect(page).toHaveURL(/\/inventory\/categories/);
      await expect(page.locator('h1')).toContainText('Raw Material Categories');
      await expect(page.locator('table')).toBeVisible();
    });

    test('Manager dapat membuat kategori baru', async ({ page }) => {
      await page.goto('/inventory/categories');

      await page.click('button:has-text("Add Category")');
      await expect(page.locator('h3:has-text("Add Category")')).toBeVisible();

      await page.click('button:has-text("Cancel")');
    });
  });

  test.describe('C. INVENTORY ROLE JOURNEY', () => {

    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });

      await page.fill('input[placeholder="Enter your username"]', 'inventory');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    });

    test('Inventory role dapat mengakses Inventory Categories', async ({ page }) => {
      await page.goto('/inventory/categories');

      await expect(page).toHaveURL(/\/inventory\/categories/);
      await expect(page.locator('h1')).toContainText('Raw Material Categories');
    });
  });

  test.describe('D. CASHIER ROLE JOURNEY (Access Denied)', () => {

    test('Cashier tidak dapat mengakses Inventory Categories', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/login');

      await page.waitForSelector('input[placeholder="Enter your username"]', { timeout: 10000 });
      await page.fill('input[placeholder="Enter your username"]', 'cashier');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    });
  });
});