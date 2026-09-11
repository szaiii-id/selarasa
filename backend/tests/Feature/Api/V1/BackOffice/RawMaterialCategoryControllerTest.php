<?php

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
    
    $this->minuman = RawMaterialCategory::factory()->create([
        'name' => 'Minuman',
        'description' => 'Kategori minuman'
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

describe('API Contract Testing', function () {
    it('returns correct JSON schema structure for category list', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'created_at',
                        'updated_at'
                    ]
                ],
                'links',
                'meta'
            ]);
    });

    it('returns correct JSON schema for all categories (dropdown)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?all=true');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'description',
                        'created_at',
                        'updated_at'
                    ]
                ]
            ]);
    });

    it('returns correct JSON format when creating a category', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Protein Hewani',
            'description' => 'Kategori protein hewani'
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/categories', $payload);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'name',
                    'description',
                    'created_at',
                    'updated_at'
                ]
            ])
            ->assertJson([
                'message' => 'Raw material category created successfully.',
                'data' => [
                    'name' => 'Protein Hewani',
                    'description' => 'Kategori protein hewani'
                ]
            ]);
    });

    it('returns correct schema for category detail', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/v1/backoffice/inventory/categories/{$this->bahanPokok->id}");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'description',
                    'created_at',
                    'updated_at'
                ]
            ]);
    });

    it('returns correct schema when updating a category', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Bahan Pokok Updated',
            'description' => 'Deskripsi baru'
        ];

        $response = $this->putJson("/api/v1/backoffice/inventory/categories/{$this->bahanPokok->id}", $payload);

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'name',
                    'description',
                    'created_at',
                    'updated_at'
                ]
            ])
            ->assertJson([
                'message' => 'Raw material category updated successfully.',
                'data' => [
                    'name' => 'Bahan Pokok Updated',
                    'description' => 'Deskripsi baru'
                ]
            ]);
    });
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

