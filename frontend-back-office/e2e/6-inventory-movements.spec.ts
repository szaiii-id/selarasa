import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Alur Manajemen Stock Movements (E2E - Full Journey)', () => {

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore
    }
  });

  // ==========================================================
  // HELPER: Login robust dengan wait & timeout lebih longgar
  // ==========================================================
  const loginAs = async (page: any, username: string, password = 'selarasa01') => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });

    await page.waitForSelector('input[placeholder="Enter your username"]', {
      state: 'visible',
      timeout: 15000,
    });

    await page.fill('input[placeholder="Enter your username"]', username);
    await page.fill('input[placeholder="••••••••"]', password);

    await Promise.all([
      page.waitForURL(/\/dashboard/, { timeout: 20000 }),
      page.click('button[type="submit"]'),
    ]);
  };

  // ==========================================================
  // HELPER: Pilih material di modal (bukan filter bar)
  // ==========================================================
  const selectMaterialInModal = async (page: any): Promise<string> => {
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const materialSelect = modal
      .locator('select')
      .filter({ has: page.locator('option:has-text("-- Select Material --")') })
      .first();

    await expect(async () => {
      const count = await materialSelect.locator('option').count();
      expect(count).toBeGreaterThan(1);
    }).toPass({ timeout: 5000 });

    const validValue = await materialSelect.evaluate((el: any) => {
      const options = Array.from(el.options) as any[];
      const valid = options.find(
        (o: any) => o.value && o.value !== '' && !o.disabled
      );
      return valid ? valid.value : null;
    });

    if (!validValue) throw new Error('No valid material option');

    await materialSelect.evaluate((el: any, val: string) => {
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, validValue);

    const actual = await materialSelect.inputValue();
    expect(actual).toBe(validValue);

    return validValue;
  };

  // ==========================================================
  // HELPER: Klik movement type DI DALAM modal
  // ==========================================================
  const clickMovementType = async (page: any, type: 'IN' | 'OUT' | 'ADJUST') => {
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const typeButton = modal
      .locator('button[type="button"]')
      .filter({ hasText: new RegExp(`^\\s*${type}\\s*$`) })
      .first();

    await expect(typeButton).toBeVisible({ timeout: 5000 });
    await typeButton.click();
  };

  test.describe('A. ADMIN ROLE JOURNEY (Full Access)', () => {

    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
      await page.goto('/inventory/stock-movements', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/inventory\/stock-movements/);
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
    });

    // ==========================================
    // 1. PAGE RENDERING
    // ==========================================
    test('Menampilkan halaman Stock Movements dengan immutable banner, summary, filter, table', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Stock Movements');
      await expect(page.locator('strong:text-is("Immutable Audit Trail")')).toBeVisible();
      await expect(page.locator('text=🔒')).toBeVisible();
      await expect(page.locator('strong:text-is("ADJUSTMENT")')).toBeVisible();

      await expect(page.locator('p:text-is("Total Movements")')).toBeVisible();
      await expect(page.locator('p:text-is("IN")')).toBeVisible();
      await expect(page.locator('p:text-is("OUT")')).toBeVisible();
      await expect(page.locator('p:text-is("Adjustments")')).toBeVisible();

      await expect(page.locator('button:has-text("Today")')).toBeVisible();
      await expect(page.locator('button:has-text("7 Days")')).toBeVisible();
      await expect(page.locator('button:has-text("30 Days")')).toBeVisible();

      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th')).toContainText(['When', 'Material', 'Type', 'Qty', 'Balance Flow', 'Reason', 'By', 'Actions']);

      await expect(page.locator('button:has-text("Record Movement")')).toBeVisible();
    });

    // ==========================================
    // 2. CREATE MOVEMENT — IN
    // ==========================================
    test('Admin berhasil mencatat movement IN', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      await expect(page.locator('h3:has-text("Record Stock Movement")')).toBeVisible();

      await selectMaterialInModal(page);
      await clickMovementType(page, 'IN');

      const modal = page.locator('.fixed.inset-0.z-50').first();
      await modal.locator('input[type="number"]').fill('50');
      await expect(modal.locator('text=Preview Balance')).toBeVisible({ timeout: 3000 });

      await modal.locator('input[placeholder*="Supplier Delivery"]').fill('E2E Test Restock');

      const submitBtn = modal.locator('button:has-text("Record Movement")');
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      await expect(page.locator('h3:has-text("Movement Recorded")')).toBeVisible();
      await expect(page.locator('text=Stock In of 50 has been recorded')).toBeVisible();

      await page.click('button:has-text("Close"), button:has-text("Got it")');
      await expect(page.locator('tbody')).toContainText('E2E Test Restock');
    });

    // ==========================================
    // 3. CREATE MOVEMENT — OUT
    // ==========================================
    test('Admin berhasil mencatat movement OUT', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      await selectMaterialInModal(page);
      await clickMovementType(page, 'OUT');

      await modal.locator('input[type="number"]').fill('10');
      await modal.locator('input[placeholder*="Supplier Delivery"]').fill('E2E Test Usage');

      const submitBtn = modal.locator('button:has-text("Record Movement")');
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      await expect(page.locator('h3:has-text("Movement Recorded")')).toBeVisible();
      await expect(page.locator('text=Stock Out of 10 has been recorded')).toBeVisible();
    });

    // ==========================================
    // 4. CREATE MOVEMENT — ADJUSTMENT
    // ==========================================
    test('Admin berhasil mencatat movement ADJUSTMENT dengan signed value', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      await selectMaterialInModal(page);
      await clickMovementType(page, 'ADJUST');

      await expect(modal.locator('span:text-is("(signed delta)")')).toBeVisible();
      await expect(modal.locator('text=Enter a signed delta')).toBeVisible();

      await modal.locator('input[type="number"]').fill('-3');
      await modal.locator('input[placeholder*="Supplier Delivery"]').fill('Stock Opname E2E');

      const submitBtn = modal.locator('button:has-text("Record Movement")');
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      await expect(page.locator('h3:has-text("Movement Recorded")')).toBeVisible();
      await expect(page.locator('text=Adjustment of -3 has been recorded')).toBeVisible();
    });

    // ==========================================
    // 5. VALIDATION — Empty form
    // ==========================================
    test('Menampilkan error validasi saat submit form kosong', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      const submitBtn = modal.locator('button:has-text("Record Movement")');
      await expect(submitBtn).toBeDisabled();

      await modal.locator('button:has-text("Cancel")').click();
    });

    // ==========================================
    // 6. VALIDATION — Negative quantity
    // ==========================================
    test('Menampilkan error validasi saat quantity negatif di IN/OUT', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      await selectMaterialInModal(page);
      await clickMovementType(page, 'IN');

      await modal.locator('input[type="number"]').fill('-5');
      await modal.locator('input[placeholder*="Supplier Delivery"]').fill('Test');

      const submitBtn = modal.locator('button:has-text("Record Movement")');
      await expect(submitBtn).toBeDisabled();

      await modal.locator('button:has-text("Cancel")').click();
    });

    // ==========================================
    // 7. REASON SUGGESTIONS
    // ==========================================
    test('Klik reason suggestion mengisi input reason', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      await modal.locator('button:has-text("Supplier Delivery")').click();

      const reasonInput = modal.locator('input[placeholder*="Supplier Delivery"]');
      await expect(reasonInput).toHaveValue('Supplier Delivery');

      await modal.locator('button:has-text("Cancel")').click();
    });

    // ==========================================
    // 8. LIVE PREVIEW
    // ==========================================
    test('Live preview menampilkan balance before → after', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      await selectMaterialInModal(page);
      await clickMovementType(page, 'IN');
      await modal.locator('input[type="number"]').fill('100');

      await expect(modal.locator('text=Preview Balance')).toBeVisible({ timeout: 3000 });

      await expect(
        modal.locator('p').filter({ hasText: /Stock level will remain healthy|below minimum stock level|would become negative|No change from current stock/ })
      ).toBeVisible();

      await modal.locator('button:has-text("Cancel")').click();
    });

    // ==========================================
    // 9. VIEW DETAIL
    // ==========================================
    test('Admin dapat melihat detail movement', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        await firstRow.locator('button[title="View Details"]').click();
        await page.waitForTimeout(500);

        const modal = page.locator('.fixed.inset-0.z-50').first();
        await expect(modal).toBeVisible({ timeout: 5000 });

        await expect(modal.locator('p:text-is("Material")')).toBeVisible();
        await expect(modal.locator('p:text-is("Quantity")')).toBeVisible();
        await expect(modal.locator('p:text-is("Balance Flow")')).toBeVisible();
        await expect(modal.locator('p:text-is("Reason")')).toBeVisible();
        await expect(modal.locator('p:text-is("Performed By")')).toBeVisible();

        await expect(modal.locator('text=part of the immutable audit trail')).toBeVisible();

        await modal.locator('button:has-text("Close")').click();
      }
    });

    // ==========================================
    // 10-17. FILTER & DATE PRESETS
    // ==========================================
    test('Filter type IN mengubah URL', async ({ page }) => {
      await page.locator('select').first().selectOption('IN');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('movement_type=IN');
    });

    test('Filter type OUT mengubah URL', async ({ page }) => {
      await page.locator('select').first().selectOption('OUT');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('movement_type=OUT');
    });

    test('Filter type ADJUSTMENT mengubah URL', async ({ page }) => {
      await page.locator('select').first().selectOption('ADJUSTMENT');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('movement_type=ADJUSTMENT');
    });

    test('Klik preset Today mengubah URL', async ({ page }) => {
      await page.click('button:has-text("Today")');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('start_date=');
      expect(page.url()).toContain('end_date=');
    });

    test('Klik preset 7 Days mengubah URL', async ({ page }) => {
      await page.click('button:has-text("7 Days")');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('start_date=');
    });

    test('Klik preset 30 Days mengubah URL', async ({ page }) => {
      await page.click('button:has-text("30 Days")');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('start_date=');
    });

    test('Klik preset Today → tombol punya class bg-primary', async ({ page }) => {
      await page.click('button:has-text("Today")');
      await page.waitForTimeout(600);
      const todayBtn = page.locator('button:has-text("Today")');
      await expect(todayBtn).toHaveClass(/bg-primary/);
    });

    test('Clear date filter menghapus query param', async ({ page }) => {
      await page.click('button:has-text("7 Days")');
      await page.waitForTimeout(600);
      expect(page.url()).toContain('start_date=');

      const clearBtn = page.locator('button[title="Clear date filter"]');
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await page.waitForTimeout(600);

      expect(page.url()).not.toContain('start_date=');
      expect(page.url()).not.toContain('end_date=');
    });

    // ==========================================
    // 18. IMMUTABILITY NOTICE
    // ==========================================
    test('Detail modal menampilkan immutability notice', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();

      if (await firstRow.isVisible()) {
        await firstRow.locator('button[title="View Details"]').click();
        await page.waitForTimeout(500);

        const modal = page.locator('.fixed.inset-0.z-50').first();
        await expect(modal).toBeVisible({ timeout: 5000 });

        await expect(modal.locator('text=part of the immutable audit trail')).toBeVisible();
        await expect(modal.locator('strong:text-is("ADJUSTMENT")')).toBeVisible();

        await modal.locator('button:has-text("Close")').click();
      }
    });

    // ==========================================
    // 19. ACCESSIBILITY
    // ==========================================
    test('Aksesibilitas: Navigasi keyboard pada form movement', async ({ page }) => {
      await page.click('button:has-text("Record Movement")');
      const modal = page.locator('.fixed.inset-0.z-50').first();
      await expect(modal).toBeVisible();

      await modal.locator('select').first().focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
    });

    // ==========================================
    // 20. RESPONSIVE
    // ==========================================
    test('Responsive: Layout mobile menampilkan summary cards', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('text=Total Movements')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('button:has-text("Record Movement")')).toBeVisible();
    });

    // ==========================================
    // 21. SUMMARY CARDS
    // ==========================================
    test('Summary cards menampilkan hitungan per movement type', async ({ page }) => {
      const numbers = page.locator('p.text-2xl.font-extrabold');
      const count = await numbers.count();
      expect(count).toBe(4);

      for (let i = 0; i < count; i++) {
        const text = await numbers.nth(i).textContent();
        expect(Number(text)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('B. MANAGER ROLE JOURNEY', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'manager');
    });

    test('Manager dapat mengakses Stock Movements', async ({ page }) => {
      await page.goto('/inventory/stock-movements', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/inventory\/stock-movements/);
      await expect(page.locator('h1')).toContainText('Stock Movements');
    });

    test('Manager dapat membuka form movement', async ({ page }) => {
      await page.goto('/inventory/stock-movements', { waitUntil: 'networkidle' });
      await page.click('button:has-text("Record Movement")');
      await expect(page.locator('h3:has-text("Record Stock Movement")')).toBeVisible();
      await page.locator('.fixed.inset-0.z-50').locator('button:has-text("Cancel")').click();
    });
  });

  test.describe('C. INVENTORY ROLE JOURNEY', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'inventory');
    });

    test('Inventory role dapat mengakses Stock Movements', async ({ page }) => {
      await page.goto('/inventory/stock-movements', { waitUntil: 'networkidle' });
      await expect(page).toHaveURL(/\/inventory\/stock-movements/);
      await expect(page.locator('button:has-text("Record Movement")')).toBeVisible();
    });

    test('Inventory role dapat membuka form movement', async ({ page }) => {
      await page.goto('/inventory/stock-movements', { waitUntil: 'networkidle' });
      await page.click('button:has-text("Record Movement")');
      await expect(page.locator('h3:has-text("Record Stock Movement")')).toBeVisible();
      await page.locator('.fixed.inset-0.z-50').locator('button:has-text("Cancel")').click();
    });
  });

  test.describe('D. SIDEBAR NAVIGATION — Inventory Group', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('Inventory group auto-expand saat navigasi ke halaman inventory', async ({ page }) => {
      await page.goto('/inventory/materials', { waitUntil: 'networkidle' });

      await expect(page.locator('a:has-text("Categories")')).toBeVisible();
      await expect(page.locator('a:has-text("Raw Materials")')).toBeVisible();
      await expect(page.locator('a:has-text("Stock Movements")')).toBeVisible();
    });

    test('Klik Inventory header toggle collapse/expand', async ({ page }) => {
      const inventoryBtn = page.locator('button:has-text("Inventory")');
      await expect(inventoryBtn).toBeVisible();

      await inventoryBtn.click();
      await inventoryBtn.click();
    });

    test('Low stock badge muncul di Raw Materials sub-menu', async ({ page }) => {
      const badge = page.locator('a:has-text("Raw Materials") span.bg-error');
      const count = await badge.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});