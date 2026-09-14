<?php

use App\Models\RawMaterial;
use App\Models\RawMaterialCategory;
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

    $this->bumbuDapur = RawMaterialCategory::factory()->create([
        'name' => 'Bumbu Dapur',
        'description' => 'Kategori bumbu dapur'
    ]);

    // Create test materials
    $this->beras = RawMaterial::factory()->create([
        'category_id' => $this->bahanPokok->id,
        'sku' => 'RM-0001-BRS',
        'name' => 'Beras Premium',
        'unit' => 'kg',
        'current_stock' => 100.50,
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
        'category_id' => $this->bumbuDapur->id,
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
    it('returns correct JSON schema structure for material list', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'category_id',
                        'sku',
                        'name',
                        'unit',
                        'current_stock',
                        'minimum_stock',
                        'is_active',
                        'is_low_stock',
                        'category' => [
                            'id',
                            'name',
                            'description',
                        ],
                        'created_at',
                        'updated_at',
                    ]
                ],
                'links',
                'meta'
            ]);
    });

    it('returns correct JSON format when creating a material', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-NEW-001',
            'name' => 'Tepung Terigu',
            'unit' => 'kg',
            'minimum_stock' => 15.00,
            'is_active' => true,
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', $payload);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'category_id',
                    'sku',
                    'name',
                    'unit',
                    'current_stock',
                    'minimum_stock',
                    'is_active',
                    'is_low_stock',
                    'category',
                    'created_at',
                    'updated_at',
                ]
            ])
            ->assertJson([
                'message' => 'Raw material registered successfully. Current stock is 0.',
                'data' => [
                    'sku' => 'RM-NEW-001',
                    'name' => 'Tepung Terigu',
                    'unit' => 'kg',
                    'current_stock' => 0,
                    'minimum_stock' => 15.00,
                    'is_active' => true,
                ]
            ]);
    });

    it('returns correct schema for material detail', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'category_id',
                    'sku',
                    'name',
                    'unit',
                    'current_stock',
                    'minimum_stock',
                    'is_active',
                    'is_low_stock',
                    'category' => [
                        'id',
                        'name',
                        'description',
                    ],
                    'created_at',
                    'updated_at',
                ]
            ]);
    });

    it('returns correct schema when updating a material', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-0001-BRS',
            'name' => 'Beras Premium Updated',
            'unit' => 'kg',
            'minimum_stock' => 25.00,
            'is_active' => true,
        ];

        $response = $this->putJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}", $payload);

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'category_id',
                    'sku',
                    'name',
                    'unit',
                    'current_stock',
                    'minimum_stock',
                    'is_active',
                    'is_low_stock',
                    'category',
                    'created_at',
                    'updated_at',
                ]
            ])
            ->assertJson([
                'message' => 'Raw material profile updated successfully.',
                'data' => [
                    'name' => 'Beras Premium Updated',
                    'minimum_stock' => 25.00,
                ]
            ]);
    });

    it('returns correct is_low_stock flag when stock is below minimum', function () {
        Sanctum::actingAs($this->admin);

        // Garam has current_stock = 5 and minimum_stock = 10
        $response = $this->getJson("/api/v1/backoffice/inventory/materials/{$this->garam->id}");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'data' => [
                    'id' => $this->garam->id,
                    'is_low_stock' => true,
                ]
            ]);
    });

    it('returns correct is_low_stock flag when stock is above minimum', function () {
        Sanctum::actingAs($this->admin);

        // Beras has current_stock = 100.50 and minimum_stock = 20
        $response = $this->getJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'data' => [
                    'id' => $this->beras->id,
                    'is_low_stock' => false,
                ]
            ]);
    });
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

