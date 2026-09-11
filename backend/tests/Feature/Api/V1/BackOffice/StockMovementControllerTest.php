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
    // Create users with different roles
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
        'username' => 'admin_test'
    ]);
    
    $this->manager = User::factory()->create([
        'role' => 'manager',
        'is_active' => true,
        'username' => 'manager_test'
    ]);
    
    $this->cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
        'username' => 'cashier_test'
    ]);
    
    $this->inventory = User::factory()->create([
        'role' => 'inventory',
        'is_active' => true,
        'username' => 'inventory_test'
    ]);
    
    // Clear cache before each test
    Cache::flush();
    
    // Create test categories
    $this->bahanPokok = RawMaterialCategory::factory()->create([
        'name' => 'Bahan Pokok',
        'description' => 'Kategori bahan pokok'
    ]);
    
    // Create test materials with stock
    $this->beras = RawMaterial::factory()->create([
        'category_id' => $this->bahanPokok->id,
        'sku' => 'RM-0001-BRS',
        'name' => 'Beras Premium',
        'unit' => 'kg',
        'current_stock' => 100.00,
        'minimum_stock' => 20.00,
        'is_active' => true,
    ]);
    
    $this->gula = RawMaterial::factory()->create([
        'category_id' => $this->bahanPokok->id,
        'sku' => 'RM-0002-GLA',
        'name' => 'Gula Pasir',
        'unit' => 'kg',
        'current_stock' => 50.00,
        'minimum_stock' => 10.00,
        'is_active' => true,
    ]);
    
    $this->garam = RawMaterial::factory()->create([
        'category_id' => $this->bahanPokok->id,
        'sku' => 'RM-0003-GRM',
        'name' => 'Garam Halus',
        'unit' => 'gr',
        'current_stock' => 5.00,
        'minimum_stock' => 10.00,
        'is_active' => true,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

describe('API Contract Testing', function () {
    it('returns correct JSON schema structure for movement list', function () {
        Sanctum::actingAs($this->admin);

        // Create a movement first
        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Pembelian dari supplier',
            'reference_id' => 'PO-001',
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
                    ]
                ],
                'links',
                'meta'
            ]);
    });

    it('returns correct JSON format when creating a stock IN movement', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Pembelian dari supplier',
            'reference_id' => 'PO-2024-001',
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', $payload);

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
                ]
            ])
            ->assertJson([
                'message' => 'Stock movement recorded successfully.',
                'data' => [
                    'raw_material_id' => $this->beras->id,
                    'user_id' => $this->admin->id,
                    'movement_type' => 'IN',
                    'quantity' => 50,
                    'balance_before' => 100,
                    'balance_after' => 150,
                    'reference_id' => 'PO-2024-001',
                ]
            ]);
    });

    it('returns correct JSON format when creating a stock OUT movement', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => 30,
            'reason' => 'Pemakaian harian',
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', $payload);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'message' => 'Stock movement recorded successfully.',
                'data' => [
                    'movement_type' => 'OUT',
                    'quantity' => -30,
                    'balance_before' => 100,
                    'balance_after' => 70,
                ]
            ]);
    });

    it('returns correct JSON format when creating an ADJUSTMENT movement', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'ADJUSTMENT',
            'quantity' => -15,
            'reason' => 'Koreksi stok opname',
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', $payload);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'data' => [
                    'movement_type' => 'ADJUSTMENT',
                    'quantity' => -15,
                    'balance_before' => 100,
                    'balance_after' => 85,
                ]
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
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Test',
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    });

    it('prevents cashiers from accessing movement management', function () {
        Sanctum::actingAs($this->cashier);
        
        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_FORBIDDEN);
        
        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Cashier Test',
        ])->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('allows inventory to manage movements', function () {
        Sanctum::actingAs($this->inventory);
        
        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_OK);
        
        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Inventory Test',
        ]);
        
        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'data' => [
                    'user_id' => $this->inventory->id,
                ]
            ]);
    });

    it('allows admin to manage movements', function () {
        Sanctum::actingAs($this->admin);
        
        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_OK);
        
        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Admin Test',
        ]);
        
        $response->assertStatus(Response::HTTP_CREATED);
    });

    it('allows manager to manage movements', function () {
        Sanctum::actingAs($this->manager);
        
        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_OK);
        
        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Manager Test',
        ]);
        
        $response->assertStatus(Response::HTTP_CREATED);
    });

    it('prevents inactive users from accessing movement endpoints', function () {
        $inactiveAdmin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);
        
        Sanctum::actingAs($inactiveAdmin);
        
        $this->getJson('/api/v1/backoffice/inventory/movements')
            ->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('automatically uses authenticated user id for movement', function () {
        Sanctum::actingAs($this->inventory);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Test user id',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('stock_movements', [
            'user_id' => $this->inventory->id,
            'raw_material_id' => $this->beras->id,
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

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Pembelian',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        // Verify material stock updated
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => $originalStock + 50,
        ]);
        
        // Verify movement recorded
        $this->assertDatabaseHas('stock_movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'balance_before' => $originalStock,
            'balance_after' => $originalStock + 50,
        ]);
    });

    it('successfully decreases stock with OUT movement', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => 30,
            'reason' => 'Pemakaian',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => $originalStock - 30,
        ]);
        
        $this->assertDatabaseHas('stock_movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => -30,
            'balance_after' => $originalStock - 30,
        ]);
    });

    it('correctly normalizes IN quantity to positive regardless of input sign', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => -50, // Negative input
            'reason' => 'Test normalization',
        ]);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'data' => [
                    'quantity' => 50, // Should be positive
                ]
            ]);
    });

    it('correctly normalizes OUT quantity to negative regardless of input sign', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => -30, // Negative input
            'reason' => 'Test normalization',
        ]);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJson([
                'data' => [
                    'quantity' => -30, // Should remain negative
                ]
            ]);
    });

    it('allows ADJUSTMENT with positive value', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'ADJUSTMENT',
            'quantity' => 10,
            'reason' => 'Koreksi positif',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => $originalStock + 10,
        ]);
    });

    it('allows ADJUSTMENT with negative value', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'ADJUSTMENT',
            'quantity' => -10,
            'reason' => 'Koreksi negatif',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => $originalStock - 10,
        ]);
    });

    it('prevents negative stock with OUT movement', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => 99999, // More than available
            'reason' => 'Test insufficient stock',
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
        
        // Stock should not change
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => 100.00,
        ]);
    });

    it('prevents negative stock with ADJUSTMENT', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'ADJUSTMENT',
            'quantity' => -99999,
            'reason' => 'Test negative adjustment',
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY);
    });

    it('allows OUT movement equal to current stock (boundary)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => 100, // Exactly equals current stock
            'reason' => 'Boundary test',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => 0,
        ]);
    });

    it('records movement with immutable audit trail (created_at only)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Audit test',
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $movement = StockMovement::where('raw_material_id', $this->beras->id)->latest()->first();
        
        expect($movement->created_at)->not->toBeNull();
        expect($movement->updated_at)->toBeNull(); // Immutable audit trail
    });
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

