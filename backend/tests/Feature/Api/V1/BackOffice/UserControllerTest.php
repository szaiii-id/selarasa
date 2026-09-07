<?php

use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpFoundation\Response;

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

    // Create additional users for pagination testing
    User::factory()->count(20)->create([
        'role' => 'cashier',
        'is_active' => true
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

describe('API Contract Testing', function () {
    it('returns correct JSON schema structure for user list', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/users');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'username',
                        'name',
                        'role',
                        'is_active'
                    ]
                ],
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total'
                ]
            ]);
    });

    it('returns correct JSON format when creating a user with PIN', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'username' => 'new_user',
            'name' => 'New User',
            'password' => 'password123',
            'pin_code' => '654321',
            'role' => 'cashier',
            'is_active' => true
        ];

        $response = $this->postJson('/api/v1/backoffice/users', $payload);

        $response->assertStatus(Response::HTTP_CREATED)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'username',
                    'name',
                    'role',
                    'is_active',
                    'pin_code'
                ]
            ])
            ->assertJson([
                'message' => 'User created successfully.',
                'data' => [
                    'username' => 'new_user',
                    'role' => 'cashier',
                    'pin_code' => '654321'
                ]
            ]);
    });

    it('returns correct schema for user detail', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson("/api/v1/backoffice/users/{$this->cashier->id}");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id',
                    'username',
                    'name',
                    'role',
                    'is_active'
                ]
            ]);
    });

    it('returns 204 no content when deleting a user', function () {
        Sanctum::actingAs($this->admin);

        $userToDelete = User::factory()->create([
            'role' => 'cashier',
            'is_active' => true
        ]);

        $response = $this->deleteJson("/api/v1/backoffice/users/{$userToDelete->id}");

        $response->assertStatus(Response::HTTP_NO_CONTENT)
            ->assertNoContent();
    });
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

