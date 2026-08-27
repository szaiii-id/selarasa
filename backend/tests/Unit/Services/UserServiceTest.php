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

uses(Tests\TestCase::class);

beforeEach(function () {
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->userService = new UserService($this->userRepository);

    DB::shouldReceive('transaction')
        ->zeroOrMoreTimes()
        ->andReturnUsing(fn($closure) => $closure());

    // Hapus Cache::shouldReceive dari sini, biar setiap test yang atur sendiri
    
    // Default Hash mocks untuk semua test
    Hash::shouldReceive('isHashed')->zeroOrMoreTimes()->andReturn(true);
    Hash::shouldReceive('verifyConfiguration')->zeroOrMoreTimes()->andReturn(true);
});

afterEach(function () {
    Mockery::close();
});

// ==========================================
// 1. HAPPY & NEGATIVE PATH (Unit Level)
// ==========================================

it('returns a paginated list of users (Happy Path)', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    
    $this->userRepository->shouldReceive('paginate')
        ->once()
        ->with(15, ['status' => 'active'])
        ->andReturn($paginator);

    $result = $this->userService->getPaginatedUsers(15, ['status' => 'active']);
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});

it('creates a user and hashes password and pin correctly (Happy Path)', function () {
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

    $this->userRepository->shouldReceive('create')
        ->once()
        ->with(Mockery::on(fn($data) => $data['password'] === 'hashed_secret' && $data['pin_code'] === 'hashed_pin'))
        ->andReturn($userMock);

    $result = $this->userService->createUser($userData);
    
    expect($result->username)->toBe('new_user')
        ->and($result->pin_code)->toBe('123456'); // Raw pin returned
});

