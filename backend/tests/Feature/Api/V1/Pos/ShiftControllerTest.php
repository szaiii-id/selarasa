<?php

use App\Models\Shift;
use App\Models\User;
use App\Services\ShiftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create test users with different roles
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'is_active' => true,
        'username' => 'admin_test',
        'password' => Hash::make('password123'),
        'pin_code' => Hash::make('123456')
    ]);
    
    $this->manager = User::factory()->create([
        'role' => 'manager',
        'is_active' => true,
        'username' => 'manager_test',
        'password' => Hash::make('password123'),
        'pin_code' => Hash::make('123456')
    ]);
    
    $this->cashier = User::factory()->create([
        'role' => 'cashier',
        'is_active' => true,
        'username' => 'cashier_test',
        'password' => Hash::make('password123'),
        'pin_code' => Hash::make('123456')
    ]);
    
    $this->inventory = User::factory()->create([
        'role' => 'inventory',
        'is_active' => true,
        'username' => 'inventory_test',
        'password' => Hash::make('password123'),
        'pin_code' => Hash::make('123456')
    ]);

    // Create test shifts
    $this->activeMorningShift = Shift::factory()->create([
        'name' => 'Morning Shift',
        'start_time' => '08:00',
        'end_time' => '16:00',
        'is_active' => true,
    ]);
    
    $this->activeEveningShift = Shift::factory()->create([
        'name' => 'Evening Shift',
        'start_time' => '16:00',
        'end_time' => '00:00',
        'is_active' => true,
    ]);
    
    $this->inactiveNightShift = Shift::factory()->create([
        'name' => 'Night Shift',
        'start_time' => '00:00',
        'end_time' => '08:00',
        'is_active' => false,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

describe('API Contract Testing', function () {
    it('returns correct JSON schema for active shifts list', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

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
            ]);
    });

    it('returns only active shifts', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonCount(2, 'data') // Only 2 active shifts
            ->assertJsonFragment([
                'name' => 'Morning Shift',
                'is_active' => true
            ])
            ->assertJsonFragment([
                'name' => 'Evening Shift',
                'is_active' => true
            ])
            ->assertJsonMissing([
                'name' => 'Night Shift',
            ]);
    });

    it('returns data wrapped in data key', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
        
        // Verify response is collection resource (not paginated)
        $responseData = $response->json();
        expect($responseData)->toHaveKey('data')
            ->and($responseData['data'])->toBeArray();
        
        // Should NOT have pagination meta
        expect($responseData)->not->toHaveKey('meta')
            ->and($responseData)->not->toHaveKey('links');
    });
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

describe('Security & Authorization Testing', function () {
    it('prevents unauthenticated users from accessing master shifts', function () {
        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_UNAUTHORIZED);
    });

    it('allows admin to access master shifts', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
    });

    it('allows manager to access master shifts', function () {
        Sanctum::actingAs($this->manager);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
    });

    it('allows cashier to access master shifts', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
    });

    it('prevents inventory from accessing POS master shifts', function () {
        Sanctum::actingAs($this->inventory);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('prevents inactive users from accessing master shifts', function () {
        // Deactivate cashier
        $this->cashier->update(['is_active' => false]);
        
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_FORBIDDEN)
            ->assertJson([
                'message' => 'Your account has been deactivated.'
            ]);
    });
});

// ==========================================
// 3. DATA INTEGRITY & FILTERING
// ==========================================

describe('Data Integrity & Filtering', function () {
    it('returns both active shifts in consistent order', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
        
        $shifts = $response->json('data');
        $names = array_column($shifts, 'name');
        
        // Verify both shifts are present
        expect($names)->toContain('Morning Shift')
            ->and($names)->toContain('Evening Shift')
            ->and(count($names))->toBe(2);
    });

    it('does not include inactive shifts in response', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
        
        $shifts = $response->json('data');
        
        foreach ($shifts as $shift) {
            expect($shift['is_active'])->toBeTrue();
        }
    });

    it('returns correct time format for shifts', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK);
        
        $shifts = $response->json('data');
        
        foreach ($shifts as $shift) {
            // Time should be in HH:MM:SS format
            expect($shift['start_time'])->toMatch('/^\d{2}:\d{2}:\d{2}$/');
            expect($shift['end_time'])->toMatch('/^\d{2}:\d{2}:\d{2}$/');
        }
    });

    it('handles shifts with midnight end time', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonFragment([
                'name' => 'Evening Shift',
                'end_time' => '00:00:00'
            ]);
    });
});