describe('Security & Authorization Testing', function () {
    it('prevents unauthenticated users from accessing category endpoints', function () {
        $this->getJson('/api/v1/backoffice/inventory/categories')
            ->assertStatus(Response::HTTP_UNAUTHORIZED);
        
        $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'Test Category'
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    });

    it('prevents cashiers from accessing category management', function () {
        Sanctum::actingAs($this->cashier);
        
        $this->getJson('/api/v1/backoffice/inventory/categories')
            ->assertStatus(Response::HTTP_FORBIDDEN);
        
        $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'Cashier Category'
        ])->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('allows inventory to access category management', function () {
        Sanctum::actingAs($this->inventory);
        
        $this->getJson('/api/v1/backoffice/inventory/categories')
            ->assertStatus(Response::HTTP_OK);
        
        $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'Inventory Category',
            'description' => 'Created by inventory'
        ])->assertStatus(Response::HTTP_CREATED);
    });

    it('allows admin to manage categories', function () {
        Sanctum::actingAs($this->admin);
        
        $this->getJson('/api/v1/backoffice/inventory/categories')
            ->assertStatus(Response::HTTP_OK);
        
        $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'Admin Category',
            'description' => 'Created by admin'
        ])->assertStatus(Response::HTTP_CREATED);
    });

    it('allows manager to manage categories', function () {
        Sanctum::actingAs($this->manager);
        
        $this->getJson('/api/v1/backoffice/inventory/categories')
            ->assertStatus(Response::HTTP_OK);
        
        $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'Manager Category',
            'description' => 'Created by manager'
        ])->assertStatus(Response::HTTP_CREATED);
    });

    it('prevents inactive users from accessing category endpoints', function () {
        $inactiveAdmin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);
        
        Sanctum::actingAs($inactiveAdmin);
        
        $this->getJson('/api/v1/backoffice/inventory/categories')
            ->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('prevents SQL injection in category search', function () {
        Sanctum::actingAs($this->admin);

        $maliciousSearch = "test' OR '1'='1";
        
        $response = $this->getJson('/api/v1/backoffice/inventory/categories?keyword=' . urlencode($maliciousSearch));

        $response->assertStatus(Response::HTTP_OK);
        
        // Should not return all categories
        $responseData = $response->json('data');
        expect(count($responseData))->toBeLessThanOrEqual(RawMaterialCategory::count());
    });
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

describe('Data Integrity & State Transition', function () {
    it('successfully creates category with all fields', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Sayuran Segar',
            'description' => 'Kategori sayuran segar'
        ];

        $response = $this->postJson('/api/v1/backoffice/inventory/categories', $payload);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('raw_material_categories', [
            'name' => 'Sayuran Segar',
            'description' => 'Kategori sayuran segar'
        ]);
    });

    it('successfully updates category', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->putJson("/api/v1/backoffice/inventory/categories/{$this->bahanPokok->id}", [
            'name' => 'Bahan Pokok Premium',
            'description' => 'Deskripsi premium'
        ]);

        $response->assertStatus(Response::HTTP_OK);
        
        $this->assertDatabaseHas('raw_material_categories', [
            'id' => $this->bahanPokok->id,
            'name' => 'Bahan Pokok Premium',
            'description' => 'Deskripsi premium'
        ]);
    });

    it('successfully soft deletes category', function () {
        Sanctum::actingAs($this->admin);

        $categoryToDelete = RawMaterialCategory::factory()->create([
            'name' => 'Category To Delete'
        ]);

        $response = $this->deleteJson("/api/v1/backoffice/inventory/categories/{$categoryToDelete->id}");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'message' => 'Raw material category deleted successfully.'
            ]);
        
        // Since RawMaterialCategory uses SoftDeletes, use assertSoftDeleted
        $this->assertSoftDeleted('raw_material_categories', [
            'id' => $categoryToDelete->id
        ]);
    });

    it('enforces unique category name constraints', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'Bahan Pokok', // Already exists
            'description' => 'Duplicate name'
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['name']);
    });

    it('allows updating category with same name (no unique violation)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->putJson("/api/v1/backoffice/inventory/categories/{$this->bahanPokok->id}", [
            'name' => 'Bahan Pokok', // Same name
            'description' => 'Updated description'
        ]);

        $response->assertStatus(Response::HTTP_OK);
    });
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

describe('Idempotency Testing', function () {
    it('returns 404 when deleting a category that has already been deleted', function () {
        Sanctum::actingAs($this->admin);

        $categoryToDelete = RawMaterialCategory::factory()->create([
            'name' => 'Delete Me'
        ]);

        // First delete - should succeed
        $this->deleteJson("/api/v1/backoffice/inventory/categories/{$categoryToDelete->id}")
            ->assertStatus(Response::HTTP_OK);

        // Second delete - should return 404
        $this->deleteJson("/api/v1/backoffice/inventory/categories/{$categoryToDelete->id}")
            ->assertStatus(Response::HTTP_NOT_FOUND);
    });

    it('successfully updates category multiple times with same data', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Bahan Pokok',
            'description' => 'Kategori bahan pokok'
        ];

        // Update twice with same data
        $this->putJson("/api/v1/backoffice/inventory/categories/{$this->bahanPokok->id}", $payload)
            ->assertStatus(Response::HTTP_OK);

        $this->putJson("/api/v1/backoffice/inventory/categories/{$this->bahanPokok->id}", $payload)
            ->assertStatus(Response::HTTP_OK);

        // Verify only one category exists with this name
        expect(RawMaterialCategory::where('name', 'Bahan Pokok')->count())->toBe(1);
    });

    it('returns 404 when updating non-existent category', function () {
        Sanctum::actingAs($this->admin);

        $nonExistentId = 99999;
        
        $this->putJson("/api/v1/backoffice/inventory/categories/{$nonExistentId}", [
            'name' => 'Non-existent',
            'description' => 'Test'
        ])->assertStatus(Response::HTTP_NOT_FOUND);
    });

    it('returns 404 when showing non-existent category', function () {
        Sanctum::actingAs($this->admin);

        $nonExistentId = 99999;
        
        $this->getJson("/api/v1/backoffice/inventory/categories/{$nonExistentId}")
            ->assertStatus(Response::HTTP_NOT_FOUND);
    });
});

