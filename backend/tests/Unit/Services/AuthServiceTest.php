<?php

use App\Services\AuthService;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

// Load environment testing Laravel & Database Reset
uses(Tests\TestCase::class, RefreshDatabase::class);

beforeEach(function () {
    // We resolve from the container so the UserRepositoryInterface is injected automatically
    $this->authService = app(AuthService::class);
});

// ==========================================
// 1. HAPPY PATH & NEGATIVE PATH
// ==========================================

it('returns user and token on happy path', function () {
    // Arrange
    $user = User::factory()->create([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('selarasa01'),
        'is_active' => true,
    ]);

    // Act
    $result = $this->authService->login([
        'username' => 'admin_selarasa',
        'password' => 'selarasa01',
    ]);

    // Assert
    expect($result)
        ->toBeArray()
        ->toHaveKeys(['user', 'token']);
        
    expect($result['user']->username)->toBe('admin_selarasa');
    expect($result['token'])->toBeString();
});

it('throws validation exception on negative path with wrong password', function () {
    User::factory()->create([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('selarasa01'),
        'is_active' => true,
    ]);

    // Act & Assert (Pest makes exception testing very clean)
    $this->authService->login([
        'username' => 'admin_selarasa',
        'password' => 'wrong_password',
    ]);
})->throws(ValidationException::class, 'Invalid username or password.');


// ==========================================
// 2. EQUIVALENCE PARTITIONING
// ==========================================

it('throws validation exception for unregistered user (Partition: Not Found)', function () {
    $this->authService->login([
        'username' => 'ghost_user',
        'password' => 'does_not_matter',
    ]);
})->throws(ValidationException::class, 'Invalid username or password.');

it('throws validation exception for deactivated user (Partition: Inactive)', function () {
    User::factory()->create([
        'username'  => 'fired_cashier',
        'password'  => Hash::make('password123'),
        'is_active' => false, // User is deactivated
    ]);

    $this->authService->login([
        'username' => 'fired_cashier',
        'password' => 'password123',
    ]);
})->throws(ValidationException::class, 'Your account has been deactivated. Please contact the manager.');


// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (BVA)
// ==========================================

it('handles maximum string boundary gracefully without crashing database (BVA)', function () {
    // Extremely long string to test if the repository handles boundaries safely
    // without throwing a raw SQL 500 error (Data too long)
    $massiveString = Str::random(500); 

    $this->authService->login([
        'username' => $massiveString,
        'password' => 'selarasa01',
    ]);
})->throws(ValidationException::class);


// ==========================================
// 4. EDGE CASES & CORNER CASES
// ==========================================

it('handles corner case with weird characters, spaces, and emojis (Edge Case)', function () {
    $weirdUsername = "admin_  DROP TABLE; 🚀";
    $weirdPassword = "  password \n \t 🚀";

    User::factory()->create([
        'username'  => $weirdUsername,
        'password'  => Hash::make($weirdPassword),
        'is_active' => true,
    ]);

    $result = $this->authService->login([
        'username' => $weirdUsername,
        'password' => $weirdPassword,
    ]);

    expect($result)->toHaveKeys(['user', 'token']);
    expect($result['user']->username)->toBe($weirdUsername);
});