describe('Security & Authorization Testing', function () {
    it('prevents unauthenticated users from accessing material endpoints', function () {
        $this->getJson('/api/v1/backoffice/inventory/materials')
            ->assertStatus(Response::HTTP_UNAUTHORIZED);

        $this->postJson('/api/v1/backoffice/inventory/materials', [
            'sku' => 'RM-TEST-001',
            'name' => 'Test Material',
            'unit' => 'kg',
            'minimum_stock' => 10,
            'category_id' => $this->bahanPokok->id,
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    });

    it('prevents cashiers from accessing material management', function () {
        Sanctum::actingAs($this->cashier);

        $this->getJson('/api/v1/backoffice/inventory/materials')
            ->assertStatus(Response::HTTP_FORBIDDEN);

        $this->postJson('/api/v1/backoffice/inventory/materials', [
            'sku' => 'RM-TEST-002',
            'name' => 'Cashier Material',
            'unit' => 'kg',
            'minimum_stock' => 10,
            'category_id' => $this->bahanPokok->id,
        ])->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('allows inventory to manage materials', function () {
        Sanctum::actingAs($this->inventory);

        $this->getJson('/api/v1/backoffice/inventory/materials')
            ->assertStatus(Response::HTTP_OK);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'sku' => 'RM-INV-001',
            'name' => 'Inventory Material',
            'unit' => 'kg',
            'minimum_stock' => 10,
            'category_id' => $this->bahanPokok->id,
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
    });

    it('allows admin to manage materials', function () {
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/v1/backoffice/inventory/materials')
            ->assertStatus(Response::HTTP_OK);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'sku' => 'RM-ADM-001',
            'name' => 'Admin Material',
            'unit' => 'kg',
            'minimum_stock' => 10,
            'category_id' => $this->bahanPokok->id,
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
    });

    it('allows manager to manage materials', function () {
        Sanctum::actingAs($this->manager);

        $this->getJson('/api/v1/backoffice/inventory/materials')
            ->assertStatus(Response::HTTP_OK);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'sku' => 'RM-MGR-001',
            'name' => 'Manager Material',
            'unit' => 'kg',
            'minimum_stock' => 10,
            'category_id' => $this->bahanPokok->id,
        ]);

        $response->assertStatus(Response::HTTP_CREATED);
    });

    it('prevents inactive users from accessing material endpoints', function () {
        $inactiveAdmin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);

        Sanctum::actingAs($inactiveAdmin);

        $this->getJson('/api/v1/backoffice/inventory/materials')
            ->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('prevents SQL injection in material search', function () {
        Sanctum::actingAs($this->admin);

        $maliciousSearch = "test' OR '1'='1";

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?search=' . urlencode($maliciousSearch));

        $response->assertStatus(Response::HTTP_OK);

        // Should not return all materials — should only return 0 because no name/sku contains this
        $responseData = $response->json('data');
        expect(count($responseData))->toBe(0);
    });
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

describe('Data Integrity & State Transition', function () {
    it('successfully creates material with current_stock forced to zero', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-FORCE-ZERO',
            'name' => 'Force Zero Material',
            'unit' => 'kg',
            'minimum_stock' => 10.00,
            'current_stock' => 999, // Should be overridden to 0
            'is_active' => true,
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', $payload);

        $response->assertStatus(Response::HTTP_CREATED);

        $this->assertDatabaseHas('raw_materials', [
            'sku' => 'RM-FORCE-ZERO',
            'current_stock' => 0,
        ]);
    });

    it('successfully updates material without changing current_stock', function () {
        Sanctum::actingAs($this->admin);

        $originalStock = $this->beras->current_stock;

        $payload = [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-0001-BRS',
            'name' => 'Beras Premium Updated',
            'unit' => 'kg',
            'minimum_stock' => 25.00,
            'current_stock' => 999, // Should be ignored
            'is_active' => true,
        ];

        $response = $this->putJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}", $payload);

        $response->assertStatus(Response::HTTP_OK);

        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'current_stock' => $originalStock,
        ]);
    });

    it('successfully transitions material from active to inactive', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-0001-BRS',
            'name' => 'Beras Premium',
            'unit' => 'kg',
            'minimum_stock' => 20.00,
            'is_active' => false,
        ];

        $response = $this->putJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}", $payload);

        $response->assertStatus(Response::HTTP_OK);

        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'is_active' => false,
        ]);
    });

    it('enforces unique SKU constraints', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-0001-BRS', // Already exists
            'name' => 'Duplicate SKU',
            'unit' => 'kg',
            'minimum_stock' => 10.00,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['sku']);
    });

    it('allows updating material with same SKU (no unique violation)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->putJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}", [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-0001-BRS', // Same SKU
            'name' => 'Updated Name',
            'unit' => 'kg',
            'minimum_stock' => 20.00,
        ]);

        $response->assertStatus(Response::HTTP_OK);
    });

    it('rejects material creation with soft-deleted category', function () {
        Sanctum::actingAs($this->admin);

        // Soft delete the category
        $this->bumbuDapur->delete();

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => $this->bumbuDapur->id,
            'sku' => 'RM-DELETED-CAT',
            'name' => 'Deleted Category Material',
            'unit' => 'kg',
            'minimum_stock' => 10.00,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['category_id']);

        // Verify category is still soft-deleted
        $this->assertSoftDeleted('raw_material_categories', [
            'id' => $this->bumbuDapur->id,
        ]);
    });
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

