<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| 1. Contract / API Schema Testing
|--------------------------------------------------------------------------
|
| Verify that an authenticated user can successfully log out and receive
| the expected JSON schema and HTTP 200 OK status code.
|
*/
it('successfully logs out an authenticated user and returns correct JSON schema (Contract Test)', function () {
    // 1. Arrange: Create an active user
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // 2. Act: Authenticate and perform logout request
    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    // 3. Assert: Verify HTTP status and exact JSON response structure
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
|
| Verify access control restrictions and ensure that user session state
| is completely invalidated after logout (preventing session reuse).
|
*/
it('rejects unauthenticated logout requests with 401 Unauthorized (Security Test)', function () {
    // Act: Attempt to log out without an active authentication session
    $response = $this->postJson('/api/v1/auth/logout');

    // Assert: Must be rejected by the auth:sanctum middleware
    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Unauthenticated.',
        ]);
});

it('invalidates user session and prevents subsequent access to protected routes (State Transition Test)', function () {
    // 1. Arrange: Authenticate a user session
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // Ensure the user can access a protected route initially
    $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_OK);

    // 2. Act: Perform logout request
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // 3. Assert: Attempting to access protected resource after logout must fail
    // Note: We reset authentication state to simulate real SPA browser behavior after session flush
    $this->app['auth']->forgetGuards();

    $this->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
});

/*
|--------------------------------------------------------------------------
| 3. Idempotency & Replay Attack Testing
|--------------------------------------------------------------------------
|
| Verify that performing logout twice with the same initial session
| fails on the second attempt because the state is already destroyed.
|
*/
it('prevents reuse of an already invalidated session for subsequent logout requests (Idempotency Test)', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // First logout attempt should succeed
    $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_OK);

    // Clear test application guard memory to reflect invalidated server session
    $this->app['auth']->forgetGuards();

    // Second logout attempt must be rejected as unauthenticated
    $this->postJson('/api/v1/auth/logout')
        ->assertStatus(Response::HTTP_UNAUTHORIZED);
});

/*
|--------------------------------------------------------------------------
| 4. Rate Limiting & Throttling
|--------------------------------------------------------------------------
|
| Verify that the logout endpoint respects the Tier 2 API rate limiter
| (60 requests/minute) configured in routes/api.php.
|
*/
it('throttles excessive logout requests exceeding API rate limit (Throttle Test)', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // Simulate exhausting the 60 requests/minute throttle threshold
    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/auth/logout');
    }

    // The 61st request must be blocked by the Laravel Rate Limiter
    $response = $this->actingAs($user, 'sanctum')
        ->postJson('/api/v1/auth/logout');

    $response->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);
});