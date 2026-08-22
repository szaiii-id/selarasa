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
it('returns correct JSON schema for an authenticated user', function () {
    $user = User::factory()->create([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('secret123'),
        'role'      => 'admin',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonStructure([
            'message',
            'data' => [
                'user' => [
                    'id',
                    'username',
                    'role',
                    'is_active',
                    'joined_at',
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

it('does not leak sensitive data in profile response', function () {
    $user = User::factory()->create([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('secret123'),
        'role'      => 'admin',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJsonMissing(['password'])
        ->assertJsonMissing(['password_hash'])
        ->assertJsonMissing(['remember_token'])
        ->assertJsonMissing(['pin_code'])
        ->assertJsonMissing(['last_login_ip']);
});

it('returns consistent data for all user roles', function () {
    $roles = ['admin', 'manager', 'inventory', 'cashier'];
    
    foreach ($roles as $role) {
        $user = User::factory()->create([
            'username'  => "user_{$role}",
            'role'      => $role,
            'is_active' => true,
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me');

        $response->assertStatus(Response::HTTP_OK)
            ->assertJson([
                'data' => [
                    'user' => [
                        'username' => "user_{$role}",
                        'role'      => $role,
                        'is_active' => true,
                    ],
                ],
            ]);
    }
});

/*
|--------------------------------------------------------------------------
| 2. Security & Authorization Testing
|--------------------------------------------------------------------------
*/
it('rejects unauthenticated requests with 401 Unauthorized', function () {
    $response = $this->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_UNAUTHORIZED)
        ->assertJson([
            'message' => 'Unauthenticated.',
        ]);
});

it('rejects requests with invalid token', function () {
    $response = $this->withHeaders([
        'Authorization' => 'Bearer invalid_token_123',
    ])->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_UNAUTHORIZED);
});

it('rejects authenticated users whose account was deactivated with 403 Forbidden', function () {
    $inactiveUser = User::factory()->create([
        'username'  => 'cashier_blocked',
        'role'      => 'cashier',
        'is_active' => false,
    ]);

    $response = $this->actingAs($inactiveUser, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_FORBIDDEN)
        ->assertJson([
            'message' => 'Your account has been deactivated.',
        ]);
});

it('prevents access to other users profile data', function () {
    $user1 = User::factory()->create([
        'username' => 'user_one',
        'is_active' => true,
    ]);
    
    $user2 = User::factory()->create([
        'username' => 'user_two',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user1, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'data' => [
                'user' => [
                    'username' => 'user_one',
                ],
            ],
        ])
        ->assertJsonMissing([
            'username' => 'user_two',
        ]);
});

/*
|--------------------------------------------------------------------------
| 3. Rate Limiting & Throttling
|--------------------------------------------------------------------------
*/
it('blocks requests after exceeding the API rate limit with 429 Too Many Requests', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    // Clear rate limiter for this user ID
    $throttleKey = (string) $user->id;
    RateLimiter::clear($throttleKey);

    // Simulate reaching the 60 requests/minute threshold
    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/auth/me');
    }

    // The 61st request must be throttled
    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_TOO_MANY_REQUESTS)
        ->assertJson([
            'message' => 'Too Many Attempts.',
        ]);
});

it('applies rate limit per user ID for authenticated requests', function () {
    $user1 = User::factory()->create([
        'is_active' => true,
    ]);
    
    $user2 = User::factory()->create([
        'is_active' => true,
    ]);

    // Clear rate limiters for both users
    RateLimiter::clear((string) $user1->id);
    RateLimiter::clear((string) $user2->id);

    // Exhaust rate limit for user1
    for ($i = 0; $i < 60; $i++) {
        $this->actingAs($user1, 'sanctum')->getJson('/api/v1/auth/me');
    }

    // User1 should be throttled
    $this->actingAs($user1, 'sanctum')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_TOO_MANY_REQUESTS);

    // User2 should NOT be throttled (different throttle key)
    $this->actingAs($user2, 'sanctum')
        ->getJson('/api/v1/auth/me')
        ->assertStatus(Response::HTTP_OK);
});

/*
|--------------------------------------------------------------------------
| 4. Session Management
|--------------------------------------------------------------------------
*/
it('maintains session across multiple requests', function () {
    $user = User::factory()->create([
        'username' => 'session_user',
        'is_active' => true,
    ]);

    // Make multiple requests with same session
    for ($i = 0; $i < 3; $i++) {
        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me');
        
        $response->assertStatus(Response::HTTP_OK);
    }

    // Still authenticated after multiple requests
    $this->assertAuthenticated('sanctum');
});

it('successfully logs out and clears session', function () {
    // Create user
    $user = User::factory()->create([
        'username' => 'logout_test_user',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    // Clear rate limiter
    RateLimiter::clear('127.0.0.1');

    // Login
    $this->postJson('/api/v1/backoffice/auth/login', [
        'username' => 'logout_test_user',
        'password' => 'secret123',
    ])->assertStatus(Response::HTTP_OK);

    // Verify authenticated before logout
    $this->assertAuthenticated();

    // Logout
    $response = $this->postJson('/api/v1/auth/logout');
    
    $response->assertStatus(Response::HTTP_OK)
        ->assertJson([
            'message' => 'Logged out successfully.'
        ]);
});

/*
|--------------------------------------------------------------------------
| 5. Edge Cases
|--------------------------------------------------------------------------
*/
it('handles request when user has null optional fields', function () {
    // Create user with null optional fields (username is required in DB)
    $user = User::factory()->create([
        'username' => 'minimal_user',
        'is_active' => true,
        'last_login_at' => null,
        'last_login_ip' => null,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertStatus(Response::HTTP_OK);
});

it('returns correct content type header', function () {
    $user = User::factory()->create([
        'is_active' => true,
    ]);

    $response = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    $response->assertHeader('Content-Type', 'application/json');
});

it('returns consistent response across multiple requests', function () {
    $user = User::factory()->create([
        'username' => 'cached_user',
        'is_active' => true,
    ]);

    // First request
    $response1 = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    // Second request
    $response2 = $this->actingAs($user, 'sanctum')
        ->getJson('/api/v1/auth/me');

    // Both responses should be identical
    $response1->assertStatus(Response::HTTP_OK);
    $response2->assertStatus(Response::HTTP_OK);
    $this->assertEquals($response1->json(), $response2->json());
});