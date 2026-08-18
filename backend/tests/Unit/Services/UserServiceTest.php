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
    // Mock the repository
    $this->userRepository = Mockery::mock(UserRepositoryInterface::class);
    $this->userService = new UserService($this->userRepository);

    // Mock DB::transaction to just execute the closure without database connection
    DB::shouldReceive('transaction')
        ->zeroOrMoreTimes()
        ->andReturnUsing(fn($closure) => $closure());

    // Mock Cache::remember to execute the closure directly
    Cache::shouldReceive('remember')
        ->zeroOrMoreTimes()
        ->andReturnUsing(fn($key, $ttl, $closure) => $closure());
});

afterEach(function () {
    Mockery::close();
});

// ==========================================
// 1. HAPPY & NEGATIVE PATH (Unit Level)
// ==========================================

it('returns a paginated list of users (Happy Path)', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    
    $this->userRepository
        ->shouldReceive('paginate')
        ->once()
        ->with(15, ['status' => 'active'])
        ->andReturn($paginator);

    $result = $this->userService->getPaginatedUsers(15, ['status' => 'active']);
    
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});

it('creates a user and hashes the password correctly (Happy Path)', function () {
    Hash::shouldReceive('make')->once()->with('secret123')->andReturn('hashed_secret');
    Hash::shouldReceive('isHashed')->zeroOrMoreTimes()->andReturn(true);
    Hash::shouldReceive('verifyConfiguration')->zeroOrMoreTimes()->andReturn(true);

    $userData = ['username' => 'new_user', 'password' => 'secret123'];
    $expectedData = ['username' => 'new_user', 'password' => 'hashed_secret'];
    
    $userMock = new User($expectedData);

    $this->userRepository
        ->shouldReceive('create')
        ->once()
        ->with($expectedData)
        ->andReturn($userMock);

    $result = $this->userService->createUser($userData);

    expect($result->username)->toBe('new_user');
});

it('throws ModelNotFoundException when fetching non-existent user ID (Negative Path)', function () {
    $this->userRepository
        ->shouldReceive('findById')
        ->once()
        ->with('uuid-123')
        ->andReturn(null);

    $this->userService->getUserById('uuid-123');
})->throws(ModelNotFoundException::class, "User with ID uuid-123 not found.");

it('throws AuthorizationException when non-admin tries to create an admin (Negative Path)', function () {
    $targetUser = new User(['id' => 'target-123', 'role' => 'cashier']);
    $currentUser = new User(['id' => 'current-456', 'role' => 'manager']);

    // Mock getting the target user
    $this->userRepository->shouldReceive('findById')->with('target-123')->andReturn($targetUser);
    
    // Mock the current logged in user (Manager)
    Auth::shouldReceive('user')->once()->andReturn($currentUser);

    // Attempting to elevate target user to 'admin'
    $this->userService->updateUser('target-123', ['role' => 'admin']);
})->throws(AuthorizationException::class, 'Unauthorized action: Only administrators can assign the admin role.');


// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

it('updates user password when password field is provided (Partition: Password Provided)', function () {
    $targetUser = Mockery::mock(User::class)->makePartial();
    $targetUser->shouldReceive('refresh')->andReturn($targetUser);
    
    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    $this->userRepository->shouldReceive('findById')->andReturn($targetUser);
    Hash::shouldReceive('make')->with('new_pass')->andReturn('hashed_pass');

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        // Ensure the array passed to update() has the hashed password
        ->with($targetUser, Mockery::on(fn($data) => $data['password'] === 'hashed_pass'));

    $this->userService->updateUser('uuid-1', ['password' => 'new_pass']);
});

it('unsets password field when password is empty to prevent blanking passwords (Partition: Password Empty)', function () {
    $targetUser = Mockery::mock(User::class)->makePartial();
    $targetUser->shouldReceive('refresh')->andReturn($targetUser);

    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    $this->userRepository->shouldReceive('findById')->andReturn($targetUser);

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        // Ensure the password key is COMPLETELY removed from the data array
        ->with($targetUser, Mockery::on(fn($data) => !array_key_exists('password', $data)));

    // Passing empty password
    $this->userService->updateUser('uuid-1', ['name' => 'John', 'password' => '']);
});


// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

