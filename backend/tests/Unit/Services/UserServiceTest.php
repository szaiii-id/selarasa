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
    
    $this->userRepository->shouldReceive('paginate')->once()->with(15, ['status' => 'active'])->andReturn($paginator);

    $result = $this->userService->getPaginatedUsers(15, ['status' => 'active']);
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});

it('creates a user and hashes the password correctly (Happy Path)', function () {
    Hash::shouldReceive('make')->once()->with('secret123')->andReturn('hashed_secret');
    
    // TAMBAHKAN KEMBALI KEDUA BARIS INI:
    Hash::shouldReceive('isHashed')->zeroOrMoreTimes()->andReturn(true);
    Hash::shouldReceive('verifyConfiguration')->zeroOrMoreTimes()->andReturn(true);

    $userData = ['username' => 'new_user', 'password' => 'secret123'];
    $expectedData = ['username' => 'new_user', 'password' => 'hashed_secret'];
    
    $userMock = new User($expectedData);

    $this->userRepository->shouldReceive('create')->once()->with($expectedData)->andReturn($userMock);

    $result = $this->userService->createUser($userData);
    expect($result->username)->toBe('new_user');
});

it('throws ModelNotFoundException when fetching non-existent user ID (Negative Path)', function () {
    $this->userRepository->shouldReceive('findById')->once()->with('uuid-123')->andReturn(null);
    $this->userService->getUserById('uuid-123');
})->throws(ModelNotFoundException::class, "User with ID uuid-123 not found.");

it('throws AuthorizationException when non-admin tries to create an admin (Negative Path)', function () {
    $targetUser = new User(['role' => 'cashier']);
    $targetUser->id = 'target-123';
    
    $currentUser = new User(['role' => 'manager']);
    $currentUser->id = 'current-456';

    $this->userRepository->shouldReceive('findById')->with('target-123')->andReturn($targetUser);
    Auth::shouldReceive('user')->once()->andReturn($currentUser);

    $this->userService->updateUser('target-123', ['role' => 'admin']);
})->throws(AuthorizationException::class, 'Unauthorized action: Only administrators can assign the admin role.');

// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

it('updates user password when password field is provided (Partition: Password Provided)', function () {
    $targetUser = new User(['role' => 'admin', 'password' => 'old_pass']);
    $targetUser->id = 'uuid-1';
    
    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    
    // Dipanggil 2 kali: Satu oleh getUserById (cache), satu lagi oleh return findById di akhir update
    $this->userRepository->shouldReceive('findById')->twice()->with('uuid-1')->andReturn($targetUser);
    
    Hash::shouldReceive('make')->with('new_pass')->andReturn('hashed_pass');

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        // Gunakan Mockery::on untuk memvalidasi ID dari objek hasil rehydrated
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-1'), Mockery::on(fn($data) => $data['password'] === 'hashed_pass'));

    $this->userService->updateUser('uuid-1', ['password' => 'new_pass']);
});

it('unsets password field when password is empty to prevent blanking passwords (Partition: Password Empty)', function () {
    $targetUser = new User(['role' => 'admin', 'name' => 'John']);
    $targetUser->id = 'uuid-1';

    Auth::shouldReceive('user')->andReturn(new User(['role' => 'admin']));
    $this->userRepository->shouldReceive('findById')->twice()->with('uuid-1')->andReturn($targetUser);

    $this->userRepository
        ->shouldReceive('update')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-1'), Mockery::on(fn($data) => !array_key_exists('password', $data)));

    $this->userService->updateUser('uuid-1', ['name' => 'John', 'password' => '']);
});

// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

it('passes extreme negative pagination limits directly to repository (BVA)', function () {
    $paginator = Mockery::mock(LengthAwarePaginator::class);
    $this->userRepository->shouldReceive('paginate')->once()->with(-1, [])->andReturn($paginator);
    
    $result = $this->userService->getPaginatedUsers(-1);
    expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
});

// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

it('throws ConflictHttpException when PostgreSQL throws Foreign Key Violation 23503 on delete (Edge Case)', function () {
    $user = new User();
    $user->id = 'uuid-123';
    
    $this->userRepository->shouldReceive('findById')->with('uuid-123')->andReturn($user);
    Log::shouldReceive('error')->once();

    $queryException = new QueryException('delete', 'DELETE FROM users WHERE id = ?', [], new Exception('SQL Error'));
    $reflection = new ReflectionClass(Exception::class);
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

it('rethrows standard QueryExceptions normally if not a foreign key violation (Edge Case)', function () {
    $user = new User();
    $user->id = 'uuid-123';
    
    $this->userRepository->shouldReceive('findById')->with('uuid-123')->andReturn($user);
    Log::shouldReceive('error')->once();

    $queryException = new QueryException('delete', 'DELETE FROM users WHERE id = ?', [], new Exception('Generic SQL Error', 500));

    $this->userRepository
        ->shouldReceive('delete')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-123'))
        ->andThrow($queryException);

    $this->userService->deleteUser('uuid-123');
})->throws(QueryException::class);

// ==========================================
// 5. DEACTIVATION GUARDS (Unit Level)
// ==========================================

it('successfully deactivates a user when all guards pass (Happy Path)', function () {
    $targetCashier = new User(['role' => 'cashier']);
    $targetCashier->id = 'uuid-cashier';

    $currentAdmin = new User(['role' => 'admin']);
    $currentAdmin->id = 'uuid-admin';

    $this->userRepository->shouldReceive('findById')->once()->with('uuid-cashier')->andReturn($targetCashier);
    Auth::shouldReceive('user')->once()->andReturn($currentAdmin);

    $this->userRepository
        ->shouldReceive('deactivate')
        ->once()
        ->with(Mockery::on(fn($u) => $u->id === 'uuid-cashier'))
        ->andReturn(true);

    $result = $this->userService->deactivateUser('uuid-cashier');
    expect($result)->toBeTrue();
});

it('throws AuthorizationException when a user tries to deactivate their own account (Negative Path / Edge Case)', function () {
    $currentUser = new User(['role' => 'manager']);
    $currentUser->id = 'uuid-self';

    $this->userRepository->shouldReceive('findById')->once()->with('uuid-self')->andReturn($currentUser);
    Auth::shouldReceive('user')->once()->andReturn($currentUser);

    $this->userService->deactivateUser('uuid-self');
})->throws(AuthorizationException::class, 'You cannot deactivate your own account.');

it('throws AuthorizationException when trying to deactivate the last active admin (Negative Path / Edge Case)', function () {
    $targetAdmin = new User(['role' => 'admin']);
    $targetAdmin->id = 'uuid-admin-target';

    $currentManager = new User(['role' => 'manager']);
    $currentManager->id = 'uuid-manager';

    $this->userRepository->shouldReceive('findById')->once()->with('uuid-admin-target')->andReturn($targetAdmin);
    Auth::shouldReceive('user')->once()->andReturn($currentManager);

    $this->userRepository->shouldReceive('countActiveByRole')->once()->with('admin')->andReturn(1);

    $this->userService->deactivateUser('uuid-admin-target');
})->throws(AuthorizationException::class, 'Cannot deactivate the last remaining active administrator.');