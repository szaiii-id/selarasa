<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;

// RefreshDatabase ensures the database is reset before each test
uses(RefreshDatabase::class);

beforeEach(function () {
    // Clear rate limiter for clean state before each test
    RateLimiter::clear('login');

    // Kita gunakan role 'admin' agar lulus cek ALLOWED_ROLES untuk Contract Test
    $this->user = User::factory()->create([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('secret123'),
        'role'      => 'admin',
        'is_active' => true,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING & SECURITY
// ==========================================

it('returns correct json schema on successful session login (Contract Test)', function () {
    // Act: Hit the API endpoint directly
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'admin_selarasa',
        'password' => 'secret123',
    ]);

    // Assert: Ensure the API contract shape matches LoginController (Session-based, no token in body)
    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'data' => [
                'user' => [
                    'id', 'name', 'username', 'role', 'is_active', 'joined_at'
                ]
            ]
        ]);
        
   $this->assertAuthenticated();
});


// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING (RBAC)
// ==========================================

it('rejects cashier role from accessing Back Office with 401 Unauthorized (RBAC Test)', function () {
    // Arrange: Buat user khusus dengan role cashier
    User::factory()->create([
        'username'  => 'cashier_john',
        'password'  => Hash::make('secret123'),
        'role'      => 'cashier',
        'is_active' => true,
    ]);

    // Act
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'cashier_john',
        'password' => 'secret123',
    ]);

    // Assert: AuthService menolak akses kasir ke Back Office
    $response->assertStatus(401)
        ->assertJson([
            'message' => 'You do not have access to this area.'
        ]);
});

it('rejects invalid password with 401 Unauthorized (Security Test)', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'admin_selarasa',
        'password' => 'wrong_password',
    ]);

    // Menyesuaikan dengan lemparan HttpResponseException(401) dari AuthService Anda
    $response->assertStatus(401);
});

it('rejects missing fields with 422 unprocessable entity', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => '',
        'password' => '',
    ]);

    // Validasi input kosong tetap dikendalikan oleh LoginRequest (HTTP 422)
    $response->assertStatus(422)
        ->assertJsonValidationErrors(['username', 'password']);
});


// ==========================================
// 3. RATE LIMITING & THROTTLING
// ==========================================

it('blocks user after 5 failed attempts due to rate limiting (Throttle Test)', function () {
    // Simulate a brute-force attack (5 consecutive hits)
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'username' => 'admin_selarasa',
            'password' => 'guess_password',
        ]);
    }

    // On the 6th attempt, Laravel's Throttle Middleware should block the request
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'admin_selarasa',
        'password' => 'guess_password',
    ]);

    // 429 is the standard HTTP Status for Too Many Requests
    $response->assertStatus(429);
});