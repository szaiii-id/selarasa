<?php

use App\Services\AuthService;
use App\Models\User;
use App\Contracts\Repositories\UserRepositoryInterface;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

uses(Tests\TestCase::class);

beforeEach(function () {
    // Mock the UserRepositoryInterface to keep this a pure unit test without database hits
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->authService = new AuthService($this->userRepository);
});

afterEach(function () {
    Mockery::close();
});

// ==========================================
// 1. HAPPY & NEGATIVE PATH (Unit Level)
// ==========================================

it('returns User instance on successful credentials validation (Happy Path)', function () {
    $user = new User([
        'username'  => 'manager_selarasa',
        'password'  => Hash::make('password123'),
        'role'      => 'manager',
        'is_active' => true,
    ]);
    $user->id = 1;

    // Langsung mock repository karena cache sudah dihapus
    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('manager_selarasa')
        ->andReturn($user);

    $result = $this->authService->validateCredentials([
        'username' => 'manager_selarasa',
        'password' => 'password123',
    ]);

    expect($result)->toBeInstanceOf(User::class);
    expect($result->username)->toBe('manager_selarasa');
});

it('creates an authenticated session and updates last_login_at for the user (Happy Path)', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->username = 'manager_selarasa';
    $user->id = 1;

    $user->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn($data) => array_key_exists('last_login_at', $data)))
        ->andReturn(true);

    Auth::shouldReceive('login')
        ->once()
        ->with($user);

    $this->authService->createSession($user);
});

it('throws AuthenticationException when password does not match (Negative Path)', function () {
    $user = new User([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make('correct_password'),
        'role'      => 'admin',
        'is_active' => true,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('admin_selarasa')
        ->andReturn($user);

    $this->authService->validateCredentials([
        'username' => 'admin_selarasa',
        'password' => 'wrong_password',
    ]);
})->throws(AuthenticationException::class, 'Invalid username or password.');


// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

it('throws AuthenticationException when user is not found in repository (Partition: Not Found)', function () {
    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('unknown_user')
        ->andReturn(null);

    $this->authService->validateCredentials([
        'username' => 'unknown_user',
        'password' => 'any_password',
    ]);
})->throws(AuthenticationException::class, 'Invalid username or password.');

it('throws AccessDeniedHttpException when user is inactive (Partition: Inactive Status)', function () {
    $user = new User([
        'username'  => 'suspended_user',
        'password'  => Hash::make('password123'),
        'role'      => 'admin',
        'is_active' => false,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('suspended_user')
        ->andReturn($user);

    $this->authService->validateCredentials([
        'username' => 'suspended_user',
        'password' => 'password123',
    ]);
})->throws(AccessDeniedHttpException::class, 'Your account has been deactivated. Please contact the manager.');

it('throws AccessDeniedHttpException when user role is unauthorized (Partition: Role Access Control)', function () {
    $user = new User([
        'username'  => 'cashier_user',
        'password'  => Hash::make('password123'),
        'role'      => 'cashier',
        'is_active' => true,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('cashier_user')
        ->andReturn($user);

    // Passing ['admin', 'manager'] as allowed roles, but user is 'cashier'
    $this->authService->validateCredentials([
        'username' => 'cashier_user',
        'password' => 'password123',
    ], ['admin', 'manager']);
})->throws(AccessDeniedHttpException::class, 'Invalid credentials or insufficient permissions to access this area.');


// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

it('handles boundary string lengths gracefully by returning null search from repository (BVA)', function () {
    $massiveString = str_repeat('a', 255);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with($massiveString)
        ->andReturn(null);

    $this->authService->validateCredentials([
        'username' => $massiveString,
        'password' => 'password123',
    ]);
})->throws(AuthenticationException::class);


// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

it('safely handles logout when request has no session store attached (Edge Case)', function () {
    $request = Mockery::mock(Request::class);
    $request->shouldReceive('hasSession')->once()->andReturn(false);

    Auth::shouldReceive('guard')
        ->once()
        ->with('web')
        ->andReturnSelf(); 

    Auth::shouldReceive('logout')->once();

    $this->authService->logout($request);

    expect(true)->toBeTrue();
});