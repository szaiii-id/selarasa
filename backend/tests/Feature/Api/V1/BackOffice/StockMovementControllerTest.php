<?php

use App\Models\RawMaterial;
use App\Models\RawMaterialCategory;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role'      => 'admin',
        'is_active' => true,
        'username'  => 'admin_test',
    ]);

    $this->manager = User::factory()->create([
        'role'      => 'manager',
        'is_active' => true,
        'username'  => 'manager_test',
    ]);

    $this->cashier = User::factory()->create([
        'role'      => 'cashier',
        'is_active' => true,
        'username'  => 'cashier_test',
    ]);

    $this->inventory = User::factory()->create([
        'role'      => 'inventory',
        'is_active' => true,
        'username'  => 'inventory_test',
    ]);

    Cache::flush();

    $this->bahanPokok = RawMaterialCategory::factory()->create([
        'name'        => 'Bahan Pokok',
        'description' => 'Kategori bahan pokok',
    ]);

    $this->beras = RawMaterial::factory()->create([
        'category_id'   => $this->bahanPokok->id,
        'sku'           => 'RM-0001-BRS',
        'name'          => 'Beras Premium',
        'unit'          => 'kg',
        'current_stock' => 100.00,
        'minimum_stock' => 20.00,
        'is_active'     => true,
    ]);

    $this->gula = RawMaterial::factory()->create([
        'category_id'   => $this->bahanPokok->id,
        'sku'           => 'RM-0002-GLA',
        'name'          => 'Gula Pasir',
        'unit'          => 'kg',
        'current_stock' => 50.00,
        'minimum_stock' => 10.00,
        'is_active'     => true,
    ]);

    $this->garam = RawMaterial::factory()->create([
        'category_id'   => $this->bahanPokok->id,
        'sku'           => 'RM-0003-GRM',
        'name'          => 'Garam Halus',
        'unit'          => 'gr',
        'current_stock' => 5.00,
        'minimum_stock' => 10.00,
        'is_active'     => true,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

describe('API Contract Testing', function () {

    it('returns correct JSON schema structure for movement list', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Pembelian dari supplier',
            'reference_id'    => 'PO-001',
        ]);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'raw_material_id',
                        'user_id',
                        'movement_type',
                        'quantity',
                        'balance_before',
                        'balance_after',
                        'reason',
                        'reference_id',
                        'created_at',
                    ],
                ],
                'links',
                'meta',
            ]);
    });

    it('returns correct JSON format when creating a stock IN movement', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Pembelian dari supplier',
            'reference_id'    => 'PO-2024-001',
        ]);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'raw_material_id',
                    'user_id',
                    'movement_type',
                    'quantity',
                    'balance_before',
                    'balance_after',
                    'reason',
                    'reference_id',
                    'created_at',
                ],
            ])
            ->assertJson([
                'message' => 'Stock movement recorded successfully.',
                'data'    => [
                    'raw_material_id' => $this->beras->id,
                    'user_id'         => $this->admin->id,
                    'movement_type'   => 'IN',
                    'quantity'        => 50,
                    'balance_before'  => 100,
                    'balance_after'   => 150,
                    'reference_id'    => 'PO-2024-001',
                ],
            ]);
    });

    it('returns correct JSON format when creating a stock OUT movement', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => 30,
            'reason'          => 'Pemakaian harian',
        ])->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'message' => 'Stock movement recorded successfully.',
                'data'    => [
                    'movement_type'  => 'OUT',
                    'quantity'       => -30,
                    'balance_before' => 100,
                    'balance_after'  => 70,
                ],
            ]);
    });

    it('returns correct JSON format when creating an ADJUSTMENT movement', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'ADJUSTMENT',
            'quantity'        => -15,
            'reason'          => 'Koreksi stok opname',
        ])->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'data' => [
                    'movement_type'  => 'ADJUSTMENT',
                    'quantity'       => -15,
                    'balance_before' => 100,
                    'balance_after'  => 85,
                ],
            ]);
    });
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

