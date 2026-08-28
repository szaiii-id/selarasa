<?php

use App\Models\Shift;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
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
    
    // Create test shifts with format H:i (without seconds) to match API response
    $this->morningShift = Shift::factory()->create([
        'name' => 'Morning Shift',
        'start_time' => '08:00:00',
        'end_time' => '16:00:00',
        'is_active' => true,
    ]);
    
    $this->eveningShift = Shift::factory()->create([
        'name' => 'Evening Shift',
        'start_time' => '16:00:00',
        'end_time' => '23:59:00',
        'is_active' => true,
    ]);
    
    $this->inactiveShift = Shift::factory()->inactive()->create([
        'name' => 'Inactive Shift',
        'start_time' => '00:00:00',
        'end_time' => '07:59:00',
        'is_active' => false,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

it('returns correct JSON schema structure for shift list (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->getJson('/api/v1/backoffice/shifts');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'start_time',
                    'end_time',
                    'is_active',
                    'created_at',
                    'updated_at'
                ]
            ]
        ])
        ->assertJsonCount(3, 'data');
});

it('returns correct JSON schema for active shifts only (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->getJson('/api/v1/backoffice/shifts/active');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'start_time',
                    'end_time',
                    'is_active',
                    'created_at',
                    'updated_at'
                ]
            ]
        ])
        ->assertJsonCount(2, 'data')
        ->assertJsonFragment([
            'name' => 'Morning Shift',
            'is_active' => true,
        ])
        ->assertJsonFragment([
            'name' => 'Evening Shift',
            'is_active' => true,
        ])
        ->assertJsonMissing([
            'name' => 'Inactive Shift',
        ]);
});

it('returns correct JSON format when creating a shift (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'name' => 'Night Shift',
        'start_time' => '23:00',
        'end_time' => '07:00',
        'is_active' => true
    ];

    $response = $this->postJson('/api/v1/backoffice/shifts', $payload);

    $response->assertStatus(Response::HTTP_CREATED)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'name',
                'start_time',
                'end_time',
                'is_active',
                'created_at',
                'updated_at'
            ]
        ])
        ->assertJson([
            'message' => 'Shift schedule created successfully.',
            'data' => [
                'name' => 'Night Shift',
                'start_time' => '23:00', // Without seconds for create
                'end_time' => '07:00',   // Without seconds for create
                'is_active' => true
            ]
        ]);
});

it('returns correct schema when updating a shift (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'name' => 'Updated Morning Shift',
        'start_time' => '09:00',
        'end_time' => '17:00',
        'is_active' => true
    ];

    $response = $this->putJson("/api/v1/backoffice/shifts/{$this->morningShift->id}", $payload);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'name',
                'start_time',
                'end_time',
                'is_active',
                'created_at',
                'updated_at'
            ]
        ])
        ->assertJson([
            'message' => 'Shift schedule updated successfully.',
            'data' => [
                'name' => 'Updated Morning Shift',
                'is_active' => true
            ]
        ]);
});

it('returns 204 no content when deleting a shift (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->deleteJson("/api/v1/backoffice/shifts/{$this->morningShift->id}");

    $response->assertStatus(Response::HTTP_NO_CONTENT)
        ->assertNoContent();
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

it('prevents unauthenticated users from accessing shift endpoints (Security)', function () {
    $this->getJson('/api/v1/backoffice/shifts')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
    
    $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Test',
        'start_time' => '10:00',
        'end_time' => '18:00',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('prevents cashiers from accessing shift management (Authorization)', function () {
    Sanctum::actingAs($this->cashier);
    
    $this->getJson('/api/v1/backoffice/shifts')
        ->assertStatus(Response::HTTP_FORBIDDEN);
    
    $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Cashier Shift',
        'start_time' => '10:00',
        'end_time' => '18:00',
    ])->assertStatus(Response::HTTP_FORBIDDEN);
});

it('prevents inventory from accessing shift management (Authorization)', function () {
    Sanctum::actingAs($this->inventory);
    
    $this->getJson('/api/v1/backoffice/shifts')
        ->assertStatus(Response::HTTP_FORBIDDEN);
    
    $this->putJson("/api/v1/backoffice/shifts/{$this->morningShift->id}", [
        'name' => 'Inventory Update',
        'start_time' => '10:00',
        'end_time' => '18:00',
    ])->assertStatus(Response::HTTP_FORBIDDEN);
});

it('allows manager to manage shifts (Authorization)', function () {
    Sanctum::actingAs($this->manager);
    
    $this->getJson('/api/v1/backoffice/shifts')
        ->assertStatus(Response::HTTP_OK);
    
    $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Manager Created Shift',
        'start_time' => '10:00',
        'end_time' => '18:00',
    ])->assertStatus(Response::HTTP_CREATED);
});