describe('Idempotency Testing', function () {
    it('successfully updates material multiple times with same data', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-0001-BRS',
            'name' => 'Beras Premium',
            'unit' => 'kg',
            'minimum_stock' => 20.00,
            'is_active' => true,
        ];

        // Update twice with same data
        $this->putJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}", $payload)
            ->assertStatus(Response::HTTP_OK);

        $this->putJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}", $payload)
            ->assertStatus(Response::HTTP_OK);

        // Verify only one material exists with this SKU
        expect(RawMaterial::where('sku', 'RM-0001-BRS')->count())->toBe(1);
    });

    it('returns 404 when updating non-existent material', function () {
        Sanctum::actingAs($this->admin);

        $nonExistentId = 99999;

        $this->putJson("/api/v1/backoffice/inventory/materials/{$nonExistentId}", [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-NONEXISTENT',
            'name' => 'Non-existent',
            'unit' => 'kg',
            'minimum_stock' => 10.00,
        ])->assertStatus(Response::HTTP_NOT_FOUND);
    });

    it('returns 404 when showing non-existent material', function () {
        Sanctum::actingAs($this->admin);

        $nonExistentId = 99999;

        $this->getJson("/api/v1/backoffice/inventory/materials/{$nonExistentId}")
            ->assertStatus(Response::HTTP_NOT_FOUND);
    });

    it('returns 404 or 405 when attempting to delete via API (destroy excluded)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->deleteJson("/api/v1/backoffice/inventory/materials/{$this->beras->id}");

        expect(in_array($response->status(), [
            Response::HTTP_NOT_FOUND,
            Response::HTTP_METHOD_NOT_ALLOWED,
        ]))->toBeTrue();

        // Verify material still exists
        $this->assertDatabaseHas('raw_materials', [
            'id' => $this->beras->id,
            'deleted_at' => null,
        ]);
    });
});

// ==========================================
// 5. ERROR HANDLING & VALIDATION
// ==========================================