describe('Security & Authorization Testing', function () {
    it('prevents unauthenticated users from accessing user endpoints', function () {
        $this->getJson('/api/v1/backoffice/users')
            ->assertStatus(Response::HTTP_UNAUTHORIZED);
        
        $this->postJson('/api/v1/backoffice/users', [
            'username' => 'test',
            'password' => 'password',
            'role' => 'cashier'
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    });

    it('prevents cashiers from accessing user management', function () {
        Sanctum::actingAs($this->cashier);
        
        $this->getJson('/api/v1/backoffice/users')
            ->assertStatus(Response::HTTP_FORBIDDEN);
        
        $this->postJson('/api/v1/backoffice/users', [
            'username' => 'test',
            'password' => 'password',
            'role' => 'cashier'
        ])->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('prevents inventory from accessing user management', function () {
        Sanctum::actingAs($this->inventory);
        
        $this->getJson('/api/v1/backoffice/users')
            ->assertStatus(Response::HTTP_FORBIDDEN);
        
        $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", [
            'name' => 'Hacked'
        ])->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('allows manager to view users but not create admins', function () {
        Sanctum::actingAs($this->manager);
        
        // Manager can view users
        $this->getJson('/api/v1/backoffice/users')
            ->assertStatus(Response::HTTP_OK);
        
        // Manager cannot create admin - should get 422 validation error
        $response = $this->postJson('/api/v1/backoffice/users', [
            'username' => 'new_admin',
            'name' => 'New Admin',
            'password' => 'password123',
            'role' => 'admin',
            'is_active' => true
        ]);
        
        // Bisa 403 (forbidden) atau 422 (validation error)
        expect(in_array($response->status(), [
            Response::HTTP_FORBIDDEN, 
            Response::HTTP_UNPROCESSABLE_ENTITY
        ]))->toBeTrue();
    });

    it('prevents inactive users from accessing endpoints', function () {
        $inactiveAdmin = User::factory()->create([
            'role' => 'admin',
            'is_active' => false,
        ]);
        
        Sanctum::actingAs($inactiveAdmin);
        
        $this->getJson('/api/v1/backoffice/users')
            ->assertStatus(Response::HTTP_FORBIDDEN);
    });

    it('prevents SQL injection in username search', function () {
        Sanctum::actingAs($this->admin);

        $maliciousUsername = "admin' OR '1'='1";
        
        $response = $this->getJson('/api/v1/backoffice/users?search=' . urlencode($maliciousUsername));

        $response->assertStatus(Response::HTTP_OK);
        
        // Should not return all users
        $responseData = $response->json('data');
        expect(count($responseData))->toBeLessThan(User::count());
    });

    it('prevents privilege escalation when non-admin tries to modify admin', function () {
        Sanctum::actingAs($this->manager);
        
        // Try to modify admin account
        $this->putJson("/api/v1/backoffice/users/{$this->admin->id}", [
            'name' => 'Hacked Admin'
        ])->assertStatus(Response::HTTP_FORBIDDEN);
        
        // Try to assign admin role
        $response = $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", [
            'role' => 'admin'
        ]);
        
        // Bisa 403 atau 422
        expect(in_array($response->status(), [
            Response::HTTP_FORBIDDEN, 
            Response::HTTP_UNPROCESSABLE_ENTITY
        ]))->toBeTrue();
    });
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

describe('Data Integrity & State Transition', function () {
    it('successfully creates user with all fields', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'username' => 'complete_user',
            'name' => 'Complete User',
            'password' => 'secure123',
            'pin_code' => '987654',
            'role' => 'manager',
            'is_active' => true
        ];

        $response = $this->postJson('/api/v1/backoffice/users', $payload);

        $response->assertStatus(Response::HTTP_CREATED);
        
        $this->assertDatabaseHas('users', [
            'username' => 'complete_user',
            'name' => 'Complete User',
            'role' => 'manager',
            'is_active' => true
        ]);
        
        // Verify password is hashed
        $user = User::where('username', 'complete_user')->first();
        expect(Hash::check('secure123', $user->password))->toBeTrue();
        expect($user->password)->not->toBe('secure123');
    });

    it('successfully deactivates user using PATCH method', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->patchJson("/api/v1/backoffice/users/{$this->cashier->id}/deactivate");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'message' => 'User has been deactivated successfully.'
            ]);
        
        $this->assertDatabaseHas('users', [
            'id' => $this->cashier->id,
            'is_active' => false
        ]);
    });

    it('successfully activates user using PATCH method', function () {
        Sanctum::actingAs($this->admin);

        // Deactivate first using update
        $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", [
            'is_active' => false
        ])->assertStatus(Response::HTTP_OK);
        
        // Then activate
        $response = $this->patchJson("/api/v1/backoffice/users/{$this->cashier->id}/activate");

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'message' => 'User has been activated successfully.'
            ]);
        
        $this->assertDatabaseHas('users', [
            'id' => $this->cashier->id,
            'is_active' => true
        ]);
    });

    it('enforces unique username constraints', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/users', [
            'username' => 'admin_test', // Already exists
            'name' => 'Duplicate',
            'password' => 'password123',
            'role' => 'cashier'
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['username']);
    });

    it('updates user password and hashes it correctly', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", [
            'password' => 'new_password123'
        ]);

        $response->assertStatus(Response::HTTP_OK);
        
        $updatedUser = User::find($this->cashier->id);
        expect(Hash::check('new_password123', $updatedUser->password))->toBeTrue();
    });

    it('updates user PIN and returns it in response', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", [
            'pin_code' => '111222'
        ]);

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'data' => [
                    'pin_code' => '111222'
                ]
            ]);
        
        $updatedUser = User::find($this->cashier->id);
        expect(Hash::check('111222', $updatedUser->pin_code))->toBeTrue();
    });
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

describe('Idempotency Testing', function () {
    it('returns 404 when deleting a user that has already been deleted', function () {
        Sanctum::actingAs($this->admin);

        $userToDelete = User::factory()->create([
            'role' => 'cashier',
            'is_active' => true
        ]);

        // First delete - should succeed
        $this->deleteJson("/api/v1/backoffice/users/{$userToDelete->id}")
            ->assertStatus(Response::HTTP_NO_CONTENT);

        // Second delete - should return 404
        $this->deleteJson("/api/v1/backoffice/users/{$userToDelete->id}")
            ->assertStatus(Response::HTTP_NOT_FOUND);
    });

    it('successfully updates user multiple times with same data', function () {
        Sanctum::actingAs($this->admin);

        $payload = [
            'name' => 'Cashier Test',
            'is_active' => true
        ];

        // Update twice with same data
        $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", $payload)
            ->assertStatus(Response::HTTP_OK);

        $this->putJson("/api/v1/backoffice/users/{$this->cashier->id}", $payload)
            ->assertStatus(Response::HTTP_OK);

        // Verify only one user exists
        expect(User::where('id', $this->cashier->id)->count())->toBe(1);
    });
});

