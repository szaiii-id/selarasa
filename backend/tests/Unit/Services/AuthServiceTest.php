<?php

use App\Services\AuthService;
use App\Models\User;
use App\Contracts\Repositories\UserRepositoryInterface;
use Illuminate\Auth\AuthenticationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Mockery\MockInterface;

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

describe('Happy Path Tests', function () {
    it('returns User instance on successful credentials validation', function () {
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

        expect($result)
            ->toBeInstanceOf(User::class)
            ->username->toBe('manager_selarasa')
            ->role->toBe('manager')
            ->is_active->toBeTrue();
    });

    it('successfully validates user with matching role', function () {
        $user = new User([
            'username'  => 'admin_user',
            'password'  => Hash::make('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('admin_user')
            ->andReturn($user);

        $result = $this->authService->validateCredentials([
            'username' => 'admin_user',
            'password' => 'password123',
        ], ['admin', 'manager']);

        expect($result)->toBeInstanceOf(User::class);
    });

    it('creates an authenticated session and updates last_login_at', function () {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('update')
            ->once()
            ->with(Mockery::on(function ($data) {
                return isset($data['last_login_at']) 
                    && isset($data['last_login_ip'])
                    && $data['last_login_at'] instanceof \Carbon\Carbon;
            }))
            ->andReturn(true);

        Auth::shouldReceive('login')
            ->once()
            ->with($user)
            ->andReturn(true);

        $this->authService->createSession($user);
        
        expect(true)->toBeTrue();
    });

    it('successfully verifies PIN code', function () {
        $pinCode = '123456';
        $user = new User([
            'username'  => 'user_pin',
            'pin_code'  => Hash::make($pinCode),
            'is_active' => true,
        ]);

        $this->authService->verifyPin($user, $pinCode);
        
        expect(true)->toBeTrue();
    });

    it('successfully logs out with session', function () {
        $request = Mockery::mock(Request::class);
        $request->shouldReceive('hasSession')
            ->once()
            ->andReturn(true);
        $request->shouldReceive('session')
            ->twice()
            ->andReturnSelf();
        $request->shouldReceive('invalidate')
            ->once()
            ->andReturn(true);
        $request->shouldReceive('regenerateToken')
            ->once()
            ->andReturn(true);

        Auth::shouldReceive('guard')
            ->once()
            ->with('web')
            ->andReturnSelf();
        Auth::shouldReceive('logout')
            ->once()
            ->andReturnNull();

        $this->authService->logout($request);
        
        expect(true)->toBeTrue();
    });
});

describe('Negative Path Tests', function () {
    it('throws AuthenticationException when password does not match', function () {
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

    it('throws AuthenticationException when both username and password are empty', function () {
        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('')
            ->andReturn(null);

        $this->authService->validateCredentials([
            'username' => '',
            'password' => '',
        ]);
    })->throws(AuthenticationException::class, 'Invalid username or password.');

    it('throws AuthenticationException when user is not found', function () {
        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('nonexistent_user')
            ->andReturn(null);

        $this->authService->validateCredentials([
            'username' => 'nonexistent_user',
            'password' => 'password123',
        ]);
    })->throws(AuthenticationException::class, 'Invalid username or password.');

    it('throws AuthenticationException when PIN is incorrect', function () {
        $user = new User([
            'username'  => 'user_pin',
            'pin_code'  => Hash::make('correct_pin'),
            'is_active' => true,
        ]);

        $this->authService->verifyPin($user, 'wrong_pin');
    })->throws(AuthenticationException::class, 'Invalid PIN code.');
});

// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

describe('Equivalence Partitioning Tests', function () {
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
            'role'      => 'MANAGER',
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

    it('accepts user with lowercase role matching uppercase allowed role (Partition: Mixed Case Roles)', function () {
        $user = new User([
            'username'  => 'admin_user',
            'password'  => Hash::make('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('admin_user')
            ->andReturn($user);

        $result = $this->authService->validateCredentials([
            'username' => 'admin_user',
            'password' => 'password123',
        ], ['ADMIN', 'MANAGER']);

        expect($result)->toBeInstanceOf(User::class);
    });

    it('throws AccessDeniedHttpException for PIN verification on inactive account (Partition: Inactive Account)', function () {
        $user = new User([
            'username'  => 'inactive_pin_user',
            'pin_code'  => Hash::make('123456'),
            'is_active' => false,
        ]);

        $this->authService->verifyPin($user, '123456');
    })->throws(AccessDeniedHttpException::class, 'Your account has been deactivated. Please contact the manager.');
});

// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

describe('Boundary Value Analysis Tests', function () {
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
    })->throws(AuthenticationException::class, 'Invalid username or password.');

    it('handles username at boundary minus 1 (BVA: 254 chars)', function () {
        $username = str_repeat('a', 254);
        
        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with($username)
            ->andReturn(null);

        $this->authService->validateCredentials([
            'username' => $username,
            'password' => 'password123',
        ]);
    })->throws(AuthenticationException::class, 'Invalid username or password.');

    it('handles username at boundary plus 1 (BVA: 256 chars)', function () {
        $username = str_repeat('a', 256);
        
        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with($username)
            ->andReturn(null);

        $this->authService->validateCredentials([
            'username' => $username,
            'password' => 'password123',
        ]);
    })->throws(AuthenticationException::class, 'Invalid username or password.');

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
    })->throws(AuthenticationException::class, 'Invalid username or password.');

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

        $result = $this->authService->validateCredentials([
            'username' => 'normal_user',
            'password' => 'password123',
        ], []);

        expect($result)->toBeInstanceOf(User::class);
    });

    it('handles single allowed role (BVA: One Element Array)', function () {
        $user = new User([
            'username'  => 'admin_user',
            'password'  => Hash::make('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('admin_user')
            ->andReturn($user);

        $result = $this->authService->validateCredentials([
            'username' => 'admin_user',
            'password' => 'password123',
        ], ['admin']);

        expect($result)->toBeInstanceOf(User::class);
    });

    it('handles long password (BVA: 100+ chars)', function () {
        $longPassword = str_repeat('p', 100);
        $user = new User([
            'username'  => 'user_long_pass',
            'password'  => Hash::make($longPassword),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('user_long_pass')
            ->andReturn($user);

        $result = $this->authService->validateCredentials([
            'username' => 'user_long_pass',
            'password' => $longPassword,
        ]);

        expect($result)->toBeInstanceOf(User::class);
    });
});

// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

describe('Edge Cases & Corner Cases Tests', function () {
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

    it('handles username with SQL injection attempt (Edge Case: Malicious Username)', function () {
        $maliciousUsername = "admin' OR '1'='1";
        
        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with($maliciousUsername)
            ->andReturn(null);

        $this->authService->validateCredentials([
            'username' => $maliciousUsername,
            'password' => 'password123',
        ]);
    })->throws(AuthenticationException::class, 'Invalid username or password.');

    it('throws TypeError when username is null (Edge Case: Null Input)', function () {
        $this->authService->validateCredentials([
            'username' => null,
            'password' => 'password123',
        ]);
    })->throws(TypeError::class);

    it('handles null password as invalid credentials (Edge Case: Null Password)', function () {
        $user = new User([
            'username'  => 'valid_user',
            'password'  => Hash::make('correct_password'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('valid_user')
            ->andReturn($user);

        $this->authService->validateCredentials([
            'username' => 'valid_user',
            'password' => null,
        ]);
    })->throws(AuthenticationException::class, 'Invalid username or password.');

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
    })->throws(AccessDeniedHttpException::class, 'Invalid credentials or insufficient permissions to access this area.');

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
    })->throws(AuthenticationException::class, 'Invalid username or password.');

    it('handles password with Unicode characters (Edge Case: International Password)', function () {
        $unicodePassword = '密码_パスワード_비밀번호';
        $user = new User([
            'username'  => 'intl_user',
            'password'  => Hash::make($unicodePassword),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('intl_user')
            ->andReturn($user);

        $result = $this->authService->validateCredentials([
            'username' => 'intl_user',
            'password' => $unicodePassword,
        ]);

        expect($result)->toBeInstanceOf(User::class);
    });

    it('handles user with empty string role (Corner Case: Empty Role)', function () {
        $user = new User([
            'username'  => 'empty_role_user',
            'password'  => Hash::make('password123'),
            'role'      => '',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('empty_role_user')
            ->andReturn($user);

        $this->authService->validateCredentials([
            'username' => 'empty_role_user',
            'password' => 'password123',
        ], ['admin']);
    })->throws(AccessDeniedHttpException::class, 'Invalid credentials or insufficient permissions to access this area.');
});

// ==========================================
// 5. TESTING PRIVATE/PROTECTED METHODS LOGIC
// ==========================================

describe('Internal Logic Tests', function () {
    it('correctly validates password hash comparison (Unit: Hash Logic)', function () {
        $plainPassword = 'mySecret123';
        $hashedPassword = Hash::make($plainPassword);
        
        expect(Hash::check($plainPassword, $hashedPassword))
            ->toBeTrue()
            ->and(Hash::check('wrongPassword', $hashedPassword))
            ->toBeFalse()
            ->and(Hash::check('', $hashedPassword))
            ->toBeFalse()
            ->and(Hash::check(null, $hashedPassword))
            ->toBeFalse();
    });

    it('correctly lowercases roles for comparison (Unit: Case Normalization)', function () {
        $testCases = [
            ['MANAGER', ['manager', 'admin'], true],
            ['manager', ['MANAGER', 'ADMIN'], true],
            ['Manager', ['MANAGER', 'ADMIN'], true],
            ['cashier', ['MANAGER', 'ADMIN'], false],
            ['', ['MANAGER', 'ADMIN'], false],
        ];
        
        foreach ($testCases as [$userRole, $allowedRoles, $expected]) {
            $normalizedRole = strtolower($userRole);
            $normalizedAllowed = array_map('strtolower', $allowedRoles);
            
            expect(in_array($normalizedRole, $normalizedAllowed, true))
                ->toBe($expected);
        }
    });

    it('validates Hash facade behavior with empty inputs (Unit: Edge Case)', function () {
        expect(Hash::check('', Hash::make('')))
            ->toBeTrue()
            ->and(Hash::check('password', ''))
            ->toBeFalse();
    });

    it('validates repository pattern interaction (Unit: Mock Verification)', function () {
        $user = new User([
            'username'  => 'test_user',
            'password'  => Hash::make('password123'),
            'role'      => 'admin',
            'is_active' => true,
        ]);

        $this->userRepository
            ->shouldReceive('findByUsername')
            ->once()
            ->with('test_user')
            ->andReturn($user);

        $result = $this->authService->validateCredentials([
            'username' => 'test_user',
            'password' => 'password123',
        ]);

        expect($result)->toBeInstanceOf(User::class);
        
        // Verify that the repository was called exactly once
        $this->userRepository
            ->shouldHaveReceived('findByUsername')
            ->once();
    });
});