describe('Error Handling & Validation', function () {
    it('handles validation errors gracefully when creating material with empty payload', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', []);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['category_id', 'sku', 'name', 'unit', 'minimum_stock']);
    });

    it('handles validation error when category_id is invalid', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => 99999,
            'sku' => 'RM-INVALID-CAT',
            'name' => 'Invalid Category',
            'unit' => 'kg',
            'minimum_stock' => 10.00,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['category_id']);
    });

    it('handles validation error when sku exceeds max length', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => $this->bahanPokok->id,
            'sku' => str_repeat('A', 51), // 51 chars, max is 50
            'name' => 'Long SKU',
            'unit' => 'kg',
            'minimum_stock' => 10.00,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['sku']);
    });

    it('handles validation error when name exceeds max length', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-LONG-NAME',
            'name' => str_repeat('a', 151), // 151 chars, max is 150
            'unit' => 'kg',
            'minimum_stock' => 10.00,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['name']);
    });

    it('handles validation error when minimum_stock is negative', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-NEG-MIN',
            'name' => 'Negative Min Stock',
            'unit' => 'kg',
            'minimum_stock' => -5.00,
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['minimum_stock']);
    });

    it('handles validation error when minimum_stock is not numeric', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/materials', [
            'category_id' => $this->bahanPokok->id,
            'sku' => 'RM-NON-NUM',
            'name' => 'Non Numeric Min Stock',
            'unit' => 'kg',
            'minimum_stock' => 'not-a-number',
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['minimum_stock']);
    });

    it('caps per_page at 100 when requesting more', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?per_page=999999');

        $response->assertStatus(Response::HTTP_OK);

        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(100);
    });

    it('falls back to default per_page when input is invalid string', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?per_page=abc');

        // Should fallback gracefully (default 15), NOT error
        $response->assertStatus(Response::HTTP_OK);

        $meta = $response->json('meta');
        expect($meta['per_page'])->toBeGreaterThan(0);
        expect($meta['per_page'])->toBeLessThanOrEqual(100);
    });

    it('falls back to default per_page when input is zero', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?per_page=0');

        $response->assertStatus(Response::HTTP_OK);

        $meta = $response->json('meta');
        expect($meta['per_page'])->toBeGreaterThan(0);
    });
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

describe('Concurrency / Race Condition', function () {
    it('handles concurrent material creation requests safely', function () {
        Sanctum::actingAs($this->admin);

        $responses = [];
        for ($i = 1; $i <= 5; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/inventory/materials', [
                'category_id' => $this->bahanPokok->id,
                'sku' => "RM-CONCURRENT-{$i}",
                'name' => "Concurrent Material {$i}",
                'unit' => 'kg',
                'minimum_stock' => 10.00,
            ]);
        }

        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_CREATED);
        }

        expect(RawMaterial::where('sku', 'like', 'RM-CONCURRENT-%')->count())->toBe(5);
    });

    it('prevents duplicate SKU during concurrent creation', function () {
        Sanctum::actingAs($this->admin);

        $responses = [];
        for ($i = 1; $i <= 3; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/inventory/materials', [
                'category_id' => $this->bahanPokok->id,
                'sku' => 'RM-DUPLICATE-SKU',
                'name' => 'Duplicate SKU Material',
                'unit' => 'kg',
                'minimum_stock' => 10.00,
            ]);
        }

        $successCount = 0;
        $conflictCount = 0;

        foreach ($responses as $response) {
            if ($response->status() === Response::HTTP_CREATED) {
                $successCount++;
            } elseif ($response->status() === Response::HTTP_UNPROCESSABLE_ENTITY) {
                $conflictCount++;
            }
        }

        expect($successCount)->toBe(1);
        expect($conflictCount)->toBe(2);

        expect(RawMaterial::where('sku', 'RM-DUPLICATE-SKU')->count())->toBe(1);
    });

    it('handles concurrent update requests on same material safely', function () {
        Sanctum::actingAs($this->admin);

        $materialId = $this->beras->id;

        $responses = [];
        for ($i = 1; $i <= 3; $i++) {
            $responses[] = $this->putJson("/api/v1/backoffice/inventory/materials/{$materialId}", [
                'category_id' => $this->bahanPokok->id,
                'sku' => 'RM-0001-BRS',
                'name' => "Updated Material {$i}",
                'unit' => 'kg',
                'minimum_stock' => 20.00 + $i,
                'is_active' => true,
            ]);
        }

        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_OK);
        }

        $material = RawMaterial::find($materialId);
        expect(in_array($material->name, [
            'Updated Material 1',
            'Updated Material 2',
            'Updated Material 3',
        ]))->toBeTrue();
    });
});

