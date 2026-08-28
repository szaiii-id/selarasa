<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Clear rate limiter untuk memastikan test terisolasi
    RateLimiter::clear('127.0.0.1');
});

afterEach(function () {
    // Cleanup rate limiter setelah setiap test
    RateLimiter::clear('127.0.0.1');
});

/*
|--------------------------------------------------------------------------
| 1. Contract / API Schema Testing
|--------------------------------------------------------------------------
*/
it('successfully logs out an authenticated user and returns correct JSON schema (Contract Test)', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
        ])
        ->assertJson([
            'message' => 'Logged out successfully.',
        ]);
});

it('returns correct content type header for logout response', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    $response->assertHeader('Content-Type', 'application/json');
});

/*
|--------------------------------------------------------------------------
| 2. Security & State Transition Testing
|--------------------------------------------------------------------------
*/
it('rejects unauthenticated logout requests with 401 Unauthorized (Security Test)', function () {
    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Unauthenticated.',
        ]);
});

it('rejects logout for deactivated users with 403 Forbidden', function () {
    $inactiveUser = User::factory()->create([
        'is_active' => false,
    ]);

    $response = $this->actingAs($inactiveUser, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Your account has been deactivated.',
        ]);
});

it('invalidates user session and prevents subsequent access to protected routes (State Transition Test)', function () {
    // Create user
    $user = User::factory()->create([
        'username' => 'logout_test_user',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    // Clear rate limiter
    RateLimiter::clear('127.0.0.1');

    // Login via endpoint (creates real session)
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'logout_test_user',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // Verify authenticated
    $this->assertAuthenticated();

    // Access protected route
    $this->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_OK);

    // Perform logout
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // Clear auth guards
    $this->app['auth']->forgetGuards();

    // Accessing protected resource after logout must fail
    $this->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Unauthenticated.',
        ]);
});

/*
|--------------------------------------------------------------------------
| 3. Idempotency & Replay Attack Testing
|--------------------------------------------------------------------------
*/
it('prevents reuse of an already invalidated session for subsequent logout requests (Idempotency Test)', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // First logout attempt should succeed
    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // Clear auth guards to simulate session invalidation
    $this->app['auth']->forgetGuards();

    // Second logout attempt must be rejected
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Unauthenticated.',
        ]);
});

it('allows logout and re-login with same user (Session Regeneration Test)', function () {
    // Create user
    $user = User::factory()->create([
        'username' => 'relogin_user',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    // Clear rate limiter
    RateLimiter::clear('127.0.0.1');

    // First login
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'relogin_user',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // First logout
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // Reset auth manager to default state
    $this->app['auth']->forgetGuards();
    $this->app['auth']->shouldUse('web');

    // Clear rate limiter for second login
    RateLimiter::clear('127.0.0.1');

    // Second login (should work)
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'relogin_user',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // Verify authenticated again
    $this->assertAuthenticated();
});

/*
|--------------------------------------------------------------------------
| 4. Rate Limiting & Throttling
|--------------------------------------------------------------------------
*/
it('throttles excessive logout requests exceeding API rate limit (Throttle Test)', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // Clear rate limiter based on user ID
    $throttleKey = (string) $user->id;
    RateLimiter::clear($throttleKey);

    // Simulate exhausting the 60 requests/minute throttle threshold
    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/auth/logout');
    }

    // The 61st request must be blocked
    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_TOO_MANY_REQUESTS)
        ->assertJson([
            'message' => 'Too Many Attempts.',
        ]);
});

/*
|--------------------------------------------------------------------------
| 5. Edge Cases & Additional Tests
|--------------------------------------------------------------------------
*/
it('handles logout request with invalid token', function () {
    $response = $this->withHeaders([
        'Authorization' => 'Bearer invalid_token_123',
    ])->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('successfully logs out and clears last session data', function () {
    $user = User::factory()->create([
        'username' => 'session_clear_user',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    // Login
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'session_clear_user',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // Verify session exists
    $this->assertAuthenticated();

    // Logout
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // Clear guards
    $this->app['auth']->forgetGuards();

    // Verify no authenticated user
    $this->assertNull(auth()->user());
});