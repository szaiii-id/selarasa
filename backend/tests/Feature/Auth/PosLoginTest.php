<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Siapkan akun Manager (Valid untuk POS)
    $this->managerUser = User::factory()->create([
        'username'  => 'manager_pos',
        'password'  => Hash::make('secret123'),
        'role'      => 'manager',
        'is_active' => true,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING
// ==========================================
it('returns correct json schema on successful POS Terminal login', function () {
    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
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
it('allows cashier to access POS Terminal successfully', function () {
    // Role murni menggunakan 'cashier'
    User::factory()->create([
        'username' => 'cashier_siti',
        'password' => Hash::make('secret123'),
        'role'     => 'cashier',
        'is_active'=> true,
    ]);

    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'cashier_siti',
        'password' => 'secret123',
    ])->assertStatus(200);
});

it('rejects inventory role from accessing POS Terminal with 403 Forbidden', function () {
    User::factory()->create([
        'username' => 'staff_gudang',
        'password' => Hash::make('secret123'),
        'role'     => 'inventory',
        'is_active'=> true,
    ]);

    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'staff_gudang',
        'password' => 'secret123',
    ])->assertStatus(403);
});

it('rejects invalid password on POS login with 401 Unauthorized', function () {
    $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'wrong_password',
    ])->assertStatus(401);
});

// ==========================================
// 3. RATE LIMITING & THROTTLING
// ==========================================
it('blocks POS login after too many failed attempts (429 Too Many Requests)', function () {
    $throttleKey = Str::transliterate(Str::lower('manager_pos').'|127.0.0.1');
    RateLimiter::clear($throttleKey);

    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/pos/auth/login', [
            'username' => 'manager_pos',
            'password' => 'wrong_password',
        ]);
    }

    $response = $this->postJson('/api/v1/pos/auth/login', [
        'username' => 'manager_pos',
        'password' => 'wrong_password',
    ]);

    $response->assertStatus(429);
});