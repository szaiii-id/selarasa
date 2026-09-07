<?php

use App\Services\UserService;
use App\Models\User;
use App\Contracts\Repositories\UserRepositoryInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Illuminate\Database\Eloquent\Collection;

uses(Tests\TestCase::class);

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->userService = new UserService($this->userRepository);

    // Setup default Hash mock untuk mencegah error
    Hash::shouldReceive('isHashed')->zeroOrMoreTimes()->andReturn(true);
    Hash::shouldReceive('verifyConfiguration')->zeroOrMoreTimes()->andReturn(true);
});

afterEach(function () {
    Mockery::close();
});

// ==========================================
// 1. HAPPY & NEGATIVE PATH (Unit Level)
// ==========================================

describe('Happy Path Tests', function () {
    it('returns a paginated list of users', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->userRepository->shouldReceive('paginate')
            ->once()
            ->with(15, ['status' => 'active'])
            ->andReturn($paginator);

        $result = $this->userService->getPaginatedUsers(15, ['status' => 'active']);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('creates a user and hashes password and pin correctly', function () {
        Hash::shouldReceive('make')
            ->once()
            ->with('secret123')
            ->andReturn('hashed_secret');
        
        Hash::shouldReceive('make')
            ->once()
            ->with('123456')
            ->andReturn('hashed_pin');

        $userData = [
            'username' => 'new_user', 
            'password' => 'secret123',
            'pin_code' => '123456'
        ];
        
        $userMock = new User([
            'username' => 'new_user',
            'password' => 'hashed_secret',
            'pin_code' => 'hashed_pin'
        ]);
        $userMock->id = 'uuid-123';

        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });

        $this->userRepository->shouldReceive('create')
            ->once()
            ->with(Mockery::on(fn($data) => 
                $data['password'] === 'hashed_secret' && 
                $data['pin_code'] === 'hashed_pin'
            ))
            ->andReturn($userMock);

        $result = $this->userService->createUser($userData);
        
        expect($result)->toBeInstanceOf(User::class)
            ->and($result->username)->toBe('new_user')
            ->and($result->pin_code)->toBe('123456');
    });

    it('returns user from repository and caches it when cache is empty (Cache Miss)', function () {
        $user = new User([
            'id' => 'uuid-123',
            'username' => 'db_user',
            'role' => 'admin',
            'password' => 'hashed_password',
            'remember_token' => 'token123'
        ]);
        $user->id = 'uuid-123';

        Cache::shouldReceive('remember')
            ->once()
            ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
            ->andReturnUsing(function($key, $ttl, $closure) use ($user) {
                return $closure();
            });

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-123')
            ->andReturn($user);

        $result = $this->userService->getUserById('uuid-123');
        
        expect($result)->toBeInstanceOf(User::class)
            ->and($result->username)->toBe('db_user')
            ->and($result->getAttributes())->not->toHaveKey('password')
            ->and($result->getAttributes())->not->toHaveKey('remember_token');
    });

    it('returns cached user data when cache is available (Cache Hit)', function () {
        $cachedData = [
            'id' => 'uuid-123',
            'username' => 'cached_user',
            'role' => 'admin',
        ];

        Cache::shouldReceive('remember')
            ->once()
            ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
            ->andReturn($cachedData);

        $this->userRepository->shouldNotReceive('findById');

        $result = $this->userService->getUserById('uuid-123');
        
        expect($result)->toBeInstanceOf(User::class)
            ->and($result->username)->toBe('cached_user')
            ->and($result->exists)->toBeTrue()
            ->and($result->wasRecentlyCreated)->toBeFalse();
    });

    it('successfully updates user with new data', function () {
        $targetUser = new User(['role' => 'cashier', 'username' => 'old_name']);
        $targetUser->id = 'uuid-123';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        Auth::shouldReceive('user')->andReturn($currentAdmin);

        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });

        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-123')
            ->andReturn($targetUser);

        $this->userRepository->shouldReceive('update')
            ->once()
            ->with(
                Mockery::on(fn($u) => $u->id === 'uuid-123'),
                Mockery::on(fn($data) => $data['username'] === 'new_name')
            )
            ->andReturn(true);

        $result = $this->userService->updateUser('uuid-123', ['username' => 'new_name']);
        
        expect($result)->toBeInstanceOf(User::class);
    });

    it('successfully deactivates a user', function () {
        $targetCashier = new User(['role' => 'cashier']);
        $targetCashier->id = 'uuid-cashier';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-cashier')
            ->andReturn($targetCashier);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);

        $this->userRepository->shouldReceive('deactivate')
            ->once()
            ->with(Mockery::on(fn($u) => $u->id === 'uuid-cashier'))
            ->andReturn(true);

        $result = $this->userService->deactivateUser('uuid-cashier');
        
        expect($result)->toBeTrue();
    });

    it('successfully activates a user', function () {
        $targetUser = new User(['role' => 'cashier']);
        $targetUser->id = 'uuid-cashier';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-cashier')
            ->andReturn($targetUser);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);

        $this->userRepository->shouldReceive('activate')
            ->once()
            ->with(Mockery::on(fn($u) => $u->id === 'uuid-cashier'))
            ->andReturn(true);

        $result = $this->userService->activateUser('uuid-cashier');
        
        expect($result)->toBeTrue();
    });

    it('successfully deletes a user without related records', function () {
        $targetUser = new User(['role' => 'cashier']);
        $targetUser->id = 'uuid-cashier';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-cashier')
            ->andReturn($targetUser);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);

        $this->userRepository->shouldReceive('delete')
            ->once()
            ->with(Mockery::on(fn($u) => $u->id === 'uuid-cashier'))
            ->andReturn(true);

        $result = $this->userService->deleteUser('uuid-cashier');
        
        expect($result)->toBeTrue();
    });

    it('returns active cashiers collection', function () {
        $cashiers = new Collection([
            new User(['username' => 'cashier1', 'role' => 'cashier']),
            new User(['username' => 'cashier2', 'role' => 'cashier']),
        ]);

        $this->userRepository->shouldReceive('getActiveCashiers')
            ->once()
            ->andReturn($cashiers);

        $result = $this->userService->getActiveCashiers();
        
        expect($result)->toBeInstanceOf(Collection::class)
            ->and($result)->toHaveCount(2);
    });
});