describe('Idempotency Testing', function () {
    it('creates separate movements for repeated identical requests', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Repeated request',
        ];

        // First request
        $response1 = $this->postJson('/api/v1/backoffice/inventory/movements', $payload);
        $response1->assertStatus(Response::HTTP_CREATED);

        // Second request - should also succeed (audit trail)
        $response2 = $this->postJson('/api/v1/backoffice/inventory/movements', $payload);
        $response2->assertStatus(Response::HTTP_CREATED);

        // Both movements should be recorded
        $movements = StockMovement::where('raw_material_id', $this->beras->id)
            ->where('movement_type', 'IN')
            ->where('quantity', 50)
            ->get();
        
        expect($movements->count())->toBe(2);
        
        // Stock should have increased by 100 (2 x 50)
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => 200.00,
        ]);
    });

    it('returns 422 when creating movement with non-existent material', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => 99999,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Non-existent material',
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['raw_material_id']);
    });
});

// ==========================================
// 5. ERROR HANDLING & VALIDATION
// ==========================================

describe('Error Handling & Validation', function () {
    it('handles validation errors when creating movement with empty payload', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', []);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['raw_material_id', 'movement_type', 'quantity', 'reason']);
    });

    it('handles validation error when movement_type is invalid', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'INVALID_TYPE',
            'quantity' => 50,
            'reason' => 'Test invalid type',
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['movement_type']);
    });

    it('handles validation error when quantity is zero', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 0,
            'reason' => 'Zero quantity',
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['quantity']);
    });

    it('handles validation error when reason is missing', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reason']);
    });

    it('handles validation error when reason exceeds max length', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => str_repeat('a', 501),
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reason']);
    });

    it('handles validation error when reference_id exceeds max length', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Test',
            'reference_id' => str_repeat('a', 101),
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['reference_id']);
    });

    it('handles invalid pagination parameter gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=999999');

        // Controller menggunakan $request->validate() dengan max:100
        // Jadi return 422, bukan 200
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles string per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=abc');

        // Controller menggunakan $request->validate() dengan integer
        // Jadi return 422, bukan 200 atau 500
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles negative per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=-10');

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles zero per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=0');

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('accepts per_page at boundary max (100)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=100');

        $response->assertStatus(Response::HTTP_OK);
        
        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(100);
    });

    it('accepts per_page at boundary min (1)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=1');

        $response->assertStatus(Response::HTTP_OK);
        
        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(1);
    });

    it('uses default per_page 15 when not provided', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements');

        $response->assertStatus(Response::HTTP_OK);
        
        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(15);
    });
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

