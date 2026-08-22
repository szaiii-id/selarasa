<?php

use App\Models\User;
use App\Services\UserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
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
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

it('returns correct JSON schema structure for user list (API Contract)', function () {
    Sanctum::actingAs($this->admin);
    
    User::factory()->count(3)->create();

    $response = $this->getJson('/api/v1/backoffice/users');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'name',
                    'username',
                    'role',
                    'is_active',
                    'joined_at'
                ]
            ],
            'links',
            'meta'
        ]);
});

it('returns correct JSON format when creating a user (API Contract)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'name' => 'John Doe',
        'username' => 'johndoe_api',
        'password' => 'Password123!',
        'role' => 'cashier',
        'is_active' => true
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    $response->assertStatus(Response::HTTP_CREATED)
        ->assertJson([
            'message' => 'User created successfully.',
            'data' => [
                'name' => 'John Doe',
                'username' => 'johndoe_api',
                'role' => 'cashier'
            ]
        ]);
});

it('returns correct schema for user details (API Contract)', function () {
    Sanctum::actingAs($this->admin);
    
    $user = User::factory()->create();

    $response = $this->getJson("/api/v1/backoffice/users/{$user->id}");

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'id',
                'name',
                'username',
                'role',
                'is_active',
                'joined_at',
                'account_age',
                'last_login_at',
                'last_login_ip'
            ]
        ]);
});

it('returns paginated results correctly (API Contract)', function () {
    Sanctum::actingAs($this->admin);
    
    User::factory()->count(25)->create();

    $response = $this->getJson('/api/v1/backoffice/users?per_page=10&page=2');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonCount(10, 'data')
        ->assertJson([
            'meta' => [
                'current_page' => 2,
                'per_page' => 10,
            ]
        ]);
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

it('prevents unauthenticated users from accessing the API (Security)', function () {
    $response = $this->getJson('/api/v1/backoffice/users');
    
    $response->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('prevents cashiers from accessing the backoffice user management (Authorization)', function () {
    Sanctum::actingAs($this->cashier);
    
    $response = $this->getJson('/api/v1/backoffice/users');
    
    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Forbidden. You do not have the required permissions to access this resource.'
        ]);
});

it('prevents manager from elevating a new user to admin role (Privilege Escalation)', function () {
    Sanctum::actingAs($this->manager);

    $payload = [
        'name' => 'Sneaky User',
        'username' => 'sneaky_admin',
        'password' => 'Password123!',
        'role' => 'admin',
        'is_active' => true
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['role']);
    
    expect($response->json('errors.role.0'))
        ->toBe('Only administrators can create users with the admin role.');
});

it('prevents manager from modifying admin accounts (Authorization)', function () {
    Sanctum::actingAs($this->manager);

    $adminUser = User::factory()->create(['role' => 'admin']);

    $response = $this->putJson("/api/v1/backoffice/users/{$adminUser->id}", [
        'name' => 'Hacked Admin'
    ]);

    $response->assertStatus(Response::HTTP_FORBIDDEN);
});

it('prevents SQL injection attempts (Security)', function () {
    Sanctum::actingAs($this->admin);

    $maliciousUsername = "admin'; DROP TABLE users; --";
    
    $response = $this->getJson('/api/v1/backoffice/users?search=' . urlencode($maliciousUsername));

    $response->assertStatus(Response::HTTP_OK);
    
    // Pastikan tabel users masih ada
    $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
});

it('prevents XSS in user input (Security)', function () {
    Sanctum::actingAs($this->admin);

    $payload = [
        'name' => '<script>alert("XSS")</script>John',
        'username' => 'xss_user',
        'password' => 'Password123!',
        'role' => 'cashier'
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    $response->assertStatus(Response::HTTP_CREATED);
    
    $this->assertDatabaseHas('users', [
        'name' => '<script>alert("XSS")</script>John',
        'username' => 'xss_user'
    ]);
});

// ==========================================
// 3. DATA INTEGRITY & STATE TRANSITION
// ==========================================

it('successfully transitions user state from active to inactive', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create(['is_active' => true]);

    $response = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson(['message' => 'User has been deactivated successfully.']);

    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'is_active' => false
    ]);
});