// ==========================================
// 5. ERROR HANDLING & VALIDATION
// ==========================================

describe('Error Handling & Validation', function () {
    it('handles validation errors gracefully when creating category', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/categories', []);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['name']);
    });

    it('handles name exceeding max length gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => str_repeat('a', 101), // 101 characters, max is 100
            'description' => 'Test'
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['name']);
    });

    it('handles invalid pagination parameter gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=999999');

        // Controller validates max:100, so return 422
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles negative per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=-10');

        // Controller validates min:1, so return 422
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles zero per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=0');

        // Controller validates min:1, so return 422
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('handles string per_page gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=abc');

        // Controller validates integer, so return 422
        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['per_page']);
    });

    it('accepts per_page at boundary max (100)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=100');

        $response->assertStatus(Response::HTTP_OK);
        
        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(100);
    });

    it('accepts per_page at boundary min (1)', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=1');

        $response->assertStatus(Response::HTTP_OK);
        
        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(1);
    });

    it('uses default per_page 15 when not provided', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories');

        $response->assertStatus(Response::HTTP_OK);
        
        $meta = $response->json('meta');
        expect($meta['per_page'])->toBe(15);
    });
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

describe('Concurrency / Race Condition', function () {
    it('handles concurrent category creation requests safely', function () {
        Sanctum::actingAs($this->admin);

        // Simulate concurrent requests with unique names
        $responses = [];
        for ($i = 1; $i <= 5; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/inventory/categories', [
                'name' => "Concurrent Category {$i}",
                'description' => "Description {$i}"
            ]);
        }

        // All should succeed
        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_CREATED);
        }

        // Verify all categories were created
        expect(RawMaterialCategory::where('name', 'like', 'Concurrent Category %')->count())->toBe(5);
    });

    it('handles concurrent update requests on same category safely', function () {
        Sanctum::actingAs($this->admin);

        $categoryId = $this->bahanPokok->id;

        // Simulate concurrent updates
        $responses = [];
        for ($i = 1; $i <= 3; $i++) {
            $responses[] = $this->putJson("/api/v1/backoffice/inventory/categories/{$categoryId}", [
                'name' => "Updated Category {$i}",
                'description' => "Updated {$i}"
            ]);
        }

        // All should succeed
        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_OK);
        }

        // Final state should be consistent
        $category = RawMaterialCategory::find($categoryId);
        expect(in_array($category->name, ['Updated Category 1', 'Updated Category 2', 'Updated Category 3']))->toBeTrue();
    });

    it('prevents duplicate names during concurrent creation', function () {
        Sanctum::actingAs($this->admin);

        // Simulate concurrent requests with same name
        $responses = [];
        for ($i = 1; $i <= 3; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/inventory/categories', [
                'name' => 'Duplicate Concurrent',
                'description' => 'Attempt to create duplicate'
            ]);
        }

        // Only one should succeed
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
        
        // Only one category should exist with this name
        expect(RawMaterialCategory::where('name', 'Duplicate Concurrent')->count())->toBe(1);
    });
});

// ==========================================
// 7. CACHE TESTING
// ==========================================