describe('Security & Authorization Testing', function () {

    it('prevents unauthenticated users from accessing movement endpoints', function () {
        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_UNAUTHORIZED);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Test',
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    });

    it('prevents cashiers from accessing movement management', function () {
        Sanctum::actingAs($this->cashier);

        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_FORBIDDEN);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Cashier Test',
        ])->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('allows inventory to manage movements', function () {
        Sanctum::actingAs($this->inventory);

        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_OK);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Inventory Test',
        ])->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'data' => ['user_id' => $this->inventory->id],
            ]);
    });

    it('allows admin to manage movements', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_OK);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Admin Test',
        ])->assertStatus(Response::HTTP_CREATED);
    });

    it('allows manager to manage movements', function () {
        Sanctum::actingAs($this->manager);

        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_OK);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Manager Test',
        ])->assertStatus(Response::HTTP_CREATED);
    });

    it('prevents inactive users from accessing movement endpoints', function () {
        $inactiveAdmin = User::factory()->create([
            'role'      => 'admin',
            'is_active' => false,
        ]);

        Sanctum::actingAs($inactiveAdmin);

        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('automatically uses authenticated user id for movement', function () {
        Sanctum::actingAs($this->inventory);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Test user id',
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('stock_movements', [
            'user_id'         => $this->inventory->id,
            'raw_material_id' => $this->beras->id,
        ]);
    });

    it('ignores user_id provided in request body (uses authenticated user)', function () {
        Sanctum::actingAs($this->inventory);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Test',
            'user_id'         => $this->admin->id,
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('stock_movements', [
            'raw_material_id' => $this->beras->id,
            'user_id'         => $this->inventory->id,
        ]);

        $this->assertDatabaseMissing('stock_movements', [
            'raw_material_id' => $this->beras->id,
            'user_id'         => $this->admin->id,
        ]);
    });
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

describe('Data Integrity & State Transition', function () {

    it('successfully increases stock with IN movement', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Pembelian',
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => $originalStock + 50,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'balance_before'  => $originalStock,
            'balance_after'   => $originalStock + 50,
        ]);
    });

    it('successfully decreases stock with OUT movement', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => 30,
            'reason'          => 'Pemakaian',
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => $originalStock - 30,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => -30,
            'balance_after'   => $originalStock - 30,
        ]);
    });

    // FIX: negative quantity for IN is INVALID (gt:0 rule)
    // Test name changed to reflect the actual behavior
    it('rejects IN movement with negative quantity (gt:0 rule)', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => -50,
            'reason'          => 'Test negative IN rejected',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['quantity']);

        // Verify stock was NOT changed
        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => 100.00,
        ]);
    });

    // FIX: negative quantity for OUT is INVALID (gt:0 rule)
    // Test name changed to reflect the actual behavior
    it('rejects OUT movement with negative quantity (gt:0 rule)', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => -30,
            'reason'          => 'Test negative OUT rejected',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['quantity']);

        // Verify stock was NOT changed
        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => 100.00,
        ]);
    });

    it('allows ADJUSTMENT with positive value', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'ADJUSTMENT',
            'quantity'        => 10,
            'reason'          => 'Koreksi positif',
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => $originalStock + 10,
        ]);
    });

    it('allows ADJUSTMENT with negative value', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'ADJUSTMENT',
            'quantity'        => -10,
            'reason'          => 'Koreksi negatif',
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => $originalStock - 10,
        ]);
    });

    it('prevents negative stock with OUT movement', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => 99999,
            'reason'          => 'Test insufficient stock',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => 100.00,
        ]);
    });

    it('prevents negative stock with ADJUSTMENT', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'ADJUSTMENT',
            'quantity'        => -99999,
            'reason'          => 'Test negative adjustment',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    });

    it('allows OUT movement equal to current stock (boundary)', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => 100,
            'reason'          => 'Boundary test',
        ])->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => 0,
        ]);
    });

    it('records movement with immutable audit trail (created_at only)', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Audit test',
        ])->assertStatus(Response::HTTP_CREATED);

        $movement = StockMovement::where('raw_material_id', $this->beras->id)
            ->latest()
            ->first();

        expect($movement->created_at)->not->toBeNull();
        expect($movement->updated_at)->toBeNull();
    });

    it('rolls back stock update when business rule fails mid-transaction', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => 99999,
            'reason'          => 'Trigger rollback',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => $originalStock,
        ]);

        expect(
            StockMovement::where('raw_material_id', $this->beras->id)->count()
        )->toBe(0);
    });
});

// ==========================================
// 4. NON-IDEMPOTENT BY DESIGN (AUDIT TRAIL)
// ==========================================