it('returns user from repository and caches it when cache is empty (Happy Path with Cache Miss)', function () {
    $user = new User([
        'id' => 'uuid-123',
        'username' => 'db_user',
        'role' => 'admin',
        'password' => 'hashed_password',
        'remember_token' => 'token123'
    ]);
    $user->id = 'uuid-123';

    // Mock Cache::remember to simulate cache miss
    Cache::shouldReceive('remember')
        ->once()
        ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
        ->andReturnUsing(function($key, $ttl, $closure) use ($user) {
            // Simulate cache miss by executing closure
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

it('returns cached user data when cache is available (Happy Path with Cache Hit)', function () {
    $cachedData = [
        'id' => 'uuid-123',
        'username' => 'cached_user',
        'role' => 'admin',
        // Password and remember_token already stripped
    ];

    // Mock Cache::remember to return cached data
    Cache::shouldReceive('remember')
        ->once()
        ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
        ->andReturn($cachedData);

    // Repository should NOT be called on cache hit
    $this->userRepository->shouldNotReceive('findById');

    $result = $this->userService->getUserById('uuid-123');
    
    expect($result)->toBeInstanceOf(User::class)
        ->and($result->username)->toBe('cached_user')
        ->and($result->getAttributes())->not->toHaveKey('password');
});

it('throws ModelNotFoundException when user not found (Negative Path)', function () {
    // Mock Cache::remember to simulate cache miss
    Cache::shouldReceive('remember')
        ->once()
        ->with('users:profile:uuid-123', 3600, Mockery::type('Closure'))
        ->andReturnUsing(function($key, $ttl, $closure) {
            // Simulate cache miss
            return $closure();
        });

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-123')
        ->andReturn(null);

    $this->userService->getUserById('uuid-123');
})->throws(ModelNotFoundException::class, 'User with ID uuid-123 not found.');

it('throws AuthorizationException when non-admin tries to create an admin (Negative Path)', function () {
    $targetUser = new User(['role' => 'cashier']);
    $targetUser->id = 'target-123';
    
    $currentUser = new User(['role' => 'manager']);
    $currentUser->id = 'current-456';

    $this->userRepository->shouldReceive('findById')
        ->with('target-123')
        ->andReturn($targetUser);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentUser);

    $this->userService->updateUser('target-123', ['role' => 'admin']);
})->throws(AuthorizationException::class, 'Unauthorized action: Only administrators can assign the admin role.');

it('throws AuthorizationException when non-admin tries to modify admin account (Negative Path)', function () {
    $targetAdmin = new User(['role' => 'admin']);
    $targetAdmin->id = 'admin-123';
    
    $currentManager = new User(['role' => 'manager']);
    $currentManager->id = 'manager-456';

    $this->userRepository->shouldReceive('findById')
        ->with('admin-123')
        ->andReturn($targetAdmin);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentManager);

    $this->userService->updateUser('admin-123', ['username' => 'hacked_admin']);
})->throws(AuthorizationException::class, 'Unauthorized action: You do not have permission to modify an administrator account.');

// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

it('updates user password when password field is provided (Partition: Password Provided)', function () {
    $targetUser = new User(['role' => 'admin', 'password' => 'old_pass']);
    $targetUser->id = 'uuid-1';
    
    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    
    $this->userRepository->shouldReceive('findById')
        ->twice()
        ->with('uuid-1')
        ->andReturn($targetUser);
    
    Hash::shouldReceive('make')
        ->once()
        ->with('new_pass')
        ->andReturn('hashed_pass');

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        ->with(
            Mockery::on(fn($u) => $u->id === 'uuid-1'),
            Mockery::on(fn($data) => $data['password'] === 'hashed_pass')
        );

    $this->userService->updateUser('uuid-1', ['password' => 'new_pass']);
});

it('unsets password field when password is empty (Partition: Password Empty)', function () {
    $targetUser = new User(['role' => 'admin', 'name' => 'John']);
    $targetUser->id = 'uuid-1';

    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    $this->userRepository->shouldReceive('findById')
        ->twice()
        ->with('uuid-1')
        ->andReturn($targetUser);

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        ->with(
            Mockery::on(fn($u) => $u->id === 'uuid-1'),
            Mockery::on(fn($data) => !array_key_exists('password', $data))
        );

    $this->userService->updateUser('uuid-1', ['name' => 'John', 'password' => '']);
});

it('does not hash password when password is null (Partition: Password Null)', function () {
    $targetUser = new User(['role' => 'admin', 'name' => 'John']);
    $targetUser->id = 'uuid-1';

    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    $this->userRepository->shouldReceive('findById')
        ->twice()
        ->with('uuid-1')
        ->andReturn($targetUser);

    Hash::shouldNotReceive('make');

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        ->with(
            Mockery::on(fn($u) => $u->id === 'uuid-1'),
            Mockery::on(fn($data) => !array_key_exists('password', $data))
        );

    $this->userService->updateUser('uuid-1', ['name' => 'John', 'password' => null]);
});

// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

it('handles perPage = 0 gracefully (BVA: Zero)', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    $this->userRepository->shouldReceive('paginate')
        ->once()
        ->with(0, [])
        ->andReturn($paginator);
    
    $result = $this->userService->getPaginatedUsers(0);
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});

it('handles perPage = PHP_INT_MAX gracefully (BVA: Maximum)', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    $this->userRepository->shouldReceive('paginate')
        ->once()
        ->with(PHP_INT_MAX, [])
        ->andReturn($paginator);
    
    $result = $this->userService->getPaginatedUsers(PHP_INT_MAX);
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});

it('generates 6-digit pin when pin_code is not provided (BVA: Random Pin)', function () {
    $data = ['username' => 'test_user', 'password' => 'secret123'];
    
    Hash::shouldReceive('make')
        ->once()
        ->with('secret123')
        ->andReturn('hashed_password');
    
    Hash::shouldReceive('make')
        ->once()
        ->with(Mockery::on(fn($pin) => strlen($pin) === 6 && ctype_digit($pin)))
        ->andReturn('hashed_pin');

    $userMock = new User([
        'username' => 'test_user',
        'password' => 'hashed_password',
        'pin_code' => 'hashed_pin'
    ]);

    $this->userRepository->shouldReceive('create')
        ->once()
        ->andReturn($userMock);

    $result = $this->userService->createUser($data);
    
    expect($result)->toBeInstanceOf(User::class)
        ->and(strlen($result->pin_code))->toBe(6)
        ->and($result->pin_code)->toMatch('/^\d{6}$/');
});

// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

it('throws ConflictHttpException when PostgreSQL throws FK violation 23503 on delete (Edge Case)', function () {
    $user = new User();
    $user->id = 'uuid-123';
    
    $this->userRepository->shouldReceive('findById')
        ->with('uuid-123')
        ->andReturn($user);
    
    Log::shouldReceive('error')->once();

    $queryException = new QueryException(
        'delete', 
        'DELETE FROM users WHERE id = ?', 
        [], 
        new Exception('SQL Error')
    );
    
    // Set error code to 23503 (FK violation)
    $reflection = new ReflectionClass($queryException);
    $codeProperty = $reflection->getProperty('code');
    $codeProperty->setAccessible(true);
    $codeProperty->setValue($queryException, '23503');

    $this->userRepository
        ->shouldReceive('delete')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-123'))
        ->andThrow($queryException);

    $this->userService->deleteUser('uuid-123');
})->throws(ConflictHttpException::class, 'Cannot delete this user because they have related transaction records. Consider deactivating instead.');