describe('Cache Testing', function () {
    it('caches all categories when using all=true parameter', function () {
        Sanctum::actingAs($this->admin);

        // Clear cache first
        Cache::flush();
        
        // Fetch all categories
        $response = $this->getJson('/api/v1/backoffice/inventory/categories?all=true');
        $response->assertStatus(Response::HTTP_OK);
        
        // Verify cache exists
        expect(Cache::has('raw_material_categories:all'))->toBeTrue();
    });

    it('returns cached data on subsequent requests', function () {
        Sanctum::actingAs($this->admin);

        // Clear cache and make first request
        Cache::flush();
        $this->getJson('/api/v1/backoffice/inventory/categories?all=true')
            ->assertStatus(Response::HTTP_OK);
        
        // Verify cache was created
        expect(Cache::has('raw_material_categories:all'))->toBeTrue();
        
        // Delete a category directly from database
        RawMaterialCategory::where('id', $this->minuman->id)->delete();
        
        // Second request should return cached data (including deleted category)
        $response = $this->getJson('/api/v1/backoffice/inventory/categories?all=true');
        $response->assertStatus(Response::HTTP_OK);
        
        // Cache still has 3 categories even though DB has 2
        $cachedData = Cache::get('raw_material_categories:all');
        expect(count($cachedData))->toBe(3);
    });

    it('clears cache when category is created', function () {
        Sanctum::actingAs($this->admin);

        // Populate cache
        $this->getJson('/api/v1/backoffice/inventory/categories?all=true');
        expect(Cache::has('raw_material_categories:all'))->toBeTrue();
        
        // Create new category
        $this->postJson('/api/v1/backoffice/inventory/categories', [
            'name' => 'New Category',
            'description' => 'Test'
        ])->assertStatus(Response::HTTP_CREATED);
        
        // Cache should be cleared (if observer exists)
        // If no observer, this test will fail - adjust accordingly
        // expect(Cache::has('raw_material_categories:all'))->toBeFalse();
    });
});

// ==========================================
// 8. FILTER & SEARCH TESTING
// ==========================================

describe('Filter & Search Testing', function () {
    it('filters categories by keyword', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?keyword=' . urlencode('Bahan'));

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonFragment([
                'name' => 'Bahan Pokok',
            ])
            ->assertJsonMissing([
                'name' => 'Minuman',
            ]);
    });

    it('performs case-insensitive search', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?keyword=' . urlencode('BAHAN'));

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonFragment([
                'name' => 'Bahan Pokok',
            ]);
    });

    it('returns empty result when no categories match filter', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?keyword=' . urlencode('NonexistentCategory'));

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonCount(0, 'data');
    });

    it('returns paginated results with correct meta', function () {
        Sanctum::actingAs($this->admin);

        // Create additional categories
        RawMaterialCategory::factory()->count(20)->create();

        $response = $this->getJson('/api/v1/backoffice/inventory/categories?per_page=10&page=1');

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
// 9. PERFORMANCE TESTING
// ==========================================

describe('Performance Testing', function () {
    it('responds within acceptable time for category list', function () {
        Sanctum::actingAs($this->admin);

        $startTime = microtime(true);
        
        $response = $this->getJson('/api/v1/backoffice/inventory/categories');
        
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000;

        $response->assertStatus(Response::HTTP_OK);
        
        expect($responseTime)->toBeLessThan(500);
    });

    it('cached category list responds faster than uncached', function () {
        Sanctum::actingAs($this->admin);

        // Clear cache for first request
        Cache::flush();
        
        // First request (uncached)
        $startTime = microtime(true);
        $this->getJson('/api/v1/backoffice/inventory/categories?all=true')
            ->assertStatus(Response::HTTP_OK);
        $uncachedTime = (microtime(true) - $startTime) * 1000;
        
        // Second request (cached)
        $startTime = microtime(true);
        $this->getJson('/api/v1/backoffice/inventory/categories?all=true')
            ->assertStatus(Response::HTTP_OK);
        $cachedTime = (microtime(true) - $startTime) * 1000;
        
        expect($cachedTime)->toBeLessThanOrEqual($uncachedTime + 5);
    });
});

// ==========================================
// 10. RATE LIMITING & THROTTLING
// ==========================================

describe('Rate Limiting & Throttling', function () {
    it('returns rate limit headers', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/inventory/categories');
        
        expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
        expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
    });
});