describe('Negative Path Tests', function () {
    it('throws ModelNotFoundException when user not found', function () {
        Cache::shouldReceive('remember')
            ->once()
            ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
            ->andReturnUsing(function($key, $ttl, $closure) {
                return $closure();
            });

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-123')
            ->andReturn(null);

        $this->userService->getUserById('uuid-123');
    })->throws(ModelNotFoundException::class, 'User with ID uuid-123 not found.');

    it('throws AuthorizationException when non-admin tries to create an admin', function () {
        $targetUser = new User(['role' => 'cashier']);
        $targetUser->id = 'target-123';
        
        $currentUser = new User(['role' => 'manager']);
        $currentUser->id = 'current-456';

        $this->userRepository->shouldReceive('findById')
            ->with('target-123')
            ->andReturn($targetUser);
        
        Auth::shouldReceive('user')->andReturn($currentUser);

        $this->userService->updateUser('target-123', ['role' => 'admin']);
    })->throws(AuthorizationException::class, 'Unauthorized action: Only administrators can assign the admin role.');

    it('throws AuthorizationException when non-admin tries to modify admin account', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'admin-123';
        
        $currentManager = new User(['role' => 'manager']);
        $currentManager->id = 'manager-456';

        $this->userRepository->shouldReceive('findById')
            ->with('admin-123')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentManager);

        $this->userService->updateUser('admin-123', ['username' => 'hacked_admin']);
    })->throws(AuthorizationException::class, 'Unauthorized action: You do not have permission to modify an administrator account.');

    it('throws AuthorizationException when user tries to delete own account', function () {
        $user = new User(['role' => 'admin']);
        $user->id = 'uuid-123';
        
        $this->userRepository->shouldReceive('findById')
            ->with('uuid-123')
            ->andReturn($user);
        
        Auth::shouldReceive('user')->andReturn($user);

        $this->userService->deleteUser('uuid-123');
    })->throws(AuthorizationException::class, 'You cannot delete your own account.');

    it('throws AuthorizationException when deactivating own account', function () {
        $currentUser = new User(['role' => 'manager']);
        $currentUser->id = 'uuid-self';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-self')
            ->andReturn($currentUser);
        
        Auth::shouldReceive('user')->andReturn($currentUser);

        $this->userService->deactivateUser('uuid-self');
    })->throws(AuthorizationException::class, 'You cannot deactivate your own account.');
});

// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

describe('Equivalence Partitioning Tests', function () {
    it('updates user password when password field is provided', function () {
        $targetUser = new User(['role' => 'cashier', 'password' => 'old_pass']);
        $targetUser->id = 'uuid-1';
        
        Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
        
        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });
        
        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-1')
            ->andReturn($targetUser);
        
        Hash::shouldReceive('make')
            ->once()
            ->with('new_pass')
            ->andReturn('hashed_pass');

        $this->userRepository->shouldReceive('update')
            ->once()
            ->with(
                Mockery::on(fn($u) => $u->id === 'uuid-1'),
                Mockery::on(fn($data) => $data['password'] === 'hashed_pass')
            )
            ->andReturn(true);

        $this->userService->updateUser('uuid-1', ['password' => 'new_pass']);
        
        expect(true)->toBeTrue();
    });

    it('unsets password field when password is empty string', function () {
        $targetUser = new User(['role' => 'cashier', 'name' => 'John']);
        $targetUser->id = 'uuid-1';

        Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
        
        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });
        
        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-1')
            ->andReturn($targetUser);

        $this->userRepository->shouldReceive('update')
            ->once()
            ->with(
                Mockery::on(fn($u) => $u->id === 'uuid-1'),
                Mockery::on(fn($data) => !array_key_exists('password', $data))
            )
            ->andReturn(true);

        $this->userService->updateUser('uuid-1', ['name' => 'John', 'password' => '']);
        
        expect(true)->toBeTrue();
    });

    it('does not hash password when password is null', function () {
        $targetUser = new User(['role' => 'cashier', 'name' => 'John']);
        $targetUser->id = 'uuid-1';

        Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
        
        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });
        
        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-1')
            ->andReturn($targetUser);

        $this->userRepository->shouldReceive('update')
            ->once()
            ->with(
                Mockery::on(fn($u) => $u->id === 'uuid-1'),
                Mockery::on(fn($data) => !array_key_exists('password', $data))
            )
            ->andReturn(true);

        $this->userService->updateUser('uuid-1', ['name' => 'John', 'password' => null]);
        
        expect(true)->toBeTrue();
    });

    it('hashes pin when provided', function () {
        $targetUser = new User(['role' => 'cashier']);
        $targetUser->id = 'uuid-1';

        Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
        
        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });
        
        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-1')
            ->andReturn($targetUser);
        
        Hash::shouldReceive('make')
            ->once()
            ->with('654321')
            ->andReturn('hashed_pin');

        $this->userRepository->shouldReceive('update')
            ->once()
            ->with(
                Mockery::on(fn($u) => $u->id === 'uuid-1'),
                Mockery::on(fn($data) => $data['pin_code'] === 'hashed_pin')
            )
            ->andReturn(true);

        $result = $this->userService->updateUser('uuid-1', ['pin_code' => '654321']);
        
        expect($result->pin_code)->toBe('654321');
    });

    it('unsets pin when not provided', function () {
        $targetUser = new User(['role' => 'cashier', 'name' => 'John']);
        $targetUser->id = 'uuid-1';

        Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
        
        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });
        
        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-1')
            ->andReturn($targetUser);

        $this->userRepository->shouldReceive('update')
            ->once()
            ->with(
                Mockery::on(fn($u) => $u->id === 'uuid-1'),
                Mockery::on(fn($data) => !array_key_exists('pin_code', $data))
            )
            ->andReturn(true);

        $this->userService->updateUser('uuid-1', ['name' => 'John']);
        
        expect(true)->toBeTrue();
    });
});

// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

describe('Boundary Value Analysis Tests', function () {
    it('handles perPage = 0 gracefully', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->userRepository->shouldReceive('paginate')
            ->once()
            ->with(0, [])
            ->andReturn($paginator);
        
        $result = $this->userService->getPaginatedUsers(0);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles perPage = 1 (minimum meaningful value)', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->userRepository->shouldReceive('paginate')
            ->once()
            ->with(1, [])
            ->andReturn($paginator);
        
        $result = $this->userService->getPaginatedUsers(1);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles perPage = PHP_INT_MAX gracefully', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->userRepository->shouldReceive('paginate')
            ->once()
            ->with(PHP_INT_MAX, [])
            ->andReturn($paginator);
        
        $result = $this->userService->getPaginatedUsers(PHP_INT_MAX);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('generates 6-digit pin when pin_code is not provided', function () {
        $data = ['username' => 'test_user', 'password' => 'secret123'];
        
        Hash::shouldReceive('make')
            ->once()
            ->with('secret123')
            ->andReturn('hashed_password');
        
        Hash::shouldReceive('make')
            ->once()
            ->with(Mockery::on(fn($pin) => 
                strlen($pin) === 6 && 
                ctype_digit($pin) &&
                intval($pin) >= 0 &&
                intval($pin) <= 999999
            ))
            ->andReturn('hashed_pin');

        $userMock = new User([
            'username' => 'test_user',
            'password' => 'hashed_password',
            'pin_code' => 'hashed_pin'
        ]);

        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });

        $this->userRepository->shouldReceive('create')
            ->once()
            ->andReturn($userMock);

        $result = $this->userService->createUser($data);
        
        expect($result)->toBeInstanceOf(User::class)
            ->and(strlen($result->pin_code))->toBe(6)
            ->and($result->pin_code)->toMatch('/^\d{6}$/');
    });
});

// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

describe('Edge Cases & Corner Cases Tests', function () {
    it('throws ConflictHttpException when PostgreSQL throws FK violation 23503 on delete', function () {
        $user = new User(['role' => 'cashier']);
        $user->id = 'uuid-123';
        
        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        $this->userRepository->shouldReceive('findById')
            ->with('uuid-123')
            ->andReturn($user);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);
        
        Log::shouldReceive('error')->once();

        $queryException = new QueryException(
            'delete', 
            'DELETE FROM users WHERE id = ?', 
            [], 
            new Exception('SQL Error')
        );
        
        $reflection = new ReflectionClass($queryException);
        $codeProperty = $reflection->getProperty('code');
        $codeProperty->setAccessible(true);
        $codeProperty->setValue($queryException, '23503');

        $this->userRepository->shouldReceive('delete')
            ->once()
            ->with(Mockery::on(fn($u) => $u->id === 'uuid-123'))
            ->andThrow($queryException);

        $this->userService->deleteUser('uuid-123');
    })->throws(ConflictHttpException::class, 'Cannot delete this user because they have related transaction records. Consider deactivating instead.');

    it('rethrows standard QueryExceptions if not FK violation', function () {
        $user = new User(['role' => 'cashier']);
        $user->id = 'uuid-123';
        
        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        $this->userRepository->shouldReceive('findById')
            ->with('uuid-123')
            ->andReturn($user);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);
        
        Log::shouldReceive('error')->once();

        $queryException = new QueryException(
            'delete', 
            'DELETE FROM users WHERE id = ?', 
            [], 
            new Exception('Generic SQL Error')
        );

        $this->userRepository->shouldReceive('delete')
            ->once()
            ->with(Mockery::on(fn($u) => $u->id === 'uuid-123'))
            ->andThrow($queryException);

        $this->userService->deleteUser('uuid-123');
    })->throws(QueryException::class);

    it('handles empty filters array', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->userRepository->shouldReceive('paginate')
            ->once()
            ->with(15, [])
            ->andReturn($paginator);
        
        $result = $this->userService->getPaginatedUsers();
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles complex filters array', function () {
        $filters = [
            'role' => 'admin',
            'status' => 'active',
            'search' => 'john',
            'sort_by' => 'created_at',
            'sort_order' => 'desc',
        ];
        
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->userRepository->shouldReceive('paginate')
            ->once()
            ->with(20, $filters)
            ->andReturn($paginator);
        
        $result = $this->userService->getPaginatedUsers(20, $filters);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles user with no password field during creation', function () {
        $data = [
            'username' => 'no_password_user',
            'pin_code' => '123456'
        ];
        
        Hash::shouldReceive('make')
            ->once()
            ->with('123456')
            ->andReturn('hashed_pin');

        $userMock = new User([
            'username' => 'no_password_user',
            'pin_code' => 'hashed_pin'
        ]);

        // Mock DB transaction
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) {
                return $closure();
            });

        $this->userRepository->shouldReceive('create')
            ->once()
            ->with(Mockery::on(fn($data) => !isset($data['password'])))
            ->andReturn($userMock);

        $result = $this->userService->createUser($data);
        
        expect($result)->toBeInstanceOf(User::class)
            ->and($result->pin_code)->toBe('123456');
    });

    it('logs error and rethrows when repository throws unexpected exception', function () {
        $user = new User(['role' => 'cashier']);
        $user->id = 'uuid-123';
        
        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin';

        $this->userRepository->shouldReceive('findById')
            ->with('uuid-123')
            ->andReturn($user);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);
        
        Log::shouldReceive('error')->once();
        
        $unexpectedException = new Exception('Unexpected database error');

        $this->userRepository->shouldReceive('delete')
            ->once()
            ->andThrow($unexpectedException);

        $this->userService->deleteUser('uuid-123');
    })->throws(Exception::class, 'Unexpected database error');
});

