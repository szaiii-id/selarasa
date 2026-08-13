<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

uses(RefreshDatabase::class);

/*
|--------------------------------------------------------------------------
| 1. Contract / API Schema Testing
|--------------------------------------------------------------------------
|
| Verify that authenticated requests return the correct JSON schema,
| data typing, and HTTP status code expected by the Vue SPA client.
|
*/
it('returns correct JSON schema for an authenticated user', function () {
    // 1. Arrange: Create an active user account
    $user = User::factory()->create([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('secret123'),
        'role'      => 'admin',
        'is_active' => true,
    ]);

    // 2. Act: Send an authenticated request using the Sanctum guard
    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    // 3. Assert: Verify structural consistency and payload correctness
    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'user' => [
                    'id',
                    'username',
                    'role',
                    'is_active',
                ],
            ],
        ])
        ->assertJson([
            'message' => 'User retrieved successfully.',
            'data' => [
                'user' => [
                    'id'        => $user->id,
                    'username'  => 'admin_selarasa',
                    'role'      => 'admin',
                    'is_active' => true,
                ],
            ],
        ]);
});

/*
|--------------------------------------------------------------------------
| 2. Security & Authorization Testing
|--------------------------------------------------------------------------
|
| Verify that unauthenticated requests and deactivated user accounts
| are strictly blocked from accessing protected profile resources.
|
*/
it('rejects unauthenticated requests with 401 Unauthorized', function () {
    // Act: Send request without session cookie or token
    $response = $this->getJson('/api/v1/auth/me');

    // Assert: Must be rejected by the auth:sanctum middleware
    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Unauthenticated.',
        ]);
});

it('rejects authenticated users whose account was deactivated with 403 Forbidden', function () {
    // 1. Arrange: Create a user account where is_active is false
    $inactiveUser = User::factory()->create([
        'username'  => 'cashier_blocked',
        'role'      => 'cashier',
        'is_active' => false,
    ]);

    // 2. Act: Send request as the deactivated user
    $response = $this->actingAs($inactiveUser, 'sanctum')
        ->getJson('/api/v1/auth/me');

    // 3. Assert: Must be rejected by the custom 'active' middleware
    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Your account has been deactivated.',
        ]);
});

/*
|--------------------------------------------------------------------------
| 3. Rate Limiting & Throttling
|--------------------------------------------------------------------------
|
| Verify that the endpoint throttles excessive requests to prevent
| infinite loop bugs or denial-of-service abuse.
|
*/
it('blocks requests after exceeding the API rate limit with 429 Too Many Requests', function () {
    // 1. Arrange: Create an active user account
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // Bersihkan rate limiter untuk user ID ini agar test tidak terpengaruh test sebelumnya
    $throttleKey = Str::transliterate((string) $user->id);
    RateLimiter::clear($throttleKey);

    // 2. Act: Simulate reaching the 60 requests/minute threshold
    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');
    }

    // 3. Assert: The 61st request must be throttled
    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);
});