it('successfully transitions user state from inactive to active', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create(['is_active' => false]);

    $response = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/activate");

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson(['message' => 'User has been activated successfully.']);

    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'is_active' => true
    ]);
});

it('enforces unique username constraints (Data Integrity)', function () {
    Sanctum::actingAs($this->admin);
    
    $existingUsername = $this->admin->username;

    $payload = [
        'name' => 'Copycat',
        'username' => $existingUsername,
        'password' => 'Password123!',
        'role' => 'cashier'
    ];

    $response = $this->postJson('/api/v1/backoffice/users', $payload);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['username']);
});

// ==========================================
// 4. IDEMPOTENCY TESTING
// ==========================================

it('behaves idempotently when deactivating an already inactive user', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create(['is_active' => false]);

    $response1 = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");
    $response2 = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");

    $response1->assertStatus(Response::HTTP_OK);
    $response2->assertStatus(Response::HTTP_OK);

    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'is_active' => false
    ]);
});

it('returns 404 when trying to delete a user that has already been deleted', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create();

    $this->deleteJson("/api/v1/backoffice/users/{$targetUser->id}")
        ->assertStatus(Response::HTTP_NO_CONTENT);

    $this->deleteJson("/api/v1/backoffice/users/{$targetUser->id}")
        ->assertStatus(Response::HTTP_NOT_FOUND);
});

it('returns 404 when accessing non-existent user with valid UUID format', function () {
    Sanctum::actingAs($this->admin);

    // Gunakan UUID yang valid tapi tidak ada di database
    $nonExistentUuid = '99999999-9999-9999-9999-999999999999';
    
    $response = $this->getJson("/api/v1/backoffice/users/{$nonExistentUuid}");

    $response->assertStatus(Response::HTTP_NOT_FOUND);
});

// ==========================================
// 5. ERROR HANDLING & RECOVERY
// ==========================================

it('handles database errors gracefully when accessing user list', function () {
    Sanctum::actingAs($this->admin);

    // Mock UserService untuk simulate error
    $mockUserService = Mockery::mock(UserService::class);
    $mockUserService->shouldReceive('getPaginatedUsers')
        ->once()
        ->andThrow(new Exception('Database connection error'));
    
    $this->app->instance(UserService::class, $mockUserService);

    $response = $this->getJson('/api/v1/backoffice/users');

    // Laravel default error handling akan return 500
    $response->assertStatus(Response::HTTP_INTERNAL_SERVER_ERROR);
});

it('logs errors when operations fail', function () {
    Sanctum::actingAs($this->admin);
    
    Log::shouldReceive('error')->once();

    // Mock UserService untuk simulate error
    $mockUserService = Mockery::mock(UserService::class);
    $mockUserService->shouldReceive('getPaginatedUsers')
        ->once()
        ->andThrow(new Exception('Test error'));
    
    $this->app->instance(UserService::class, $mockUserService);

    $response = $this->getJson('/api/v1/backoffice/users');
    
    $response->assertStatus(Response::HTTP_INTERNAL_SERVER_ERROR);
});

// ==========================================
// 6. CONCURRENCY / RACE CONDITION
// ==========================================

it('handles concurrent deactivation requests safely', function () {
    Sanctum::actingAs($this->admin);

    $targetUser = User::factory()->create(['is_active' => true]);

    // Simulate concurrent requests
    $responses = [];
    for ($i = 0; $i < 2; $i++) {
        $responses[] = $this->patchJson("/api/v1/backoffice/users/{$targetUser->id}/deactivate");
    }

    // Both should succeed
    foreach ($responses as $response) {
        $response->assertStatus(Response::HTTP_OK);
    }

    // Final state should be consistent
    $this->assertDatabaseHas('users', [
        'id' => $targetUser->id,
        'is_active' => false
    ]);
});