// ==========================================
// 5. DEACTIVATION & ACTIVATION GUARDS (Unit Level)
// ==========================================

describe('Authorization Guards Tests', function () {
    it('throws AuthorizationException when deactivating last active admin', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'uuid-admin-target';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin-current';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-admin-target')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);

        $this->userRepository->shouldReceive('countActiveByRole')
            ->once()
            ->with('admin')
            ->andReturn(1);

        $this->userService->deactivateUser('uuid-admin-target');
    })->throws(AuthorizationException::class, 'Cannot deactivate the last remaining active administrator.');

    it('throws AuthorizationException when deleting last active admin', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'uuid-admin-target';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin-current';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-admin-target')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);

        $this->userRepository->shouldReceive('countActiveByRole')
            ->once()
            ->with('admin')
            ->andReturn(1);

        $this->userService->deleteUser('uuid-admin-target');
    })->throws(AuthorizationException::class, 'Cannot delete the last remaining active administrator.');

    it('throws AuthorizationException when non-admin tries to activate admin', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'uuid-admin';

        $currentManager = new User(['role' => 'manager']);
        $currentManager->id = 'uuid-manager';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-admin')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentManager);

        $this->userService->activateUser('uuid-admin');
    })->throws(AuthorizationException::class, 'Unauthorized action: You do not have permission to modify an administrator account.');

    it('throws AuthorizationException when non-admin tries to deactivate admin', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'uuid-admin';

        $currentManager = new User(['role' => 'manager']);
        $currentManager->id = 'uuid-manager';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-admin')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentManager);

        $this->userService->deactivateUser('uuid-admin');
    })->throws(AuthorizationException::class, 'Unauthorized action: You do not have permission to modify an administrator account.');

    it('throws AuthorizationException when non-admin tries to delete admin', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'uuid-admin';

        $currentManager = new User(['role' => 'manager']);
        $currentManager->id = 'uuid-manager';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-admin')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentManager);

        $this->userService->deleteUser('uuid-admin');
    })->throws(AuthorizationException::class, 'Unauthorized action: You do not have permission to delete an administrator account.');

    it('allows admin to deactivate another admin when more than one exists', function () {
        $targetAdmin = new User(['role' => 'admin']);
        $targetAdmin->id = 'uuid-admin-target';

        $currentAdmin = new User(['role' => 'admin']);
        $currentAdmin->id = 'uuid-admin-current';

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-admin-target')
            ->andReturn($targetAdmin);
        
        Auth::shouldReceive('user')->andReturn($currentAdmin);

        $this->userRepository->shouldReceive('countActiveByRole')
            ->once()
            ->with('admin')
            ->andReturn(2);

        $this->userRepository->shouldReceive('deactivate')
            ->once()
            ->with(Mockery::on(fn($u) => $u->id === 'uuid-admin-target'))
            ->andReturn(true);

        $result = $this->userService->deactivateUser('uuid-admin-target');
        
        expect($result)->toBeTrue();
    });
});

