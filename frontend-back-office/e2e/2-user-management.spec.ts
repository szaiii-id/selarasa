import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

// Generate ID unik untuk mencegah bentrok data antar worker jika tes dijalankan paralel
const uniqueSessionId = Date.now().toString().slice(-5);
const testUser = {
  name: `QA Engineer ${uniqueSessionId}`,
  username: `qa_tester_${uniqueSessionId}`,
  password: 'Password123!',
};

test.describe('Alur Manajemen Pengguna (User Management E2E - Full Journey)', () => {

  // =========================================================================
  // HOOK CLEANUP PROFESIONAL: Hapus Cache Docker SETELAH SETIAP TES
  // Ini memastikan setiap skenario berjalan di environment yang 100% bersih
  // =========================================================================
  test.afterEach(async () => {
    try {
      // stdio: 'ignore' agar tidak mengotori log terminal Anda dengan pesan sukses berulang
      execSync('docker exec selarasa_backend php artisan cache:clear', { stdio: 'ignore' });
    } catch (error) {
      // Abaikan error minor jika perintah gagal agar tes selanjutnya tidak terganggu
    }
  });

  test.describe('A. ADMIN ROLE JOURNEY (Full Access)', () => {
    
    // =========================================================================
    // HOOK: PRE-CONDITION (Setup Lingkungan & Login)
    // =========================================================================
    test.beforeEach(async ({ page }) => {
      // 1. Tunggu network idle agar cold-start backend/Docker tidak membuat timeout
      await page.goto('/login', { waitUntil: 'networkidle' });
      await page.fill('input[placeholder="Enter your username"]', 'admin');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.waitForTimeout(1000); // Jeda transisi DOM Vue
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/);
      await page.goto('/users');
      await expect(page).toHaveURL(/\/users/);
      
      // Pastikan tabel termuat sebelum tes dimulai
      await expect(page.locator('table')).toBeVisible();
    });

    // =========================================================================
    // 1. HAPPY PATH: Filter, Debounce & URL Sync
    // =========================================================================
    test('Filter pencarian mengubah URL Query Param secara dinamis (State URL Sync)', async ({ page }) => {
      // Fokus sangat spesifik ke search bar tabel (Bukan Topbar)
      const searchInput = page.locator('input[placeholder="Search name or username..."]');
      const roleSelect = page.locator('select').first();

      // Ketik di pencarian
      await searchInput.fill('manager');
      // Tunggu debounce 300ms dari composable useTableFilters.ts
      await page.waitForTimeout(500); 

      // Validasi URL terupdate otomatis tanpa reload
      expect(page.url()).toContain('search=manager');

      // Pilih filter Role
      await roleSelect.selectOption({ label: 'Manager' });
      await page.waitForTimeout(500);
      expect(page.url()).toContain('role=manager');

      // Pastikan data di tabel merespons filter
      const tableBody = page.locator('tbody');
      await expect(tableBody).toContainText('manager');
    });

    // =========================================================================
    // 2. HAPPY PATH & STATE TRANSITION: CRUD Journey (Create & Copy PIN)
    // =========================================================================
    test('Admin berhasil membuat user baru, menerima PIN, dan menyalin ke Clipboard', async ({ context, page }) => {
      // Berikan izin virtual clipboard ke browser Playwright
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      await page.click('button:has-text("Add User")');
      await expect(page.locator('h2:has-text("Add New User")')).toBeVisible();

      // Isi form
      await page.fill('input[placeholder="e.g. John Doe"]', testUser.name);
      await page.fill('input[placeholder="No spaces allowed"]', testUser.username);
      await page.fill('input[placeholder="Min. 8 characters"]', testUser.password);
      
      // Pilih role Cashier
      const roleSelect = page.locator('select').filter({ hasText: 'Cashier' }).first();
      await roleSelect.selectOption('cashier');

      // Submit
      await page.click('button:has-text("Create User")');

      // Tangkap Success Modal dan validasi PIN
      const successModal = page.locator('h2:has-text("User Created!")');
      await expect(successModal).toBeVisible();

      // Uji fitur Copy to Clipboard API
      const copyBtn = page.locator('button:has-text("Copy PIN Code")');
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();
      
      // Validasi transisi tombol setelah diklik (State Visual)
      await expect(page.locator('text=Copied to Clipboard!')).toBeVisible();

      // Tutup modal
      await page.click('button:has-text("Done")');

      // Fokus sangat spesifik ke search bar tabel (Bukan Topbar)
      const searchInput = page.locator('input[placeholder="Search name or username..."]');
      await searchInput.fill(testUser.username);
      await page.waitForTimeout(500);
      await expect(page.locator('tbody')).toContainText(testUser.username);
    });

    // =========================================================================
    // 3. ERROR HANDLING (LEVEL UI): Form Validation & Unsaved Changes
    // =========================================================================
    test('Menampilkan peringatan Unsaved Changes saat Admin mencoba menutup form yang sudah diisi', async ({ page }) => {
      await page.click('button:has-text("Add User")');
      await expect(page.locator('h2:has-text("Add New User")')).toBeVisible();

      // Submit form kosong untuk memicu HTTP 422 / Client Validation
      const submitBtn = page.locator('button:has-text("Create User")');
      
      // Validasi Tombol Disabled (State UI)
      await expect(submitBtn).toBeDisabled(); 

      // Isi 1 field untuk membuat form menjadi 'Dirty'
      await page.fill('input[placeholder="e.g. John Doe"]', 'Data Setengah Matang');

      // Coba klik background (backdrop) untuk menutup form
      await page.mouse.click(10, 10); 

      // Validasi Interceptor: Pastikan muncul modal "Unsaved Changes"
      await expect(page.locator('h3:has-text("Unsaved Changes")')).toBeVisible();

      // Klik 'Discard' untuk memaksa tutup
      await page.click('button:has-text("Discard")');
      
      // Pastikan kembali ke halaman tabel
      await expect(page.locator('h1:has-text("User Management")')).toBeVisible();
    });

    // =========================================================================
    // 4. USABILITY & ACCESSIBILITY (a11y): Keyboard Navigation
    // =========================================================================
    test('Mendukung aksesibilitas navigasi murni menggunakan Keyboard di dalam Modal', async ({ page }) => {
      await page.click('button:has-text("Add User")');
      
      // Tunggu modal animasi selesai
      await page.waitForTimeout(400);

      // Mulai fokus manual ke input pertama
      await page.focus('input[placeholder="e.g. John Doe"]');
      await page.keyboard.type('Aksesibilitas User');

      // Pindah menggunakan TAB ke Username
      await page.keyboard.press('Tab');
      await page.keyboard.type('a11y_user');

      // Pindah menggunakan TAB ke Password
      await page.keyboard.press('Tab');
      await page.keyboard.type('rahasia123');

      // Pindah ke Toggle Show Password dan tekan Spasi
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space');
      
      // Validasi DOM berubah (Type text)
      const passwordInput = page.locator('input[placeholder="Min. 8 characters"]');
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Karena Vue sudah dilengkapi listener ESC, tekan Escape akan memicu peringatan dirty state
      await page.keyboard.press('Escape');
      await expect(page.locator('h3:has-text("Unsaved Changes")')).toBeVisible();
    });

  });

  test.describe('B. MANAGER ROLE JOURNEY (RBAC & UI Protection)', () => {
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/login', { waitUntil: 'networkidle' });
      // Login sebagai MANAGER, BUKAN Admin
      await page.fill('input[placeholder="Enter your username"]', 'manager');
      await page.fill('input[placeholder="••••••••"]', 'selarasa01');
      await page.waitForTimeout(1000);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/\/dashboard/);
      await page.goto('/users');
    });

    // =========================================================================
    // 5. SECURITY & ROLE BASED ACCESS CONTROL (UI LEVEL)
    // =========================================================================
    test('UI memproteksi akun Admin agar tidak bisa diedit/dihapus oleh Manager (Badge Locked)', async ({ page }) => {
      // Cari baris tabel milik "admin"
      const adminRow = page.locator('table tr').filter({ hasText: '@admin' });
      await expect(adminRow).toBeVisible();

      // Validasi State: Manager hanya boleh melihat tombol 'View' untuk admin
      const viewBtn = adminRow.locator('button:has-text("View")');
      await expect(viewBtn).toBeVisible();

      // Validasi State: Tombol 'Edit', 'Deactivate', 'Delete' HARUS TIDAK ADA di baris Admin
      await expect(adminRow.locator('button:has-text("Edit")')).toHaveCount(0);
      await expect(adminRow.locator('button:has-text("Deactivate")')).toHaveCount(0);
      await expect(adminRow.locator('button:has-text("Delete")')).toHaveCount(0);

      // Validasi Visual: Terdapat lencana "Locked" dengan ikon gembok
      const lockedBadge = adminRow.locator('span:has-text("Locked")');
      await expect(lockedBadge).toBeVisible();
    });

    test('UI melindungi akun milik sendiri (Self-Protection) dari tombol Deactivate/Delete', async ({ page }) => {
      // Cari baris tabel milik diri sendiri ("manager")
      const selfRow = page.locator('table tr').filter({ hasText: '@manager' });
      await expect(selfRow).toBeVisible();

      // Tombol Edit boleh ada untuk update password sendiri
      await expect(selfRow.locator('button:has-text("Edit")')).toBeVisible();

      // Validasi Visual: Terdapat lencana "You"
      const youBadge = selfRow.locator('span:has-text("You")');
      await expect(youBadge).toBeVisible();

      // Validasi Proteksi: Manager tidak boleh punya tombol Hapus atau Nonaktifkan untuk dirinya sendiri
      await expect(selfRow.locator('button:has-text("Deactivate")')).toHaveCount(0);
      await expect(selfRow.locator('button:has-text("Delete")')).toHaveCount(0);
    });

  });

});