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
        $this->command->info('Seeding inventory data (categories & materials)...');

        // Get an admin/inventory user to record in the stock movement audit trail.
        $admin = User::where('role', 'admin')->first()
            ?? User::factory()->create(['role' => 'admin']);

        // ==========================================
        // 1. REALISTIC CATEGORY DATA
        // ==========================================
        $categoriesData = [
            'Staples'         => 'Category for rice, cooking oil, flour, sugar, etc.',
            'Protein'         => 'Category for beef, chicken, fish, eggs.',
            'Vegetables & Fruits' => 'Category for fresh vegetables and fruits.',
            'Spices & Seasonings' => 'Category for shallots, salt, pepper, sauces, etc.',
            'Beverages'       => 'Category for coffee, tea, syrup, milk.',
        ];

        $categories = [];
        foreach ($categoriesData as $name => $description) {
            $categories[$name] = RawMaterialCategory::firstOrCreate(
                ['name' => $name],
                ['description' => $description]
            );
        }

        // ==========================================
        // 2. REALISTIC RAW MATERIAL DATA
        // ==========================================
        $materialsData = [
            // Staples
            ['cat' => 'Staples', 'sku' => 'RM-ST-001', 'name' => 'Premium Rice', 'unit' => 'kg', 'min_stock' => 50],
            ['cat' => 'Staples', 'sku' => 'RM-ST-002', 'name' => 'Palm Cooking Oil', 'unit' => 'liter', 'min_stock' => 20],
            ['cat' => 'Staples', 'sku' => 'RM-ST-003', 'name' => 'All-Purpose Wheat Flour', 'unit' => 'kg', 'min_stock' => 15],
            ['cat' => 'Staples', 'sku' => 'RM-ST-004', 'name' => 'White Granulated Sugar', 'unit' => 'kg', 'min_stock' => 20],

            // Protein
            ['cat' => 'Protein', 'sku' => 'RM-PR-001', 'name' => 'Beef Tenderloin', 'unit' => 'kg', 'min_stock' => 10],
            ['cat' => 'Protein', 'sku' => 'RM-PR-002', 'name' => 'Chicken Breast Fillet', 'unit' => 'kg', 'min_stock' => 15],
            ['cat' => 'Protein', 'sku' => 'RM-PR-003', 'name' => 'Chicken Eggs', 'unit' => 'pcs', 'min_stock' => 100],

            // Spices & Seasonings
            ['cat' => 'Spices & Seasonings', 'sku' => 'RM-SP-001', 'name' => 'Shallots', 'unit' => 'kg', 'min_stock' => 5],
            ['cat' => 'Spices & Seasonings', 'sku' => 'RM-SP-002', 'name' => 'Garlic', 'unit' => 'kg', 'min_stock' => 5],
            ['cat' => 'Spices & Seasonings', 'sku' => 'RM-SP-003', 'name' => 'Iodized Salt', 'unit' => 'kg', 'min_stock' => 10],
            ['cat' => 'Spices & Seasonings', 'sku' => 'RM-SP-004', 'name' => 'Sweet Soy Sauce', 'unit' => 'liter', 'min_stock' => 5],

            // Vegetables & Fruits
            ['cat' => 'Vegetables & Fruits', 'sku' => 'RM-VF-001', 'name' => 'Fresh Red Tomatoes', 'unit' => 'kg', 'min_stock' => 5],
            ['cat' => 'Vegetables & Fruits', 'sku' => 'RM-VF-002', 'name' => 'Green Lettuce', 'unit' => 'kg', 'min_stock' => 3],
        ];

        foreach ($materialsData as $item) {
            $material = RawMaterial::firstOrCreate(
                ['sku' => $item['sku']],
                [
                    'category_id'   => $categories[$item['cat']]->id,
                    'name'          => $item['name'],
                    'unit'          => $item['unit'],
                    'minimum_stock' => $item['min_stock'],
                    'current_stock' => 0, // Start at 0 — will be filled via StockMovement
                    'is_active'     => true,
                ]
            );

            // ==========================================
            // 3. INJECT INITIAL STOCK (STOCK IN)
            // ==========================================
            // To make E2E data useful (not stuck at 0), give an initial stock
            // slightly above the minimum stock.
            if ($material->wasRecentlyCreated) {
                $initialQty = $item['min_stock'] * rand(2, 5); // e.g., min 10 → initial 20-50

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

                // Sync the final balance in the master data
                $material->update(['current_stock' => $initialQty]);
            }
        }

        $this->command->info('Inventory data seeded successfully!');
    }
}