describe('Non-Idempotent By Design (Audit Trail)', function () {

    it('creates separate movements for repeated identical requests', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Repeated request',
        ];

        $this->postJson('/api/v1/backoffice/inventory/movements', $payload)
            ->assertStatus(Response::HTTP_CREATED);

        $this->postJson('/api/v1/backoffice/inventory/movements', $payload)
            ->assertStatus(Response::HTTP_CREATED);

        $movements = StockMovement::where('raw_material_id', $this->beras->id)
            ->where('movement_type', 'IN')
            ->where('quantity', 50)
            ->get();

        expect($movements->count())->toBe(2);

        $this->assertDatabaseHas('raw_materials', [
            'id'            => $this->beras->id,
            'current_stock' => 200.00,
        ]);
    });

    it('returns 422 when creating movement with non-existent material', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => 99999,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Non-existent material',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['raw_material_id']);
    });

    it('returns 422 when material is inactive (FormRequest blocks before service)', function () {
        $inactiveMaterial = RawMaterial::factory()->create([
            'category_id'   => $this->bahanPokok->id,
            'sku'           => 'RM-INACTIVE',
            'name'          => 'Beras Basi',
            'unit'          => 'kg',
            'current_stock' => 50.00,
            'minimum_stock' => 10.00,
            'is_active'     => false,
        ]);

        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $inactiveMaterial->id,
            'movement_type'   => 'IN',
            'quantity'        => 10,
            'reason'          => 'Test inactive',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['raw_material_id']);
    });

    it('returns 422 when material is soft-deleted', function () {
        $softDeleted = RawMaterial::factory()->create([
            'category_id'   => $this->bahanPokok->id,
            'sku'           => 'RM-DELETED',
            'name'          => 'Beras Deleted',
            'unit'          => 'kg',
            'current_stock' => 50.00,
            'minimum_stock' => 10.00,
            'is_active'     => true,
        ]);

        $softDeleted->delete();

        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $softDeleted->id,
            'movement_type'   => 'IN',
            'quantity'        => 10,
            'reason'          => 'Test soft-deleted',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['raw_material_id']);
    });
});

// ==========================================
// 5. ERROR HANDLING & VALIDATION
// ==========================================

describe('Error Handling & Validation', function () {

    it('handles validation errors when creating movement with empty payload', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [])
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['raw_material_id', 'movement_type', 'quantity', 'reason']);
    });

    it('handles validation error when movement_type is invalid', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'INVALID_TYPE',
            'quantity'        => 50,
            'reason'          => 'Test invalid type',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['movement_type']);
    });

    it('normalizes lowercase movement_type to uppercase before validation', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'in',
            'quantity'        => 10,
            'reason'          => 'Test lowercase',
        ])->assertStatus(Response::HTTP_CREATED)
            ->assertJson(['data' => ['movement_type' => 'IN']]);
    });

    it('normalizes movement_type with whitespace before validation', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => '  out  ',
            'quantity'        => 10,
            'reason'          => 'Test whitespace',
        ])->assertStatus(Response::HTTP_CREATED)
            ->assertJson(['data' => ['movement_type' => 'OUT']]);
    });

    it('handles validation error when quantity is zero for IN', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 0,
            'reason'          => 'Zero quantity',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['quantity']);
    });

    it('handles validation error when quantity is zero for ADJUSTMENT', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'ADJUSTMENT',
            'quantity'        => 0,
            'reason'          => 'Zero adjustment',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['quantity']);
    });

    it('handles validation error when IN quantity is negative (gt:0 rule)', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => -50,
            'reason'          => 'Negative IN',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['quantity']);
    });

    it('handles validation error when reason is missing', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reason']);
    });

    it('handles validation error when reason is less than 3 characters', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'ab',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reason']);
    });

    it('handles validation error when reason is whitespace only', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => '     ',
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reason']);
    });

    it('handles validation error when reason exceeds 255 characters', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => str_repeat('a', 256),
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reason']);
    });

    it('handles validation error when reference_id exceeds 100 characters', function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Test reference',
            'reference_id'    => str_repeat('a', 101),
        ])->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reference_id']);
    });

    it('handles invalid pagination parameter gracefully', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements?per_page=999999')
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles string per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements?per_page=abc')
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles negative per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements?per_page=-10')
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles zero per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements?per_page=0')
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('accepts per_page at boundary max (100)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=100');

        $response->assertStatus(Response::HTTP_OK);
        expect($response->json('meta.per_page'))->toBe(100);
    });

    it('accepts per_page at boundary min (1)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=1');

        $response->assertStatus(Response::HTTP_OK);
        expect($response->json('meta.per_page'))->toBe(1);
    });

    it('uses default per_page 15 when not provided', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements');

        $response->assertStatus(Response::HTTP_OK);
        expect($response->json('meta.per_page'))->toBe(15);
    });

    it('handles invalid start_date format', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements?start_date=2024/01/01')
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['start_date']);
    });

    it('handles end_date before start_date', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/movements?start_date=2024-12-31&end_date=2024-01-01')
            ->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['end_date']);
    });
});

