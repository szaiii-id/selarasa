<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Siapkan akun Manager (Valid untuk POS)
    $this->managerUser = User::factory()->create([
        'username'  => 'manager_pos',
        'password'  => Hash::make('secret123'),
        'role'      => 'manager',
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

it('returns correct json schema on successful POS Terminal login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
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
                    'username' => 'manager_pos',
                    'role' => 'manager',
                    'is_active' => true
                ]
            ]
        ]);
        
    $this->assertAuthenticated();
});

it('updates last_login_at and last_login_ip after successful POS login', function () {
    $beforeLogin = now();
    
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    $this->managerUser->refresh();
    
    expect($this->managerUser->last_login_at)
        ->not->toBeNull()
        ->and($this->managerUser->last_login_at->timestamp)
        ->toBeGreaterThanOrEqual($beforeLogin->timestamp)
        ->and($this->managerUser->last_login_ip)
        ->not->toBeNull();
});

it('does not leak sensitive data in POS login response', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
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

it('allows admin role to access POS Terminal successfully', function () {
    User::factory()->create([
        'username' => 'admin_pos',
        'password' => Hash::make('secret123'),
        'role'     => 'admin',
        'is_active'=> true,
    ]);

    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'admin_pos',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'admin_pos',
                    'role' => 'admin'
                ]
            ]
        ]);
});

it('allows manager role to access POS Terminal successfully', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'manager_pos',
                    'role' => 'manager'
                ]
            ]
        ]);
});

it('allows cashier role to access POS Terminal successfully', function () {
    User::factory()->create([
        'username' => 'cashier_siti',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> true,
    ]);

    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'cashier_siti',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'cashier_siti',
                    'role' => 'cashier'
                ]
            ]
        ]);
});

it('rejects inventory role from accessing POS Terminal', function () {
    User::factory()->create([
        'username' => 'staff_gudang',
        'password' => Hash::make('secret123'),
        'role'     => 'inventory',
        'is_active'=> true,
    ]);

    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'staff_gudang',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Invalid credentials or insufficient permissions to access this area.'
        ]);
    
    $this->assertGuest();
});

it('rejects inactive users from POS Terminal', function () {
    User::factory()->create([
        'username' => 'inactive_cashier',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> false,
    ]);

    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'inactive_cashier',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Your account has been deactivated. Please contact the manager.'
        ]);
    
    $this->assertGuest();
});

it('rejects invalid password on POS login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'wrong_password',
    ]);

    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Invalid username or password.'
        ]);
    
    $this->assertGuest();
});

it('rejects non-existent username on POS login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'nonexistent_user',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Invalid username or password.'
        ]);
    
    $this->assertGuest();
});

it('rejects missing fields with validation errors on POS login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
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

it('rejects username exceeding 255 characters on POS login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => str_repeat('a', 256),
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['username']);
});

it('rejects password exceeding 255 characters on POS login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => str_repeat('a', 256),
    ]);

    $response->assertStatus(Response::HTTP_UNPROCESSABLE_ENTITY)
        ->assertJsonValidationErrors(['password']);
});

// ==========================================
// 3. RATE LIMITING & THROTTLING
// ==========================================

it('blocks POS login after 5 failed attempts per minute', function () {
    // 5 failed login attempts
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/pos/auth/login', [
            'username' => 'manager_pos',
            'password' => 'wrong_password',
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    // 6th attempt should be blocked
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_TOO_MANY_REQUESTS)
    ->assertJson([
        'message' => 'Too Many Attempts.'
    ]);
});

it('shares rate limit between POS and Back Office login from same IP', function () {
    // Create admin user for Back Office
    User::factory()->create([
        'username' => 'admin_bo',
        'password' => Hash::make('secret123'),
        'role'     => 'admin',
        'is_active'=> true,
    ]);

    // Exhaust rate limit via POS login (3 requests)
    for ($i = 0; $i < 3; $i++) {
        $this->postJson('/api/v1/pos/auth/login', [
            'username' => 'manager_pos',
            'password' => 'wrong_password',
        ])->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    // Try Back Office login (2 more requests)
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);

    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);

    // 6th request (either endpoint) should be blocked
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
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
            '/api/v1/pos/auth/login',
            [
                'username' => 'manager_pos',
                'password' => 'wrong_password',
            ],
            ['REMOTE_ADDR' => '127.0.0.1']
        )->assertStatus(Response::HTTP_UNAUTHORIZED);
    }

    // First IP should be blocked (6th request)
    $this->postJson(
        '/api/v1/pos/auth/login',
        [
            'username' => 'manager_pos',
            'password' => 'wrong_password',
        ],
        ['REMOTE_ADDR' => '127.0.0.1']
    )->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);

    // Different IP should NOT be blocked
    $this->postJson(
        '/api/v1/pos/auth/login',
        [
            'username' => 'manager_pos',
            'password' => 'wrong_password',
        ],
        ['REMOTE_ADDR' => '10.0.0.1']
    )->assertStatus(Response::HTTP_UNAUTHORIZED);
});

// ==========================================
// 4. SESSION MANAGEMENT
// ==========================================

it('maintains authenticated session after successful POS login', function () {
    // Login
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // Access protected endpoint
    $this->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_OK);

    // Should still be authenticated
    $this->assertAuthenticated();
});

it('does not create session when POS login fails', function () {
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);

    $this->assertGuest();
});

it('does not create session when role is unauthorized for POS', function () {
    User::factory()->create([
        'username' => 'staff_gudang',
        'password' => Hash::make('secret123'),
        'role'     => 'inventory',
        'is_active'=> true,
    ]);

    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'staff_gudang',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_FORBIDDEN);

    $this->assertGuest();
});

it('does not update last_login_at when POS login fails', function () {
    $originalLastLogin = $this->managerUser->last_login_at;

    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'wrong_password',
    ])->assertStatus(Response::HTTP_UNAUTHORIZED);

    $this->managerUser->refresh();
    expect($this->managerUser->last_login_at)->toBe($originalLastLogin);
});

// ==========================================
// 5. CROSS-ENDPOINT ISOLATION
// ==========================================

it('allows manager to login to POS successfully', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK);
    $this->assertAuthenticated();
});

it('allows manager to login to Back Office successfully', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'manager_pos',
        'password' => 'secret123',
    ]);

    $response->assertStatus(Response::HTTP_OK);
    $this->assertAuthenticated();
});

it('rejects cashier from Back Office but allows from POS', function () {
    // Create cashier user
    User::factory()->create([
        'username' => 'cashier_dual',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> true,
    ]);

    // Cashier should be rejected from Back Office
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'cashier_dual',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_FORBIDDEN);

    // Clear rate limiter for clean test
    RateLimiter::clear('127.0.0.1');

    // Cashier should be allowed in POS
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'cashier_dual',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);
});

it('rejects inventory from POS but allows from Back Office', function () {
    // Create inventory user
    User::factory()->create([
        'username' => 'inventory_dual',
        'password' => Hash::make('secret123'),
        'role'     => 'inventory',
        'is_active'=> true,
    ]);

    // Inventory should be rejected from POS
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'inventory_dual',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_FORBIDDEN);

    // Clear rate limiter for clean test
    RateLimiter::clear('127.0.0.1');

    // Inventory should be allowed in Back Office
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'inventory_dual',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);
});