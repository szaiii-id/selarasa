<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

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

it('invalidates user session and prevents subsequent access to protected routes (State Transition Test)', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // Ensure the user can access a protected route initially
    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_OK);

    // Perform logout request
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // Clear test application guard memory to reflect invalidated server session
    $this->app['auth']->forgetGuards();

    // Attempting to access protected resource after logout must fail
    $this->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
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

    $this->app['auth']->forgetGuards();

    // Second logout attempt must be rejected
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
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

    // Bersihkan rate limiter berdasarkan ID user (sesuai throttle:api Sanctum)
    $throttleKey = Str::transliterate((string) $user->id);
    RateLimiter::clear($throttleKey);

    // Simulate exhausting the 60 requests/minute throttle threshold
    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/auth/logout');
    }

    // The 61st request must be blocked by the Laravel Rate Limiter
    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);
});