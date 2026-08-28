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

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('manager_selarasa')
        ->andReturn($user);

    $result = $this->authService->validateCredentials([
        'username' => 'manager_selarasa',
        'password' => 'password123',
    ]);

    expect($result)->toBeInstanceOf(User::class)
        ->and($result->username)->toBe('manager_selarasa')
        ->and($result->role)->toBe('manager');
});

it('creates an authenticated session and updates last_login_at (Happy Path)', function () {
    $user = Mockery::mock(User::class)->makePartial();
    $user->username = 'manager_selarasa';
    $user->id = 1;

    $user->shouldReceive('update')
        ->once()
        ->with(Mockery::on(function ($data) {
            return isset($data['last_login_at']) 
                && isset($data['last_login_ip']);
        }))
        ->andReturn(true);

    Auth::shouldReceive('login')
        ->once()
        ->with($user)
        ->andReturn(true);

    $this->authService->createSession($user);
    
    // Verify no exception thrown
    expect(true)->toBeTrue();
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

it('throws AuthenticationException when both username and password are empty (Negative Path)', function () {
    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('')
        ->andReturn(null);

    $this->authService->validateCredentials([
        'username' => '',
        'password' => '',
    ]);
})->throws(AuthenticationException::class);

// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

it('throws AuthenticationException when user is not found (Partition: Non-existent User)', function () {
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

it('throws AccessDeniedHttpException when role is not in allowed list (Partition: Unauthorized Role)', function () {
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

    $this->authService->validateCredentials([
        'username' => 'cashier_user',
        'password' => 'password123',
    ], ['admin', 'manager']);
})->throws(AccessDeniedHttpException::class, 'Invalid credentials or insufficient permissions to access this area.');

it('accepts user when role matches allowed list case-insensitively (Partition: Case Insensitive Role)', function () {
    $user = new User([
        'username'  => 'manager_user',
        'password'  => Hash::make('password123'),
        'role'      => 'MANAGER', // Uppercase
        'is_active' => true,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('manager_user')
        ->andReturn($user);

    $result = $this->authService->validateCredentials([
        'username' => 'manager_user',
        'password' => 'password123',
    ], ['manager', 'admin']);

    expect($result)->toBeInstanceOf(User::class);
});

// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

it('handles maximum username length (BVA: 255 chars)', function () {
    $maxUsername = str_repeat('a', 255);
    
    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with($maxUsername)
        ->andReturn(null);

    $this->authService->validateCredentials([
        'username' => $maxUsername,
        'password' => 'password123',
    ]);
})->throws(AuthenticationException::class);

it('handles minimum username length (BVA: 1 char)', function () {
    $minUsername = 'a';
    
    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with($minUsername)
        ->andReturn(null);

    $this->authService->validateCredentials([
        'username' => $minUsername,
        'password' => 'p',
    ]);
})->throws(AuthenticationException::class);

it('handles empty allowed roles array (BVA: Empty Array)', function () {
    $user = new User([
        'username'  => 'normal_user',
        'password'  => Hash::make('password123'),
        'role'      => 'cashier',
        'is_active' => true,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('normal_user')
        ->andReturn($user);

    // Empty array means all roles allowed
    $result = $this->authService->validateCredentials([
        'username' => 'normal_user',
        'password' => 'password123',
    ], []);

    expect($result)->toBeInstanceOf(User::class);
});

// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

it('handles password with special characters (Edge Case: SQL Injection Attempt)', function () {
    $maliciousPassword = "'; DROP TABLE users; --";
    
    $user = new User([
        'username'  => 'admin_selarasa',
        'password'  => Hash::make($maliciousPassword),
        'role'      => 'admin',
        'is_active' => true,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('admin_selarasa')
        ->andReturn($user);

    $result = $this->authService->validateCredentials([
        'username' => 'admin_selarasa',
        'password' => $maliciousPassword,
    ]);

    expect($result)->toBeInstanceOf(User::class);
});

it('throws TypeError when username is null (Edge Case: Null Input)', function () {
    $this->authService->validateCredentials([
        'username' => null,
        'password' => 'password123',
    ]);
})->throws(TypeError::class);

it('handles user with null role value (Corner Case: Missing Role)', function () {
    $user = new User([
        'username'  => 'no_role_user',
        'password'  => Hash::make('password123'),
        'role'      => null,
        'is_active' => true,
    ]);

    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with('no_role_user')
        ->andReturn($user);

    $this->authService->validateCredentials([
        'username' => 'no_role_user',
        'password' => 'password123',
    ], ['admin']);
})->throws(AccessDeniedHttpException::class);

it('safely handles logout without session (Edge Case: No Session)', function () {
    $request = Mockery::mock(Request::class);
    $request->shouldReceive('hasSession')
        ->once()
        ->andReturn(false);

    Auth::shouldReceive('guard')
        ->once()
        ->with('web')
        ->andReturnSelf();
    
    Auth::shouldReceive('logout')
        ->once()
        ->andReturnNull();

    // Should not throw any exception
    $this->authService->logout($request);
    
    expect(true)->toBeTrue();
});

it('handles Unicode username (Edge Case: International Characters)', function () {
    $unicodeUsername = '用户_管理員_123';
    
    $this->userRepository
        ->shouldReceive('findByUsername')
        ->once()
        ->with($unicodeUsername)
        ->andReturn(null);

    $this->authService->validateCredentials([
        'username' => $unicodeUsername,
        'password' => 'password123',
    ]);
})->throws(AuthenticationException::class);

// ==========================================
// 5. TESTING PRIVATE/PROTECTED METHODS LOGIC
// ==========================================

it('correctly validates password hash comparison (Unit: Hash Logic)', function () {
    $plainPassword = 'mySecret123';
    $hashedPassword = Hash::make($plainPassword);
    
    // Verify hash check logic works as expected
    expect(Hash::check($plainPassword, $hashedPassword))->toBeTrue()
        ->and(Hash::check('wrongPassword', $hashedPassword))->toBeFalse();
});

it('correctly lowercases roles for comparison (Unit: Case Normalization)', function () {
    $userRole = 'MANAGER';
    $allowedRoles = ['manager', 'admin'];
    
    $normalizedRole = strtolower($userRole);
    $normalizedAllowed = array_map('strtolower', $allowedRoles);
    
    expect(in_array($normalizedRole, $normalizedAllowed, true))->toBeTrue();
});