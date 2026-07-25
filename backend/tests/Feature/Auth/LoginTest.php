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

    $this->user = User::factory()->create([
        'username'  => 'cashier_john',
        'password'  => Hash::make('secret123'),
        'is_active' => true,
    ]);
});

// ==========================================
// 1. CONTRACT / API SCHEMA TESTING & SECURITY
// ==========================================

it('returns correct json schema on successful login (Contract Test)', function () {
    // Act: Hit the API endpoint directly
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'cashier_john',
        'password' => 'secret123',
    ]);

    // Assert: Ensure the API contract shape remains unchanged
    $response->assertStatus(200)
        ->assertJsonStructure([
            'message',
            'data' => [
                'user' => [
                    'id', 'name', 'username', 'role', 'is_active', 'joined_at'
                ],
                'token' // It is crucial to ensure the token is always returned
            ]
        ]);
});


// ==========================================
// 2. SECURITY & AUTHORIZATION TESTING
// ==========================================

it('rejects invalid password with 422 unprocessable entity (Security Test)', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'cashier_john',
        'password' => 'wrong_password',
    ]);

    // The AuthService throws a ValidationException, which translates to a 422 status
    $response->assertStatus(422)
        ->assertJsonValidationErrors(['username']);
});

it('rejects missing fields with 422 unprocessable entity', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => '',
        'password' => '',
    ]);

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
            'username' => 'cashier_john',
            'password' => 'guess_password',
        ]);
    }

    // On the 6th attempt, Laravel's Throttle Middleware should block the request
    $response = $this->postJson('/api/v1/auth/login', [
        'username' => 'cashier_john',
        'password' => 'guess_password',
    ]);

    // 429 is the standard HTTP Status for Too Many Requests
    $response->assertStatus(429);
});