it('passes extreme negative pagination limits directly to repository (BVA)', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    
    // BVA: Testing boundary value of 0 or negative pagination limits
    // Service should not block it, let the Database/Repository handle it
    $this->userRepository
        ->shouldReceive('paginate')
        ->once()
        ->with(-1, [])
        ->andReturn($paginator);

    $result = $this->userService->getPaginatedUsers(-1);
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});


// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

it('throws ConflictHttpException when PostgreSQL throws Foreign Key Violation 23503 on delete (Edge Case)', function () {
    $user = new User(['id' => 'uuid-123']);
    $this->userRepository->shouldReceive('findById')->with('uuid-123')->andReturn($user);

    Log::shouldReceive('error')->once();

    // 1. Buat Exception bawaan seperti biasa
    $queryException = new QueryException(
        'delete', 
        'DELETE FROM users WHERE id = ?', 
        [], 
        new Exception('SQL Error')
    );

    // 2. Gunakan Reflection API untuk "menyuntikkan" kode '23503' (String) 
    // ke dalam property protected milik core Exception PHP
    $reflection = new ReflectionClass(Exception::class);
    $codeProperty = $reflection->getProperty('code');
    $codeProperty->setAccessible(true);
    $codeProperty->setValue($queryException, '23503'); // Paksa menjadi String

    // 3. Lanjutkan mock
    $this->userRepository
        ->shouldReceive('delete')
        ->once()
        ->with($user)
        ->andThrow($queryException);

    $this->userService->deleteUser('uuid-123');
})->throws(ConflictHttpException::class, 'Cannot delete this user because they have related transaction records. Consider deactivating instead.');

it('rethrows standard QueryExceptions normally if not a foreign key violation (Edge Case)', function () {
    $user = new User(['id' => 'uuid-123']);
    $this->userRepository->shouldReceive('findById')->with('uuid-123')->andReturn($user);

    Log::shouldReceive('error')->once();

    // Create a generic QueryException (e.g. syntax error or table drop) with code 500
    $queryException = new QueryException(
        'delete', 
        'DELETE FROM users WHERE id = ?', 
        [], 
        new Exception('Generic SQL Error', 500)
    );

    $this->userRepository
        ->shouldReceive('delete')
        ->once()
        ->with($user)
        ->andThrow($queryException);

    $this->userService->deleteUser('uuid-123');
})->throws(QueryException::class);

// ==========================================
// 5. DEACTIVATION GUARDS (Unit Level)
// ==========================================

it('successfully deactivates a user when all guards pass (Happy Path)', function () {
    // FIX: Set ID secara eksplisit
    $targetCashier = new User(['role' => 'cashier']);
    $targetCashier->id = 'uuid-cashier';

    $currentAdmin = new User(['role' => 'admin']);
    $currentAdmin->id = 'uuid-admin';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-cashier')
        ->andReturn($targetCashier);

    Auth::shouldReceive('user')->once()->andReturn($currentAdmin);

    $this->userRepository->shouldReceive('deactivate')
        ->once()
        ->with($targetCashier)
        ->andReturn(true);

    $result = $this->userService->deactivateUser('uuid-cashier');

    expect($result)->toBeTrue();
});

it('throws AuthorizationException when a user tries to deactivate their own account (Negative Path / Edge Case)', function () {
    $currentUser = new User(['role' => 'manager']);
    $currentUser->id = 'uuid-self';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-self')
        ->andReturn($currentUser);

    // User yang login adalah user yang sama dengan yang akan dinonaktifkan
    Auth::shouldReceive('user')->once()->andReturn($currentUser);

    $this->userService->deactivateUser('uuid-self');
})->throws(AuthorizationException::class, 'You cannot deactivate your own account.');

it('throws AuthorizationException when trying to deactivate the last active admin (Negative Path / Edge Case)', function () {
    $targetAdmin = new User(['role' => 'admin']);
    $targetAdmin->id = 'uuid-admin-target';

    $currentManager = new User(['role' => 'manager']);
    $currentManager->id = 'uuid-manager';

    $this->userRepository->shouldReceive('findById')
        ->once()
        ->with('uuid-admin-target')
        ->andReturn($targetAdmin);

    Auth::shouldReceive('user')->once()->andReturn($currentManager);

    // Mock perhitungan jumlah admin aktif
    $this->userRepository->shouldReceive('countActiveByRole')
        ->once()
        ->with('admin')
        ->andReturn(1);

    $this->userService->deactivateUser('uuid-admin-target');
})->throws(AuthorizationException::class, 'Cannot deactivate the last remaining active administrator.');