// ==========================================
// 6. FILTER & SEARCH TESTING
// ==========================================

describe('Filter & Search Testing', function () {

    beforeEach(function () {
        Sanctum::actingAs($this->admin);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'IN',
            'quantity'        => 50,
            'reason'          => 'Pembelian beras',
        ]);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->gula->id,
            'movement_type'   => 'IN',
            'quantity'        => 30,
            'reason'          => 'Pembelian gula',
        ]);

        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type'   => 'OUT',
            'quantity'        => 10,
            'reason'          => 'Pemakaian beras',
        ]);
    });

    it('filters movements by raw_material_id', function () {
        $response = $this->getJson(
            "/api/v1/backoffice/inventory/movements?raw_material_id={$this->beras->id}"
        );

        $response->assertStatus(Response::HTTP_OK);

        foreach ($response->json('data') as $movement) {
            expect($movement['raw_material_id'])->toBe($this->beras->id);
        }
    });

    it('filters movements by movement_type', function () {
        $response = $this->getJson('/api/v1/backoffice/inventory/movements?movement_type=IN');

        $response->assertStatus(Response::HTTP_OK);

        foreach ($response->json('data') as $movement) {
            expect($movement['movement_type'])->toBe('IN');
        }
    });

    it('filters movements by user_id', function () {
        $response = $this->getJson(
            "/api/v1/backoffice/inventory/movements?user_id={$this->admin->id}"
        );

        $response->assertStatus(Response::HTTP_OK);

        foreach ($response->json('data') as $movement) {
            expect($movement['user_id'])->toBe($this->admin->id);
        }
    });

    it('filters movements by date range', function () {
        $response = $this->getJson(
            '/api/v1/backoffice/inventory/movements?start_date=' . now()->toDateString()
            . '&end_date=' . now()->toDateString()
        );

        $response->assertStatus(Response::HTTP_OK);
        expect($response->json('data'))->not->toBeEmpty();
    });

    it('returns paginated results with correct meta', function () {
        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/backoffice/inventory/movements', [
                'raw_material_id' => $this->beras->id,
                'movement_type'   => 'IN',
                'quantity'        => 1,
                'reason'          => "Bulk movement {$i}",
            ]);
        }

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=10&page=1');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta'  => ['current_page', 'from', 'last_page', 'path', 'per_page', 'to', 'total'],
            ]);
    });

    it('returns movements in descending order (latest first)', function () {
        $response = $this->getJson('/api/v1/backoffice/inventory/movements');

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');

        if (count($data) > 1) {
            expect($data[0]['id'])->toBeGreaterThan($data[1]['id']);
        }
    });

    it('rejects SQL injection attempt in raw_material_id filter', function () {
        $response = $this->getJson(
            '/api/v1/backoffice/inventory/movements?raw_material_id=1%20OR%201%3D1'
        );

        // Harus 200 atau 422 — BUKAN 500
        expect($response->status())->toBeIn([
            Response::HTTP_OK,
            Response::HTTP_UNPROCESSABLE_ENTITY,
        ]);
    });
});

// ==========================================
// 7. RATE LIMITING & THROTTLING
// ==========================================

describe('Rate Limiting & Throttling', function () {

    it('returns rate limit headers on API responses', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements');

        expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
        expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
    });

    it('rate limit header decreases after each request', function () {
        Sanctum::actingAs($this->admin);

        $first = $this->getJson('/api/v1/backoffice/inventory/movements');
        $firstRemaining = (int) $first->headers->get('X-RateLimit-Remaining');

        $second = $this->getJson('/api/v1/backoffice/inventory/movements');
        $secondRemaining = (int) $second->headers->get('X-RateLimit-Remaining');

        expect($secondRemaining)->toBeLessThan($firstRemaining);
    });
});