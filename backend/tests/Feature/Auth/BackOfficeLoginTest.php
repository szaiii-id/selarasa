<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Siapkan akun Admin (Valid untuk Back Office)
    $this->adminUser = User::factory()->create([
        'username'  => 'admin_bo',
        'password'  => Hash::make('secret123'),
        'role'      => 'admin',
        'is_active' => true,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================
it('returns correct json schema on successful Back Office login', function () {
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'secret123',
    ]);

    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'data' => [
                'user' => ['id', 'name', 'username', 'role', 'is_active', 'joined_at']
            ]
        ]);
        
    $this->assertAuthenticated();
});

// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING (RBAC)
// ==========================================
it('allows inventory staff to access Back Office successfully', function () {
    User::factory()->create([
        'username' => 'staff_gudang',
        'password' => Hash::make('secret123'),
        'role'     => 'inventory',
        'is_active'=> true,
    ]);

    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'staff_gudang',
        'password' => 'secret123',
    ])->assertStatus(200);
});

it('rejects cashier role from accessing Back Office with 403 Forbidden', function () {
    User::factory()->create([
        'username' => 'kasir_budi',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> true,
    ]);

    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'kasir_budi',
        'password' => 'secret123',
    ])->assertStatus(403);
});

it('rejects invalid password with 401 Unauthorized', function () {
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ])->assertStatus(401);
});

it('rejects missing fields with 422 Unprocessable Entity', function () {
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => '',
        'password' => '',
    ])->assertStatus(422)
      ->assertJsonValidationErrors(['username', 'password']);
});

// ==========================================
// 3. RATE LIMITING & THROTTLING
// ==========================================
it('blocks Back Office login after too many failed attempts (429 Too Many Requests)', function () {
    // Generate the exact throttle key format used by Laravel (username|ip)
    $throttleKey = Str::transliterate(Str::lower('admin_bo').'|127.0.0.1');
    RateLimiter::clear($throttleKey);

    // Simulate brute force hits (Assuming default 'auth-strict' limit is 5)
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/backoffice/auth/login', [
            'username' => 'admin_bo',
            'password' => 'wrong_password',
        ]);
    }

    // 6th attempt should hit the throttle limit
    $response = $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'admin_bo',
        'password' => 'wrong_password',
    ]);

    $response->assertStatus(429);
});