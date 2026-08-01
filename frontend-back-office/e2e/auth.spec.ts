import { test, expect } from '@playwright/test';

test.describe('Alur Autentikasi Back Office (E2E)', () => {
  
  // =========================================================================
  // 1. HAPPY PATH (Alur Sukses & Transisi State UI)
  // =========================================================================
  test('Pengguna berhasil login dengan kredensial valid dan logout kembali', async ({ page }) => {
    await page.goto('/login');

    // Validasi visual & struktur dokumen (a11y check untuk heading utama)
    await expect(page.locator('h1')).toContainText('Back Office');

    // Menggunakan praktik terbaik (semantic targeting)
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'selarasa01');
    await page.click('button[type="submit"]');

    // Validasi navigasi dan kestabilan antarmuka Dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Menguji interaksi logout kembali ke awal
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL('/login');
  });

  // =========================================================================
  // 2. NEGATIVE PATH & ERROR HANDLING LEVEL UI
  // =========================================================================
  test('Menampilkan teks error visual yang ramah manusia saat login gagal (422/401)', async ({ page }) => {
    await page.goto('/login');

    // Simulasi memasukkan kredensial salah
    await page.fill('input[placeholder="Enter your username"]', 'admin');
    await page.fill('input[placeholder="••••••••"]', 'password_salah');
    await page.click('button[type="submit"]');

    // 1. Pastikan pengguna tidak bocor ke halaman Dashboard
    await expect(page).toHaveURL('/login');

    // 2. Validasi Error Handling Level UI:
    // Pastikan muncul elemen teks error visual (biasanya banner/alert merah dari Vue)
    // Contoh: mencocokkan teks pesan penolakan yang dikirim backend / authStore
    const errorMessage = page.locator('.text-error, [role="alert"]'); 
    await expect(errorMessage).toBeVisible();
  });

// =========================================================================
  // 3. USABILITY & ACCESSIBILITY (a11y) - KEYBOARD NAVIGATION
  // =========================================================================
  test('Pengguna dapat melakukan login murni menggunakan navigasi keyboard (a11y)', async ({ page }) => {
    await page.goto('/login');

    // 1. Fokus ke kolom username
    await page.focus('input[placeholder="Enter your username"]');
    await page.keyboard.type('admin');

    // 2. Berpindah ke kolom password menggunakan TAB
    await page.keyboard.press('Tab');
    await page.keyboard.type('selarasa01');

    // 3. Tekan ENTER langsung dari dalam kolom password (standar baku form web)
    await page.keyboard.press('Enter');

    // 4. Validasi berhasil masuk ke dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

// =========================================================================
  // 4. SECURITY PATH - REAL RATE LIMITING (HTTP 429)
  // =========================================================================
  test('Menampilkan peringatan Rate Limit setelah salah password terus-menerus', async ({ page }) => {
    await page.goto('/login');

    // Lakukan 7 kali percobaan agar pasti melewati batas Limit::perMinute(5) Laravel
    for (let i = 1; i <= 7; i++) {
      await page.fill('input[placeholder="Enter your username"]', 'user_test_ratelimit');
      await page.fill('input[placeholder="••••••••"]', `salah_password_${i}`);
      
      // Tunggu respons API /login dari backend selesai diproses pada setiap klik
      const responsePromise = page.waitForResponse(resp => resp.url().includes('/login'));
      await page.click('button[type="submit"]');
      const response = await responsePromise;

      // Jika pada hitungan tertentu sudah mendapati status 429, kita bisa langsung keluar loop
      if (response.status() === 429) {
        break;
      }
    }

    // Pastikan tetap berada di halaman login
    await expect(page).toHaveURL('/login');

    // Validasi pesan error HTTP 429 dari interceptor axios muncul di layar
    const errorAlert = page.locator('.text-error, [role="alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/too many requests|terlalu banyak/i);
  });

});