describe('Concurrency / Race Condition', function () {
    it('handles concurrent IN movements safely with pessimistic locking', function () {
        Sanctum::actingAs($this->admin);

        $initialStock = $this->beras->current_stock;

        // Simulate concurrent IN movements
        $responses = [];
        for ($i = 1; $i <= 5; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/inventory/movements', [
                'raw_material_id' => $this->beras->id,
                'movement_type' => 'IN',
                'quantity' => 10,
                'reason' => "Concurrent IN {$i}",
            ]);
        }

        // All should succeed
        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_CREATED);
        }

        // Stock should be initial + (5 x 10) = initial + 50
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => $initialStock + 50,
        ]);
    });

    it('prevents concurrent OUT movements from causing negative stock', function () {
        Sanctum::actingAs($this->admin);

        // Garam has stock 5
        $initialStock = $this->garam->current_stock;

        // Simulate concurrent OUT movements each taking 3 (total 6, more than 5)
        $responses = [];
        for ($i = 1; $i <= 2; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/inventory/movements', [
                'raw_material_id' => $this->garam->id,
                'movement_type' => 'OUT',
                'quantity' => 3,
                'reason' => "Concurrent OUT {$i}",
            ]);
        }

        // Only one should succeed (stock 5 - 3 = 2), the other should fail
        $successCount = 0;
        $failureCount = 0;
        
        foreach ($responses as $response) {
            if ($response->status() === Response::HTTP_CREATED) {
                $successCount++;
            } else {
                $failureCount++;
            }
        }

        expect($successCount)->toBe(1);
        expect($failureCount)->toBe(1);
        
        // Stock should be 5 - 3 = 2
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->garam->id,
            'current_stock' => 2.00,
        ]);
    });

    it('handles concurrent movements on different materials safely', function () {
        Sanctum::actingAs($this->admin);

        // Different materials should not block each other
        $responses = [];
        $responses[] = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 10,
            'reason' => 'Concurrent Beras',
        ]);
        $responses[] = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->gula->id,
            'movement_type' => 'IN',
            'quantity' => 20,
            'reason' => 'Concurrent Gula',
        ]);

        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_CREATED);
        }

        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => 110.00,
        ]);
        
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->gula->id,
            'current_stock' => 70.00,
        ]);
    });
});