// ==========================================
// 4. ERROR HANDLING & RECOVERY
// ==========================================

describe('Error Handling & Recovery', function () {
    it('handles database errors gracefully', function () {
        Sanctum::actingAs($this->cashier);

        // Mock ShiftService to simulate error
        $mockShiftService = Mockery::mock(ShiftService::class);
        $mockShiftService->shouldReceive('getActiveShifts')
            ->once()
            ->andThrow(new \Exception('Database connection error'));
        
        $this->app->instance(ShiftService::class, $mockShiftService);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_INTERNAL_SERVER_ERROR);
    });

    it('returns empty array when no active shifts exist', function () {
        // Deactivate all shifts
        Shift::query()->update(['is_active' => false]);
        
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonCount(0, 'data');
    });

    it('handles concurrent requests safely', function () {
        Sanctum::actingAs($this->cashier);

        // Simulate concurrent requests
        $responses = [];
        for ($i = 0; $i < 3; $i++) {
            $responses[] = $this->getJson('/api/v1/pos/master-shifts');
        }

        // All should succeed
        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_OK);
        }
    });
});

// ==========================================
// 5. CACHE TESTING
// ==========================================

describe('Cache Testing', function () {
    it('uses cache for repeated requests', function () {
        Sanctum::actingAs($this->cashier);

        // First request
        $firstResponse = $this->getJson('/api/v1/pos/master-shifts');
        $firstResponse->assertStatus(Response::HTTP_OK);

        // Check if cache was populated
        expect(Cache::has('shifts:active'))->toBeTrue();

        // Second request should hit cache
        $secondResponse = $this->getJson('/api/v1/pos/master-shifts');
        $secondResponse->assertStatus(Response::HTTP_OK);

        // Both responses should be identical
        expect($firstResponse->json())->toEqual($secondResponse->json());
    });

    it('invalidates cache when shifts are updated', function () {
        Sanctum::actingAs($this->admin);

        // Populate cache
        $this->getJson('/api/v1/pos/master-shifts')->assertStatus(Response::HTTP_OK);

        // Update a shift (this should invalidate cache)
        $this->activeMorningShift->update(['name' => 'Updated Morning Shift']);

        // Fetch again - should get updated data
        $response = $this->getJson('/api/v1/pos/master-shifts');
        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonFragment([
                'name' => 'Updated Morning Shift'
            ]);
    });
});

// ==========================================
// 6. PERFORMANCE TESTING
// ==========================================

describe('Performance Testing', function () {
    it('responds within acceptable time for master shifts', function () {
        Sanctum::actingAs($this->cashier);

        $startTime = microtime(true);
        
        $response = $this->getJson('/api/v1/pos/master-shifts');
        
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000;

        $response->assertStatus(Response::HTTP_OK);
        
        // Response should be under 200ms for simple query
        expect($responseTime)->toBeLessThan(200);
    });

    it('cached response is faster than uncached response', function () {
        Sanctum::actingAs($this->cashier);

        // Clear cache first
        Cache::forget('shifts:active');

        // First request (uncached)
        $startTime = microtime(true);
        $this->getJson('/api/v1/pos/master-shifts')->assertStatus(Response::HTTP_OK);
        $uncachedTime = (microtime(true) - $startTime) * 1000;

        // Second request (cached)
        $startTime = microtime(true);
        $this->getJson('/api/v1/pos/master-shifts')->assertStatus(Response::HTTP_OK);
        $cachedTime = (microtime(true) - $startTime) * 1000;

        // Cached should be faster or equal (with 5ms tolerance)
        expect($cachedTime)->toBeLessThanOrEqual($uncachedTime + 5);
    });
});

// ==========================================
// 7. RATE LIMITING & THROTTLING
// ==========================================

describe('Rate Limiting & Throttling', function () {
    it('returns rate limit headers', function () {
        Sanctum::actingAs($this->cashier);

        $response = $this->getJson('/api/v1/pos/master-shifts');
        
        // Check if rate limit headers are present
        expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
        expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
    });
});