// ==========================================
// 5. ERROR HANDLING & RECOVERY
// ==========================================

describe('Error Handling & Recovery', function () {
    it('handles validation errors gracefully when creating user', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/users', []);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['username', 'password', 'role']);
    });

    it('handles invalid PIN code format gracefully', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->postJson('/api/v1/backoffice/users', [
            'username' => 'invalid_pin',
            'name' => 'Invalid PIN',
            'password' => 'password123',
            'pin_code' => '123', // Should be 6 digits
            'role' => 'cashier'
        ]);

        $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
            ->assertJsonValidationErrors(['pin_code']);
    });

    it('handles database errors gracefully', function () {
        Sanctum::actingAs($this->admin);

        // Mock UserService to simulate error
        $mockUserService = Mockery::mock(UserService::class);
        $mockUserService->shouldReceive('getPaginatedUsers')
            ->once()
            ->andThrow(new Exception('Database connection error'));
        
        $this->app->instance(UserService::class, $mockUserService);

        $response = $this->getJson('/api/v1/backoffice/users');

        $response->assertStatus(Response::HTTP_INTERNAL_SERVER_ERROR);
    });

    it('logs errors when operations fail', function () {
        Sanctum::actingAs($this->admin);
        
        Log::shouldReceive('error')->once();

        // Mock UserService to simulate error
        $mockUserService = Mockery::mock(UserService::class);
        $mockUserService->shouldReceive('getPaginatedUsers')
            ->once()
            ->andThrow(new Exception('Test error'));
        
        $this->app->instance(UserService::class, $mockUserService);

        $response = $this->getJson('/api/v1/backoffice/users');
        
        $response->assertStatus(Response::HTTP_INTERNAL_SERVER_ERROR);
    });
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

describe('Concurrency / Race Condition', function () {
    it('handles concurrent user creation requests safely', function () {
        Sanctum::actingAs($this->admin);

        // Simulate concurrent requests with unique usernames
        $responses = [];
        for ($i = 1; $i <= 5; $i++) {
            $responses[] = $this->postJson('/api/v1/backoffice/users', [
                'username' => "concurrent_user_{$i}",
                'name' => "Concurrent User {$i}",
                'password' => 'password123',
                'role' => 'cashier'
            ]);
        }

        // All should succeed
        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_CREATED);
        }

        // Verify all users were created
        expect(User::where('username', 'like', 'concurrent_user_%')->count())->toBe(5);
    });

    it('handles concurrent update requests on same user safely', function () {
        Sanctum::actingAs($this->admin);

        $userId = $this->cashier->id;

        // Simulate concurrent updates
        $responses = [];
        for ($i = 1; $i <= 3; $i++) {
            $responses[] = $this->putJson("/api/v1/backoffice/users/{$userId}", [
                'name' => "Updated Name {$i}"
            ]);
        }

        // All should succeed
        foreach ($responses as $response) {
            $response->assertStatus(Response::HTTP_OK);
        }

        // Final state should be consistent
        $user = User::find($userId);
        expect(in_array($user->name, ['Updated Name 1', 'Updated Name 2', 'Updated Name 3']))->toBeTrue();
    });
});

// ==========================================
// 7. PERFORMANCE TESTING
// ==========================================

describe('Performance Testing', function () {
    it('responds within acceptable time for user list', function () {
        Sanctum::actingAs($this->admin);

        $startTime = microtime(true);
        
        $response = $this->getJson('/api/v1/backoffice/users');
        
        $endTime = microtime(true);
        $responseTime = ($endTime - $startTime) * 1000;

        $response->assertStatus(Response::HTTP_OK);
        
        // Response should be under 500ms
        expect($responseTime)->toBeLessThan(500);
    });
});

// ==========================================
// 8. RATE LIMITING & THROTTLING
// ==========================================

describe('Rate Limiting & Throttling', function () {
    it('returns rate limit headers', function () {
        Sanctum::actingAs($this->admin);

        $response = $this->getJson('/api/v1/backoffice/users');
        
        // Check if rate limit headers are present
        expect($response->headers->has('X-RateLimit-Limit'))->toBeTrue();
        expect($response->headers->has('X-RateLimit-Remaining'))->toBeTrue();
    });
});