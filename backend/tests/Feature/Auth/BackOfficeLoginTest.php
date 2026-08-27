<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Siapkan akun Admin (Valid untuk Back Office)
    $this->adminUser = User::factory()->create([
        'username'  => 'admin_bo',
        'password'  => Hash::make('secret123'),
        'role'      => 'admin',
        'is_active' => true,
    ]);
    
    // Clear rate limiter sebelum setiap test untuk isolasi yang bersih
    RateLimiter::clear('127.0.0.1');
});

afterEach(function () {
    // Cleanup rate limiter setelah setiap test
    RateLimiter::clear('127.0.0.1');
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================

it('returns correct json schema on successful Back Office login', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'user' => [
                    'id',
                    'name',
                    'username',
                    'role',
                    'is_active',
                    'joined_at'
                ]
            ]
        ])
        ->assertJson([
            'message' => 'Login Successful.',
            'data' => [
                'user' => [
                    'username' => 'admin_bo',
                    'role' => 'admin',
                    'is_active' => true
                ]
            ]
        ]);
        
    $this->assertAuthenticated();
});

it('updates last_login_at and last_login_ip after successful login', function () {
    $beforeLogin = now();
    
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    $this->adminUser->refresh();
    
    expect($this->adminUser->last_login_at)
        ->not->toBeNull()
        ->and($this->adminUser->last_login_at->timestamp)
        ->toBeGreaterThanOrEqual($beforeLogin->timestamp)
        ->and($this->adminUser->last_login_ip)
        ->not->toBeNull();
});

it('does not leak sensitive data in login response', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonMissing(['password'])
        ->assertJsonMissing(['password_hash'])
        ->assertJsonMissing(['remember_token'])
        ->assertJsonMissing(['pin_code'])
        ->assertJsonMissing(['last_login_ip']);
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING (RBAC)
// ==========================================

it('allows admin role to access Back Office successfully', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'admin_bo',
                    'role' => 'admin'
                ]
            ]
        ]);
});

it('allows manager role to access Back Office successfully', function () {
    User::factory()->create([
        'username' => 'manager_bo',
        'password' => Hash::make('secret123'),
        'role'     => 'manager',
        'is_active'=> true,
    ]);

    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'manager_bo',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'manager_bo',
                    'role' => 'manager'
                ]
            ]
        ]);
});

it('allows inventory staff to access Back Office successfully', function () {
    User::factory()->create([
        'username' => 'staff_gudang',
        'password' => Hash::make('secret123'),
        'role'     => 'inventory',
        'is_active'=> true,
    ]);

    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'staff_gudang',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'staff_gudang',
                    'role' => 'inventory'
                ]
            ]
        ]);
});

it('rejects cashier role from accessing Back Office', function () {
    User::factory()->create([
        'username' => 'kasir_budi',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> true,
    ]);

    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'kasir_budi',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Invalid credentials or insufficient permissions to access this area.'
        ]);
    
    $this->assertGuest();
});

it('rejects inactive users', function () {
    User::factory()->create([
        'username' => 'inactive_admin',
        'password' => Hash::make('secret123'),
        'role'     => 'admin',
        'is_active'=> false,
    ]);

    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'inactive_admin',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Your account has been deactivated. Please contact the manager.'
        ]);
    
    $this->assertGuest();
});

it('rejects invalid password', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ]);

    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Invalid username or password.'
        ]);
    
    $this->assertGuest();
});

it('rejects non-existent username', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'nonexistent_user',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Invalid username or password.'
        ]);
    
    $this->assertGuest();
});

it('rejects missing fields with validation errors', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => '',
        'password' => '',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['username', 'password'])
        ->assertJson([
            'errors' => [
                'username' => ['The username field is required to log in.'],
                'password' => ['The password field is required to log in.'],
            ]
        ]);
});

it('rejects username exceeding 255 characters', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => str_repeat('a', 256),
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['username']);
});

it('rejects password exceeding 255 characters', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => str_repeat('a', 256),
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['password']);
});

// ==========================================
// 3. RATE LIMITING & THROTTLING
// ==========================================

it('blocks login after 5 failed attempts per minute', function () {
    // 5 failed login attempts
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/backoffice/auth/login', [
            'username' => 'admin_bo',
            'password' => 'wrong_password',
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    // 6th attempt should be blocked
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_TOO_MANY_REQUESTS)
    ->assertJson([
        'message' => 'Too Many Attempts.'
    ]);
});

it('applies rate limits based on IP address across different users', function () {
    // Create another user
    User::factory()->create([
        'username' => 'another_user',
        'password' => Hash::make('secret123'),
        'role'     => 'admin',
        'is_active'=> true,
    ]);

    // Exhaust rate limit with admin_bo (5 requests)
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/backoffice/auth/login', [
            'username' => 'admin_bo',
            'password' => 'wrong_password',
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    // 6th request with admin_bo should be blocked
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);

    // another_user from same IP should also be blocked
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'another_user',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);
});

it('allows requests from different IP addresses after one IP is blocked', function () {
    // Clear rate limiters for both IPs
    RateLimiter::clear('127.0.0.1');
    RateLimiter::clear('10.0.0.1');
    
    // Exhaust rate limit from first IP (5 requests)
    for ($i = 0; $i < 5; $i++) {
        $this->postJson(
            '/api/v1/backoffice/auth/login',
            [
                'username' => 'admin_bo',
                'password' => 'wrong_password',
            ],
            ['REMOTE_ADDR' => '127.0.0.1']
        )->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    // First IP should be blocked (6th request)
    $this->postJson(
        '/api/v1/backoffice/auth/login',
        [
            'username' => 'admin_bo',
            'password' => 'wrong_password',
        ],
        ['REMOTE_ADDR' => '127.0.0.1']
    )->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);

    // Different IP should NOT be blocked
    $this->postJson(
        '/api/v1/backoffice/auth/login',
        [
            'username' => 'admin_bo',
            'password' => 'wrong_password',
        ],
        ['REMOTE_ADDR' => '10.0.0.1']
    )->assertStatus(Response::HTTP_UNAUTHORIZED);
});

// ==========================================
// 4. SESSION MANAGEMENT
// ==========================================

it('maintains authenticated session after successful login', function () {
    // Login
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // Access protected endpoint
    $this->getJson('/api/v1/backoffice/users')
        ->assertStatus(Response::HTTP_OK);

    // Should still be authenticated
    $this->assertAuthenticated();
});

it('does not create session when login fails', function () {
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);

    $this->assertGuest();
});

it('does not create session when role is unauthorized', function () {
    User::factory()->create([
        'username' => 'kasir_budi',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> true,
    ]);

    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'kasir_budi',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_FORBIDDEN);

    $this->assertGuest();
});

it('does not update last_login_at when login fails', function () {
    $originalLastLogin = $this->adminUser->last_login_at;

    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);

    $this->adminUser->refresh();
    expect($this->adminUser->last_login_at)->toBe($originalLastLogin);
});