// ==========================================
// 7. FILTER & SEARCH TESTING
// ==========================================

describe('Filter & Search Testing', function () {
    it('filters materials by keyword (name)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?search=' . urlencode('Beras'));

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        expect($data)->toHaveCount(1);
        expect($data[0]['name'])->toBe('Beras Premium');
    });

    it('filters materials by keyword (SKU)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?search=' . urlencode('RM-0002'));

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        expect($data)->toHaveCount(1);
        expect($data[0]['sku'])->toBe('RM-0002-GLA');
    });

    it('filters materials by category_id', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/v1/backoffice/inventory/materials?category_id={$this->bumbuDapur->id}");

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        expect($data)->toHaveCount(1);
        expect($data[0]['name'])->toBe('Garam Halus');
    });

    it('filters materials by is_active = true', function () {
        Sanctum::actingAs($this->admin);

        // Deactivate one material
        $this->gula->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?is_active=1');

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        $names = array_column($data, 'name');
        expect($names)->toContain('Beras Premium');
        expect($names)->not->toContain('Gula Pasir');
    });

    it('filters materials by is_active = false (inactive only)', function () {
        Sanctum::actingAs($this->admin);

        // Deactivate one material
        $this->gula->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?is_active=0');

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        $names = array_column($data, 'name');
        expect($names)->toContain('Gula Pasir');
        expect($names)->not->toContain('Beras Premium');
    });

    it('filters materials by is_low_stock', function () {
        Sanctum::actingAs($this->admin);

        // Garam: current 5 < min 10 → low stock
        // Beras: current 100.50 > min 20 → not low stock
        $response = $this->getJson('/api/v1/backoffice/inventory/materials?is_low_stock=1');

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        $names = array_column($data, 'name');
        expect($names)->toContain('Garam Halus');
        expect($names)->not->toContain('Beras Premium');
    });

    it('filters materials by is_out_of_stock', function () {
        Sanctum::actingAs($this->admin);

        // Set Garam stock = 0
        $this->garam->update(['current_stock' => 0]);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?is_out_of_stock=1');

        $response->assertStatus(Response::HTTP_OK);

        $data = $response->json('data');
        $names = array_column($data, 'name');
        expect($names)->toContain('Garam Halus');
        expect($names)->not->toContain('Beras Premium');
    });

    it('returns paginated results with correct meta', function () {
        Sanctum::actingAs($this->admin);

        // Create additional materials
        RawMaterial::factory()->count(20)->create([
            'category_id' => $this->bahanPokok->id,
        ]);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials?per_page=10&page=1');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonCount(10, 'data')
            ->assertJsonStructure([
                'data',
                'links' => [
                    'first',
                    'last',
                    'prev',
                    'next',
                ],
                'meta' => [
                    'current_page',
                    'from',
                    'last_page',
                    'path',
                    'per_page',
                    'to',
                    'total',
                ]
            ]);
    });
});

// ==========================================
// 8. PERFORMANCE TESTING
// ==========================================

describe('Performance Testing', function () {
    it('responds within acceptable time for material list', function () {
        Sanctum::actingAs($this->admin);

        $startTime = microtime(true);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials');

        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000;

        $response->assertStatus(Response::HTTP_OK);

        expect($responseTime)->toBeLessThan(500);
    });

    it('avoids N+1 query problem by eager loading category', function () {
        Sanctum::actingAs($this->admin);

        RawMaterial::factory()->count(10)->create([
            'category_id' => $this->bahanPokok->id,
        ]);

        \DB::enableQueryLog();

        $this->getJson('/api/v1/backoffice/inventory/materials');

        $queries = \DB::getQueryLog();

        // Should only have a few queries (not 1 + N)
        expect(count($queries))->toBeLessThan(5);
    });
});

// ==========================================
// 9. RATE LIMITING & THROTTLING
// ==========================================

describe('Rate Limiting & Throttling', function () {
    it('returns rate limit headers', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/materials');

        expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
        expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
    });
});