it('prevents inactive users from accessing shift endpoints (Security)', function () {
    $inactiveAdmin = User::factory()->create([
        'role' => 'admin',
        'is_active' => false,
    ]);
    
    Sanctum::actingAs($inactiveAdmin);
    
    $this->getJson('/api/v1/backoffice/shifts')
        ->assertStatus(Response::HTTP_FORBIDDEN);
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

it('successfully creates shift with inactive status', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Temporary Shift',
        'start_time' => '20:00',
        'end_time' => '23:00',
        'is_active' => false
    ]);

    $response->assertStatus(Response::HTTP_CREATED);
    
    $this->assertDatabaseHas('shifts', [
        'name' => 'Temporary Shift',
        'is_active' => false
    ]);
});

it('successfully transitions shift from inactive to active', function () {
    Sanctum::actingAs($this->admin);

    $shiftId = $this->inactiveShift->id;

    $response = $this->putJson("/api/v1/backoffice/shifts/{$shiftId}", [
        'name' => 'Inactive Shift',
        'start_time' => '00:00',
        'end_time' => '07:59',
        'is_active' => true
    ]);

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('shifts', [
        'id' => $shiftId,
        'is_active' => true
    ]);
});

it('successfully transitions shift from active to inactive', function () {
    Sanctum::actingAs($this->admin);

    $shiftId = $this->morningShift->id;

    $response = $this->putJson("/api/v1/backoffice/shifts/{$shiftId}", [
        'name' => 'Morning Shift',
        'start_time' => '08:00',
        'end_time' => '16:00',
        'is_active' => false
    ]);

    $response->assertStatus(Response::HTTP_OK);
    
    $this->assertDatabaseHas('shifts', [
        'id' => $shiftId,
        'is_active' => false
    ]);
});

it('enforces unique shift name constraints (Data Integrity)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Morning Shift', // Already exists
        'start_time' => '10:00',
        'end_time' => '18:00',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['name'])
        ->assertJsonFragment([
            'name' => ['A shift with this name already exists.']
        ]);
});

it('enforces different start and end time constraint (Data Integrity)', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Same Time Shift',
        'start_time' => '08:00',
        'end_time' => '08:00',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['end_time'])
        ->assertJsonFragment([
            'end_time' => ['The end time must be different from the start time.']
        ]);
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

it('returns 404 when deleting a shift that has already been deleted', function () {
    Sanctum::actingAs($this->admin);

    $shiftId = $this->morningShift->id;

    // First delete - should succeed
    $this->deleteJson("/api/v1/backoffice/shifts/{$shiftId}")
        ->assertStatus(Response::HTTP_NO_CONTENT);

    // Second delete - should return 404
    $this->deleteJson("/api/v1/backoffice/shifts/{$shiftId}")
        ->assertStatus(Response::HTTP_NOT_FOUND);
});

it('successfully updates shift multiple times with same data', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'name' => 'Morning Shift',
        'start_time' => '08:00',
        'end_time' => '16:00',
        'is_active' => true
    ];

    // Update twice with same data
    $this->putJson("/api/v1/backoffice/shifts/{$this->morningShift->id}", $payload)
        ->assertStatus(Response::HTTP_OK);

    $this->putJson("/api/v1/backoffice/shifts/{$this->morningShift->id}", $payload)
        ->assertStatus(Response::HTTP_OK);

    // Verify only one shift exists with this name
    expect(Shift::where('name', 'Morning Shift')->count())->toBe(1);
});

it('returns 404 when updating non-existent shift', function () {
    Sanctum::actingAs($this->admin);

    $nonExistentId = 99999;
    
    $this->putJson("/api/v1/backoffice/shifts/{$nonExistentId}", [
        'name' => 'Non-existent',
        'start_time' => '10:00',
        'end_time' => '18:00',
    ])->assertStatus(Response::HTTP_NOT_FOUND);
});

it('returns 404 when deleting non-existent shift', function () {
    Sanctum::actingAs($this->admin);

    $nonExistentId = 99999;
    
    $this->deleteJson("/api/v1/backoffice/shifts/{$nonExistentId}")
        ->assertStatus(Response::HTTP_NOT_FOUND);
});

// ==========================================
// 5. ERROR HANDLING & VALIDATION
// ==========================================

it('handles validation errors gracefully when creating shift', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson('/api/v1/backoffice/shifts', []);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['name', 'start_time', 'end_time']);
});

it('handles invalid time format gracefully', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Invalid Time',
        'start_time' => '8:00', // Should be 08:00
        'end_time' => '16:00',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['start_time']);
});