// ==========================================
// 6. CACHE BEHAVIOR TESTS (Unit Level)
// ==========================================

describe('Cache Behavior Tests', function () {
    it('strips sensitive fields before caching', function () {
        $user = new User([
            'id' => 'uuid-123',
            'username' => 'secure_user',
            'role' => 'admin',
            'password' => 'should_not_be_cached',
            'remember_token' => 'should_not_be_cached',
            'email' => 'user@example.com',
        ]);
        $user->id = 'uuid-123';

        Cache::shouldReceive('remember')
            ->once()
            ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
            ->andReturnUsing(function($key, $ttl, $closure) use ($user) {
                $cachedData = $closure();
                
                // Verify sensitive data is stripped
                expect($cachedData)->not->toHaveKey('password')
                    ->and($cachedData)->not->toHaveKey('remember_token');
                
                return $cachedData;
            });

        $this->userRepository->shouldReceive('findById')
            ->once()
            ->with('uuid-123')
            ->andReturn($user);

        $result = $this->userService->getUserById('uuid-123');
        
        expect($result->getAttributes())->not->toHaveKey('password')
            ->and($result->getAttributes())->not->toHaveKey('remember_token');
    });

    it('uses correct cache TTL constant', function () {
        $reflection = new ReflectionClass(UserService::class);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)->toBe(3600);
    });
});

// ==========================================
// 7. DATABASE TRANSACTION TESTS (Unit Level)
// ==========================================

describe('Database Transaction Tests', function () {
    it('wraps user creation in transaction', function () {
        $transactionCalled = false;
        
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) use (&$transactionCalled) {
                $transactionCalled = true;
                return $closure();
            });
        
        Hash::shouldReceive('make')
            ->twice()
            ->andReturn('hashed_value');

        $userMock = new User(['username' => 'test']);
        
        $this->userRepository->shouldReceive('create')
            ->once()
            ->andReturn($userMock);

        $this->userService->createUser([
            'username' => 'test',
            'password' => 'pass',
            'pin_code' => '123456'
        ]);
        
        expect($transactionCalled)->toBeTrue();
    });

    it('wraps user update in transaction', function () {
        $transactionCalled = false;
        
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) use (&$transactionCalled) {
                $transactionCalled = true;
                return $closure();
            });
        
        $targetUser = new User(['role' => 'cashier']);
        $targetUser->id = 'uuid-123';
        
        Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
        
        $this->userRepository->shouldReceive('findById')
            ->twice()
            ->with('uuid-123')
            ->andReturn($targetUser);
        
        $this->userRepository->shouldReceive('update')
            ->once()
            ->andReturn(true);

        $this->userService->updateUser('uuid-123', ['username' => 'new_name']);
        
        expect($transactionCalled)->toBeTrue();
    });

    it('logs error when transaction fails', function () {
        $expectedException = new Exception('Transaction failed');
        
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andThrow($expectedException);
        
        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::on(fn($message) => 
                str_contains($message, 'Failed to create user')
            ));
        
        Hash::shouldReceive('make')
            ->twice()
            ->andReturn('hashed_value');
        
        $this->userService->createUser([
            'username' => 'test',
            'password' => 'pass',
            'pin_code' => '123456'
        ]);
    })->throws(Exception::class, 'Transaction failed');
});