// ==========================================
// 7. FILTER & SEARCH TESTING
// ==========================================

describe('Filter & Search Testing', function () {
    beforeEach(function () {
        Sanctum::actingAs($this->admin);

        // Create test movements
        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Pembelian beras',
        ]);
        
        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->gula->id,
            'movement_type' => 'IN',
            'quantity' => 30,
            'reason' => 'Pembelian gula',
        ]);
        
        $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'OUT',
            'quantity' => 10,
            'reason' => 'Pemakaian beras',
        ]);
    });

    it('filters movements by raw_material_id', function () {
        $response = $this->getJson("/api/v1/backoffice/inventory/movements?raw_material_id={$this->beras->id}");

        $response->assertStatus(Response::HTTP_OK);
        
        $data = $response->json('data');
        foreach ($data as $movement) {
            expect($movement['raw_material_id'])->toBe($this->beras->id);
        }
    });

    it('filters movements by movement_type', function () {
        $response = $this->getJson('/api/v1/backoffice/inventory/movements?movement_type=IN');

        $response->assertStatus(Response::HTTP_OK);
        
        $data = $response->json('data');
        foreach ($data as $movement) {
            expect($movement['movement_type'])->toBe('IN');
        }
    });

    it('filters movements by user_id', function () {
        $response = $this->getJson("/api/v1/backoffice/inventory/movements?user_id={$this->admin->id}");

        $response->assertStatus(Response::HTTP_OK);
        
        $data = $response->json('data');
        foreach ($data as $movement) {
            expect($movement['user_id'])->toBe($this->admin->id);
        }
    });

    it('returns paginated results with correct meta', function () {
        // Create additional movements
        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/backoffice/inventory/movements', [
                'raw_material_id' => $this->beras->id,
                'movement_type' => 'IN',
                'quantity' => 1,
                'reason' => "Bulk movement {$i}",
            ]);
        }

        $response = $this->getJson('/api/v1/backoffice/inventory/movements?per_page=10&page=1');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data',
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'from', 'last_page', 'path', 'per_page', 'to', 'total']
            ]);
    });

    it('returns movements in descending order (latest first)', function () {
        $response = $this->getJson('/api/v1/backoffice/inventory/movements');

        $response->assertStatus(Response::HTTP_OK);
        
        $data = $response->json('data');
        
        if (count($data) > 1) {
            $firstId = $data[0]['id'];
            $secondId = $data[1]['id'];
            
            // Latest should have higher ID
            expect($firstId)->toBeGreaterThan($secondId);
        }
    });
});

// ==========================================
// 8. PERFORMANCE TESTING
// ==========================================

describe('Performance Testing', function () {
    it('responds within acceptable time for movement list', function () {
        Sanctum::actingAs($this->admin);

        $startTime = microtime(true);
        
        $response = $this->getJson('/api/v1/backoffice/inventory/movements');
        
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000;

        $response->assertStatus(Response::HTTP_OK);
        
        expect($responseTime)->toBeLessThan(500);
    });

    it('processes stock movement within acceptable time', function () {
        Sanctum::actingAs($this->admin);

        $startTime = microtime(true);
        
        $response = $this->postJson('/api/v1/backoffice/inventory/movements', [
            'raw_material_id' => $this->beras->id,
            'movement_type' => 'IN',
            'quantity' => 50,
            'reason' => 'Performance test',
        ]);
        
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000;

        $response->assertStatus(Response::HTTP_CREATED);
        
        expect($responseTime)->toBeLessThan(500);
    });
});

// ==========================================
// 9. RATE LIMITING & THROTTLING
// ==========================================

describe('Rate Limiting & Throttling', function () {
    it('returns rate limit headers', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/movements');
        
        expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
        expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
    });
});