it('handles name exceeding max length gracefully', function () {
    Sanctum::actingAs($this->admin);

    $response = $this->postJson('/api/v1/backoffice/shifts', [
        'name' => str_repeat('a', 101), // 101 characters, max is 100
        'start_time' => '08:00',
        'end_time' => '16:00',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['name']);
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

it('handles concurrent shift creation requests safely', function () {
    Sanctum::actingAs($this->admin);

    // Simulate concurrent requests with unique names
    $responses = [];
    for ($i = 1; $i <= 5; $i++) {
        $responses[] = $this->postJson('/api/v1/backoffice/shifts', [
            'name' => "Concurrent Shift {$i}",
            'start_time' => '10:00',
            'end_time' => '18:00',
        ]);
    }

    // All should succeed
    foreach ($responses as $response) {
        $response->assertStatus(Response::HTTP_CREATED);
    }

    // Verify all shifts were created
    expect(Shift::where('name', 'like', 'Concurrent Shift %')->count())->toBe(5);
});

it('handles concurrent update requests on same shift safely', function () {
    Sanctum::actingAs($this->admin);

    $shiftId = $this->morningShift->id;

    // Simulate concurrent updates
    $responses = [];
    for ($i = 1; $i <= 3; $i++) {
        $responses[] = $this->putJson("/api/v1/backoffice/shifts/{$shiftId}", [
            'name' => "Updated Shift {$i}",
            'start_time' => '08:00',
            'end_time' => '16:00',
            'is_active' => true
        ]);
    }

    // All should succeed
    foreach ($responses as $response) {
        $response->assertStatus(Response::HTTP_OK);
    }

    // Final state should be consistent
    $this->assertDatabaseHas('shifts', [
        'id' => $shiftId,
    ]);
    
    // Verify the name matches one of the updates
    $shift = Shift::find($shiftId);
    expect(in_array($shift->name, ['Updated Shift 1', 'Updated Shift 2', 'Updated Shift 3']))->toBeTrue();
});

// ==========================================
// 7. CACHE TESTING
// ==========================================

it('clears cache after shift creation', function () {
    Sanctum::actingAs($this->admin);

    // Clear cache first
    Cache::flush();
    
    // Populate cache by fetching shifts
    $this->getJson('/api/v1/backoffice/shifts')->assertStatus(Response::HTTP_OK);
    
    // Verify cache exists
    expect(Cache::has('shifts:all'))->toBeTrue();
    
    // Create new shift
    $this->postJson('/api/v1/backoffice/shifts', [
        'name' => 'Cache Test Shift',
        'start_time' => '20:00',
        'end_time' => '23:00',
    ])->assertStatus(Response::HTTP_CREATED);
    
    // Verify cache was cleared
    expect(Cache::has('shifts:all'))->toBeFalse();
    
    // Fetch again - should include new shift
    $response = $this->getJson('/api/v1/backoffice/shifts');
    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(4, 'data') // 3 original + 1 new
        ->assertJsonFragment([
            'name' => 'Cache Test Shift',
        ]);
});

it('clears cache after shift update', function () {
    Sanctum::actingAs($this->admin);

    // Clear cache and populate
    Cache::flush();
    $this->getJson('/api/v1/backoffice/shifts')->assertStatus(Response::HTTP_OK);
    expect(Cache::has('shifts:all'))->toBeTrue();
    
    // Update shift
    $this->putJson("/api/v1/backoffice/shifts/{$this->morningShift->id}", [
        'name' => 'Morning Shift',
        'start_time' => '08:00',
        'end_time' => '16:00',
        'is_active' => true
    ])->assertStatus(Response::HTTP_OK);
    
    // Verify cache was cleared
    expect(Cache::has('shifts:all'))->toBeFalse();
});

it('clears cache after shift deletion', function () {
    Sanctum::actingAs($this->admin);

    // Clear cache and populate
    Cache::flush();
    $this->getJson('/api/v1/backoffice/shifts')->assertStatus(Response::HTTP_OK);
    expect(Cache::has('shifts:all'))->toBeTrue();
    
    // Delete shift
    $this->deleteJson("/api/v1/backoffice/shifts/{$this->morningShift->id}")
        ->assertStatus(Response::HTTP_NO_CONTENT);
    
    // Verify cache was cleared
    expect(Cache::has('shifts:all'))->toBeFalse();
});

// ==========================================
// 8. PERFORMANCE TESTING
// ==========================================

it('responds within acceptable time for shift list', function () {
    Sanctum::actingAs($this->admin);

    // Clear cache for accurate measurement
    Cache::flush();
    
    $startTime = microtime(true);
    
    $response = $this->getJson('/api/v1/backoffice/shifts');
    
    $endTime = microtime(true);
    $responseTime = ($endTime - $startTime) * 1000; // Convert to milliseconds

    $response->assertStatus(Response::HTTP_OK);
    
    // Response should be under 500ms
    expect($responseTime)->toBeLessThan(500);
});

it('cached shift list responds faster than uncached', function () {
    Sanctum::actingAs($this->admin);

    // Clear cache for first request
    Cache::flush();
    
    // First request (uncached)
    $startTime = microtime(true);
    $this->getJson('/api/v1/backoffice/shifts')->assertStatus(Response::HTTP_OK);
    $uncachedTime = (microtime(true) - $startTime) * 1000;
    
    // Second request (cached)
    $startTime = microtime(true);
    $this->getJson('/api/v1/backoffice/shifts')->assertStatus(Response::HTTP_OK);
    $cachedTime = (microtime(true) - $startTime) * 1000;
    
    // Cached should be faster or equal
    expect($cachedTime)->toBeLessThanOrEqual($uncachedTime + 5); // 5ms tolerance
});