it('rethrows standard QueryExceptions if not FK violation (Edge Case)', function () {
    $user = new User();
    $user->id = 'uuid-123';
    
    $this->userRepository->shouldReceive('findById')
        ->with('uuid-123')
        ->andReturn($user);
    
    Log::shouldReceive('error')->once();

    $queryException = new QueryException(
        'delete', 
        'DELETE FROM users WHERE id = ?', 
        [], 
        new Exception('Generic SQL Error')
    );

    $this->userRepository
        ->shouldReceive('delete')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-123'))
        ->andThrow($queryException);

    $this->userService->deleteUser('uuid-123');
})->throws(QueryException::class);

it('throws AuthorizationException when user tries to delete own account (Edge Case: Self-Delete)', function () {
    $user = new User();
    $user->id = 'uuid-123';
    
    $this->userRepository->shouldReceive('findById')
        ->with('uuid-123')
        ->andReturn($user);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($user); // Same user

    $this->userService->deleteUser('uuid-123');
})->throws(AuthorizationException::class, 'You cannot delete your own account.');

// ==========================================
// 5. DEACTIVATION & ACTIVATION GUARDS (Unit Level)
// ==========================================

it('successfully deactivates a user (Happy Path)', function () {
    $targetCashier = new User(['role' => 'cashier']);
    $targetCashier->id = 'uuid-cashier';

    $currentAdmin = new User(['role' => 'admin']);
    $currentAdmin->id = 'uuid-admin';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-cashier')
        ->andReturn($targetCashier);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentAdmin);

    $this->userRepository
        ->shouldReceive('deactivate')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-cashier'))
        ->andReturn(true);

    $result = $this->userService->deactivateUser('uuid-cashier');
    expect($result)->toBeTrue();
});

it('throws AuthorizationException when deactivating own account (Edge Case)', function () {
    $currentUser = new User(['role' => 'manager']);
    $currentUser->id = 'uuid-self';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-self')
        ->andReturn($currentUser);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentUser);

    $this->userService->deactivateUser('uuid-self');
})->throws(AuthorizationException::class, 'You cannot deactivate your own account.');

it('throws AuthorizationException when deactivating last active admin (Edge Case)', function () {
    $targetAdmin = new User(['role' => 'admin']);
    $targetAdmin->id = 'uuid-admin-target';

    // Gunakan admin juga sebagai current user agar tidak trigger guard permission
    $currentAdmin = new User(['role' => 'admin']);
    $currentAdmin->id = 'uuid-admin-current'; // ID berbeda

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-admin-target')
        ->andReturn($targetAdmin);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentAdmin);

    $this->userRepository->shouldReceive('countActiveByRole')
        ->once()
        ->with('admin')
        ->andReturn(1);

    $this->userService->deactivateUser('uuid-admin-target');
})->throws(AuthorizationException::class, 'Cannot deactivate the last remaining active administrator.');

it('successfully activates a user (Happy Path)', function () {
    $targetUser = new User(['role' => 'cashier']);
    $targetUser->id = 'uuid-cashier';

    $currentAdmin = new User(['role' => 'admin']);
    $currentAdmin->id = 'uuid-admin';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-cashier')
        ->andReturn($targetUser);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentAdmin);

    $this->userRepository
        ->shouldReceive('activate')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-cashier'))
        ->andReturn(true);

    $result = $this->userService->activateUser('uuid-cashier');
    expect($result)->toBeTrue();
});

it('throws AuthorizationException when non-admin tries to activate admin (Negative Path)', function () {
    $targetAdmin = new User(['role' => 'admin']);
    $targetAdmin->id = 'uuid-admin';

    $currentManager = new User(['role' => 'manager']);
    $currentManager->id = 'uuid-manager';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-admin')
        ->andReturn($targetAdmin);
    
    Auth::shouldReceive('user')
        ->once()
        ->andReturn($currentManager);

    $this->userService->activateUser('uuid-admin');
})->throws(AuthorizationException::class, 'Unauthorized action: You do not have permission to modify an administrator account.');