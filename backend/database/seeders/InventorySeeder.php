<?php

namespace Database\Seeders;

use App\Models\RawMaterial;
use App\Models\RawMaterialCategory;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('📦 Seeding Inventory Data (Categories & Materials)...');

        // Ambil satu user admin/inventory untuk dicatat di audit trail mutasi stok
        $admin = User::where('role', 'admin')->first() ?? User::factory()->create(['role' => 'admin']);

        // ==========================================
        // 1. DATA KATEGORI REALISTIS
        // ==========================================
        $categoriesData = [
            'Bahan Pokok'    => 'Kategori untuk beras, minyak, tepung, gula, dll.',
            'Protein'        => 'Kategori untuk daging sapi, ayam, ikan, telur.',
            'Sayuran & Buah' => 'Kategori untuk sayuran segar dan buah-buahan.',
            'Bumbu & Rempah' => 'Kategori untuk bawang, garam, lada, saus, dll.',
            'Minuman'        => 'Kategori untuk kopi, teh, sirup, susu.',
        ];

        $categories = [];
        foreach ($categoriesData as $name => $description) {
            $categories[$name] = RawMaterialCategory::firstOrCreate(
                ['name' => $name],
                ['description' => $description]
            );
        }

        // ==========================================
        // 2. DATA BAHAN BAKU REALISTIS
        // ==========================================
        $materialsData = [
            // Bahan Pokok
            ['cat' => 'Bahan Pokok', 'sku' => 'RM-BP-001', 'name' => 'Beras Premium', 'unit' => 'kg', 'min_stock' => 50],
            ['cat' => 'Bahan Pokok', 'sku' => 'RM-BP-002', 'name' => 'Minyak Goreng Kelapa Sawit', 'unit' => 'liter', 'min_stock' => 20],
            ['cat' => 'Bahan Pokok', 'sku' => 'RM-BP-003', 'name' => 'Tepung Terigu Serbaguna', 'unit' => 'kg', 'min_stock' => 15],
            ['cat' => 'Bahan Pokok', 'sku' => 'RM-BP-004', 'name' => 'Gula Pasir Putih', 'unit' => 'kg', 'min_stock' => 20],
            
            // Protein
            ['cat' => 'Protein', 'sku' => 'RM-PR-001', 'name' => 'Daging Sapi Has Dalam (Tenderloin)', 'unit' => 'kg', 'min_stock' => 10],
            ['cat' => 'Protein', 'sku' => 'RM-PR-002', 'name' => 'Daging Ayam Fillet Dada', 'unit' => 'kg', 'min_stock' => 15],
            ['cat' => 'Protein', 'sku' => 'RM-PR-003', 'name' => 'Telur Ayam Horn', 'unit' => 'butir', 'min_stock' => 100],
            
            // Bumbu & Rempah
            ['cat' => 'Bumbu & Rempah', 'sku' => 'RM-BM-001', 'name' => 'Bawang Merah', 'unit' => 'kg', 'min_stock' => 5],
            ['cat' => 'Bumbu & Rempah', 'sku' => 'RM-BM-002', 'name' => 'Bawang Putih', 'unit' => 'kg', 'min_stock' => 5],
            ['cat' => 'Bumbu & Rempah', 'sku' => 'RM-BM-003', 'name' => 'Garam Beryodium', 'unit' => 'kg', 'min_stock' => 10],
            ['cat' => 'Bumbu & Rempah', 'sku' => 'RM-BM-004', 'name' => 'Kecap Manis', 'unit' => 'liter', 'min_stock' => 5],
            
            // Sayuran & Buah
            ['cat' => 'Sayuran & Buah', 'sku' => 'RM-SY-001', 'name' => 'Tomat Merah Segar', 'unit' => 'kg', 'min_stock' => 5],
            ['cat' => 'Sayuran & Buah', 'sku' => 'RM-SY-002', 'name' => 'Selada Hijau', 'unit' => 'kg', 'min_stock' => 3],
        ];

        foreach ($materialsData as $item) {
            $material = RawMaterial::firstOrCreate(
                ['sku' => $item['sku']],
                [
                    'category_id'   => $categories[$item['cat']]->id,
                    'name'          => $item['name'],
                    'unit'          => $item['unit'],
                    'minimum_stock' => $item['min_stock'],
                    'current_stock' => 0, // Set 0 di awal, akan diisi via StockMovement
                    'is_active'     => true,
                ]
            );

            // ==========================================
            // 3. INJEKSI STOK AWAL (STOCK IN)
            // ==========================================
            // Agar data E2E bagus (tidak 0 stoknya), kita berikan initial stock yang sedikit lebih tinggi dari min_stock
            if ($material->wasRecentlyCreated) {
                $initialQty = $item['min_stock'] * rand(2, 5); // Misal min 10, stok awal jadi 20 - 50
                
                StockMovement::create([
                    'raw_material_id' => $material->id,
                    'user_id'         => $admin->id,
                    'movement_type'   => 'IN',
                    'quantity'        => $initialQty,
                    'balance_before'  => 0,
                    'balance_after'   => $initialQty,
                    'reason'          => 'Initial stock opname (Seeder)',
                    'reference_id'    => 'INIT-' . date('Ymd'),
                ]);

                // Update saldo akhirnya di master data
                $material->update(['current_stock' => $initialQty]);
            }
        }

        $this->command->info('✅ Inventory Data Seeded Successfully!');
    }
}