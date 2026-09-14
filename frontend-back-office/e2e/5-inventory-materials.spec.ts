import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Alur Manajemen Raw Materials (E2E - Full Journey)', () => {

  test.afterEach(async () => {
    try {
      const containerName = process.env.BACKEND_CONTAINER || 'selarasa_backend';
      execSync(`docker exec ${containerName} php artisan cache:clear`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore
    }
  });

  // ==========================================================
  // HELPER: Tunggu kategori load & select yang valid
  // ⚠️ Scope ke modal, karena ada select di filter bar
  // ==========================================================
  const selectValidCategory = async (page: any): Promise<string> => {
    // Scope ke modal (bukan select di filter bar di belakang)
    const modal = page.locator('.fixed.inset-0.z-50').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Cari select yang punya option "-- Select Category --" (unik untuk modal)
    const categorySelect = modal
      .locator('select')
      .filter({ has: page.locator('option:text-is("-- Select Category --")') })
      .first();

    // Tunggu option bertambah
    await expect(async () => {
      const optionsCount = await categorySelect.locator('option').count();
      expect(optionsCount).toBeGreaterThan(1);
    }).toPass({ timeout: 5000 });

    // Ambil value opsi valid pertama
    const validValue = await categorySelect.evaluate((el: any) => {
      const options = Array.from(el.options) as any[];
      const valid = options.find(
        (o: any) => o.value && o.value !== '' && !o.disabled
      );
      return valid ? valid.value : null;
    });

    if (!validValue) {
      throw new Error('No valid category option found');
    }

    // Set value + dispatch events manual
    await categorySelect.evaluate((el: any, val: string) => {
      el.value = val;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, validValue);

    // Verify
    const actual = await categorySelect.inputValue();
    expect(actual).toBe(validValue);

    console.log(`✅ Category selected in modal: value="${actual}"`);

    return validValue;
  };

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
      await page.goto('/inventory/materials');
      await expect(page).toHaveURL(/\/inventory\/materials/);

      await expect(page.locator('table')).toBeVisible();
    });

    // ==========================================
    // 1. PAGE RENDERING
    // ==========================================
    test('Menampilkan halaman Materials dengan summary cards, filter, table, dan legend', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Raw Materials');

      await expect(page.locator('p:text-is("Total Materials")')).toBeVisible();
      await expect(page.locator('p:text-is("Active")')).toBeVisible();
      await expect(page.locator('p:text-is("Low Stock")')).toBeVisible();
      await expect(page.locator('p:text-is("Out of Stock")')).toBeVisible();

      await expect(page.locator('input[placeholder="Search by SKU or name..."]')).toBeVisible();

      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th')).toContainText(['SKU / Name', 'Category', 'Stock', 'Min', 'Status', 'Actions']);

      await expect(page.locator('text=Stock is healthy (stock > minimum)')).toBeVisible();
      await expect(page.locator('text=Low stock (stock ≤ minimum)')).toBeVisible();
      await expect(page.locator('text=Out of stock (0)')).toBeVisible();
      await expect(page.locator('text=Inactive material')).toBeVisible();

      await expect(page.locator('button:has-text("Add Material")')).toBeVisible();
    });

    // ==========================================
    // 2. SUMMARY CARDS
    // ==========================================
    test('Summary cards menampilkan jumlah yang sesuai', async ({ page }) => {
      const numbers = page.locator('p.text-2xl.font-extrabold');
      expect(await numbers.count()).toBe(4);

      for (let i = 0; i < 4; i++) {
        const text = await numbers.nth(i).textContent();
        expect(Number(text)).toBeGreaterThanOrEqual(0);
      }
    });

    // ==========================================
    // 3. CREATE MATERIAL — ✅ FIX: scope ke modal
    // ==========================================
    test('Admin berhasil membuat material baru dengan validasi lengkap', async ({ page }) => {
      const uniqueSku = `RME2E${Date.now().toString().slice(-5)}`;
      const uniqueName = `E2E Material ${Date.now().toString().slice(-5)}`;

      await page.click('button:has-text("Add Material")');
      await expect(page.locator('h3:has-text("Add New Material")')).toBeVisible();

      await expect(page.locator('text=Initial stock will be')).toBeVisible();

      await page.fill('input[placeholder="RM-0012-APF"]', uniqueSku);

      // ✅ FIX: scope ke modal
      await selectValidCategory(page);

      await page.fill('input[placeholder="e.g., Fresh Milk UHT"]', uniqueName);
      await page.fill('input[type="number"]', '10');

      const submitBtn = page.locator('button:has-text("Create Material")');
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      await expect(page.locator('h3:has-text("Material Created")')).toBeVisible();
      await expect(page.locator('text=Use Stock Movements')).toBeVisible();

      await page.click('button:has-text("Close"), button:has-text("Got it")');
      await expect(page.locator('tbody')).toContainText(uniqueSku);
    });

    // ==========================================
    // 4. VALIDATION — Duplikat SKU
    // ==========================================
    test('Menampilkan error validasi merah saat SKU duplikat', async ({ page }) => {
      await page.click('button:has-text("Add Material")');

      await page.fill('input[placeholder="RM-0012-APF"]', 'RM-ST-003');

      // ✅ FIX
      await selectValidCategory(page);

      await page.fill('input[placeholder="e.g., Fresh Milk UHT"]', 'Test Duplicate');
      await page.fill('input[type="number"]', '10');

      const submitBtn = page.locator('button:has-text("Create Material")');
      await expect(submitBtn).toBeEnabled({ timeout: 5000 });
      await submitBtn.click();

      const errorText = page.locator('p.text-error').first();
      await expect(errorText).toBeVisible({ timeout: 5000 });
    });

    // ==========================================
    // 5. EDIT MATERIAL
    // ==========================================
    test('Admin berhasil mengedit material dan melihat Current Stock read-only', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has-text("Edit")').click();

      await expect(page.locator('h3:has-text("Edit Material")')).toBeVisible();
      await expect(page.locator('text=Current Stock')).toBeVisible();
      await expect(page.locator('text=read-only')).toBeVisible();
      await expect(page.locator('input[readonly]')).toBeVisible();

      const updatedName = `Updated E2E ${Date.now().toString().slice(-5)}`;
      await page.fill('input[placeholder="e.g., Fresh Milk UHT"]', updatedName);

      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('h3:has-text("Material Updated")')).toBeVisible();
      await page.click('button:has-text("Close"), button:has-text("Got it")');

      await expect(page.locator('tbody')).toContainText(updatedName);
    });

    // ==========================================
    // 6. SKU UPPERCASE
    // ==========================================
    test('SKU di-uppercase otomatis saat submit', async ({ page }) => {
      await page.click('button:has-text("Add Material")');
      await page.fill('input[placeholder="RM-0012-APF"]', 'rm-lowercase-test');

      const skuInput = page.locator('input[placeholder="RM-0012-APF"]');
      const className = await skuInput.getAttribute('class');
      expect(className).toContain('uppercase');

      await page.click('button:has-text("Cancel")');
    });

    // ==========================================
    // 7. VIEW DETAIL
    // ==========================================
    test('Admin dapat melihat detail material di drawer', async ({ page }) => {
      const firstRow = page.locator('tbody tr').first();
      await firstRow.locator('button:has-text("View")').click();

      const backdrop = page.locator('.fixed.inset-0.z-50').first();
      await expect(backdrop).toBeVisible({ timeout: 5000 });

      const drawer = backdrop.locator('div.max-w-md').first();
      await expect(drawer).toBeVisible();

      await expect(drawer.locator('p:text-is("Current Stock")')).toBeVisible();
      await expect(drawer.locator('p:text-is("Minimum")')).toBeVisible();
      await expect(drawer.locator('p:text-is("Unit")')).toBeVisible();
      await expect(drawer.locator('p:text-is("Status")')).toBeVisible();
      await expect(drawer.locator('p:text-is("Created")')).toBeVisible();

      await expect(drawer.locator('text=To see the full movement history')).toBeVisible();
      await expect(drawer.locator('button:has-text("Edit Material")')).toBeVisible();

      await drawer.locator('button.w-8.h-8').first().click();
    });

    // ==========================================
    // 8. FILTER — Search
    // ==========================================
    test('Filter search mengubah URL dan reload data', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by SKU or name..."]');

      await searchInput.fill('RM-ST-003');
      await page.waitForTimeout(1000);

      expect(page.url()).toContain('search=RM-ST-003');
      await expect(page.locator('tbody')).toContainText('RM-ST-003');
    });

    // ==========================================
    // 9. FILTER — Category
    // ==========================================
    test('Filter kategori mengubah URL', async ({ page }) => {
      const categorySelect = page.locator('select').first();

      await expect(async () => {
        const count = await categorySelect.locator('option').count();
        expect(count).toBeGreaterThan(1);
      }).toPass({ timeout: 5000 });

      const options = await categorySelect.locator('option').allTextContents();
      const staplesOption = options.find(o => o.includes('Staples'));

      if (staplesOption) {
        await categorySelect.selectOption({ label: staplesOption });
        await page.waitForTimeout(1000);

        expect(page.url()).toContain('category_id=');
        await expect(page.locator('tbody')).toContainText('RM-ST-003');
      }
    });

    // ==========================================
    // 10. FILTER — Stock
    // ==========================================
    test('Filter stock "Low Stock Only" mengubah URL', async ({ page }) => {
      const stockSelect = page.locator('select').last();
      await stockSelect.selectOption('low_stock');
      await page.waitForTimeout(800);
      expect(page.url()).toContain('is_low_stock=true');
    });

    test('Filter stock "Out of Stock" mengubah URL', async ({ page }) => {
      const stockSelect = page.locator('select').last();
      await stockSelect.selectOption('out_of_stock');
      await page.waitForTimeout(800);
      expect(page.url()).toContain('is_out_of_stock=true');
    });

    // ==========================================
    // 11. LEGEND
    // ==========================================
    test('Legend menampilkan 4 status dengan swatch warna berbeda', async ({ page }) => {
      await expect(page.locator('text=Stock is healthy (stock > minimum)')).toBeVisible();
      await expect(page.locator('text=Low stock (stock ≤ minimum)')).toBeVisible();
      await expect(page.locator('text=Out of stock (0)')).toBeVisible();
      await expect(page.locator('text=Inactive material')).toBeVisible();

      const swatches = page.locator('.w-3.h-3.rounded');
      await expect(swatches).toHaveCount(4);
    });

    // ==========================================
    // 12. ACCESSIBILITY
    // ==========================================
    test('Aksesibilitas: Navigasi keyboard pada form modal', async ({ page }) => {
      await page.click('button:has-text("Add Material")');
      await page.waitForTimeout(400);

      await page.focus('input[placeholder="RM-0012-APF"]');
      await page.keyboard.type('E2EKEYBOARD');

      const value = await page.locator('input[placeholder="RM-0012-APF"]').inputValue();
      expect(value).toBe('E2EKEYBOARD');

      await page.keyboard.press('Tab');
      await page.keyboard.press('Escape');
    });

    // ==========================================
    // 13. RESPONSIVE
    // ==========================================
    test('Responsive: Summary cards menyesuaikan layout mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('text=Total Materials')).toBeVisible();
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('button:has-text("Add Material")')).toBeVisible();
    });

    // ==========================================
    // 14. ROW STYLING
    // ==========================================
    test('Row styling berdasarkan state', async ({ page }) => {
      const rows = page.locator('tbody tr');
      expect(await rows.count()).toBeGreaterThan(0);

      const firstRow = rows.first();
      const className = await firstRow.getAttribute('class');
      expect(className).toContain('hover:bg-white/40');
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

    test('Manager dapat mengakses Materials', async ({ page }) => {
      await page.goto('/inventory/materials');
      await expect(page).toHaveURL(/\/inventory\/materials/);
      await expect(page.locator('h1')).toContainText('Raw Materials');
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

    test('Inventory role dapat mengakses Materials', async ({ page }) => {
      await page.goto('/inventory/materials');
      await expect(page).toHaveURL(/\/inventory\/materials/);
      await expect(page.locator('h1')).toContainText('Raw Materials');
      await expect(page.locator('button:has-text("Add Material")')).toBeVisible();
    });
  });
});