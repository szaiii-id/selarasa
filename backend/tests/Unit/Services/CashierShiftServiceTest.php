<?php

use App\Models\CashierShift;
use App\Services\CashierShiftService;
use App\Contracts\Repositories\CashierShiftRepositoryInterface;
use App\Contracts\Repositories\UserRepositoryInterface;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

uses(TestCase::class);

// Helper function to access protected methods
if (!function_exists('callProtectedMethod')) {
    function callProtectedMethod($object, string $methodName, array $parameters = [])
    {
        $reflection = new ReflectionClass($object);
        $method = $reflection->getMethod($methodName);
        $method->setAccessible(true);
        
        return $method->invokeArgs($object, $parameters);
    }
}

if (!function_exists('mockUserWithPin')) {
    function mockUserWithPin(string $pinCode) {
        $user = Mockery::mock(App\Models\User::class);
        $user->shouldReceive('getAttribute')
            ->with('pin_code')
            ->andReturn($pinCode)
            ->byDefault();
        return $user;
    }
}

if (!function_exists('mockCashierShift')) {
    function mockCashierShift(array $attributes = []) {
        $shift = Mockery::mock(CashierShift::class);
        
        foreach ($attributes as $key => $value) {
            $shift->shouldReceive('getAttribute')
                ->with($key)
                ->andReturn($value)
                ->byDefault();
        }
        
        $shift->shouldReceive('fresh')
            ->andReturnSelf()
            ->byDefault();
        
        return $shift;
    }
}

beforeEach(function () {
    // Mock untuk CashierShiftService
    $this->cashierShiftRepositoryMock = Mockery::mock(CashierShiftRepositoryInterface::class);
    $this->userRepositoryMock = Mockery::mock(UserRepositoryInterface::class);
    $this->cashierShiftModelMock = Mockery::mock(CashierShift::class);
    $this->userModelMock = Mockery::mock(App\Models\User::class);
    
    // Instansiasi CashierShiftService (BUKAN ShiftService)
    $this->cashierShiftService = new CashierShiftService(
        $this->cashierShiftRepositoryMock,
        $this->userRepositoryMock
    );
    
    DB::shouldReceive('transaction')
        ->andReturnUsing(function ($callback) {
            return $callback();
        })
        ->byDefault();
});

afterEach(function () {
    Mockery::close();
});

// ==================== BOUNDARY VALUE ANALYSIS ====================

describe('Boundary Value Analysis - PIN & Balance', function () {
    test('accepts minimum valid 6-digit PIN', function () {
        $userId = 'user-1';
        $pinCode = '000000';
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with($pinCode, 'hashed_pin')
            ->andReturn(true);
        
        callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]);
        
        expect(true)->toBeTrue();
    });
    
    test('accepts maximum valid 6-digit PIN', function () {
        $userId = 'user-1';
        $pinCode = '999999';
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with($pinCode, 'hashed_pin')
            ->andReturn(true);
        
        callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]);
        
        expect(true)->toBeTrue();
    });
    
    test('accepts zero opening balance as boundary', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 0,
            'pin_code' => '123456',
        ];
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('create')
            ->with(Mockery::on(function ($payload) {
                return $payload['opening_balance'] === 0;
            }))
            ->andReturn($this->cashierShiftModelMock);
        
        $result = $this->cashierShiftService->startShift($userId, $data);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
    
    test('accepts maximum integer opening balance', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => PHP_INT_MAX,
            'pin_code' => '123456',
        ];
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('create')
            ->with(Mockery::on(function ($payload) {
                return $payload['opening_balance'] === PHP_INT_MAX;
            }))
            ->andReturn($this->cashierShiftModelMock);
        
        $result = $this->cashierShiftService->startShift($userId, $data);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
});

// ==================== EQUIVALENCE PARTITIONING ====================

describe('Equivalence Partitioning - PIN Verification', function () {
    test('accepts valid PIN code', function () {
        $userId = 'user-1';
        $pinCode = '123456';
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with($pinCode, 'hashed_pin')
            ->andReturn(true);
        
        callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]);
        
        expect(true)->toBeTrue();
    });
    
    test('rejects invalid PIN code', function () {
        $userId = 'user-1';
        $pinCode = '999999';
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with($pinCode, 'hashed_pin')
            ->andReturn(false);
        
        expect(fn() => callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]))
            ->toThrow(AuthorizationException::class, 'Invalid PIN code. Access denied.');
    });
    
    test('rejects non-existent user', function () {
        $userId = 'non-existent';
        $pinCode = '123456';
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn(null);
        
        expect(fn() => callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]))
            ->toThrow(AuthorizationException::class);
    });
    
    test('rejects empty PIN code', function () {
        $userId = 'user-1';
        $pinCode = '';
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('', 'hashed_pin')
            ->andReturn(false);
        
        expect(fn() => callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]))
            ->toThrow(AuthorizationException::class);
    });
    
    test('rejects non-numeric PIN code', function () {
        $userId = 'user-1';
        $pinCode = 'abcdef';
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('abcdef', 'hashed_pin')
            ->andReturn(false);
        
        expect(fn() => callProtectedMethod($this->cashierShiftService, 'verifyUserPin', [$userId, $pinCode]))
            ->toThrow(AuthorizationException::class);
    });
});

describe('Equivalence Partitioning - Shift Ownership', function () {
    test('allows owner to access their shift', function () {
        $shiftSessionId = 1;
        $userId = 'user-1';
        
        $cashierShift = mockCashierShift(['user_id' => $userId]);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftById')
            ->with($shiftSessionId)
            ->andReturn($cashierShift);
        
        $result = callProtectedMethod($this->cashierShiftService, 'getFreshActiveShift', [$shiftSessionId, $userId]);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
    
    test('rejects non-owner', function () {
        $shiftSessionId = 1;
        $userId = 'user-1';
        $differentUserId = 'user-2';
        
        $cashierShift = mockCashierShift(['user_id' => $differentUserId]);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftById')
            ->with($shiftSessionId)
            ->andReturn($cashierShift);
        
        expect(fn() => callProtectedMethod($this->cashierShiftService, 'getFreshActiveShift', [$shiftSessionId, $userId]))
            ->toThrow(AuthorizationException::class);
    });
    
    test('rejects non-existent shift', function () {
        $shiftSessionId = 999;
        $userId = 'user-1';
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftById')
            ->with($shiftSessionId)
            ->andReturn(null);
        
        expect(fn() => callProtectedMethod($this->cashierShiftService, 'getFreshActiveShift', [$shiftSessionId, $userId]))
            ->toThrow(ModelNotFoundException::class);
    });
});

// ==================== EDGE CASES ====================

describe('Edge Cases - Handover Self Validation', function () {
    test('rejects handover to self', function () {
        $shiftSessionId = 1;
        $fromUserId = 'user-1';
        $data = [
            'to_user_id' => 'user-1',
            'pin_code' => '123456',
            'to_user_pin' => '123456',
            'amount_counted' => 100000
        ];
        
        $cashierShift = mockCashierShift(['user_id' => $fromUserId]);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftById')
            ->with($shiftSessionId)
            ->andReturn($cashierShift);
        
        expect(fn() => $this->cashierShiftService->handoverShift($shiftSessionId, $fromUserId, $data))
            ->toThrow(ConflictHttpException::class, 'Cannot hand over a shift to yourself.');
    });
});

// ==================== HAPPY PATH ====================

describe('Happy Path - Successful Operations', function () {
    test('successfully starts a new shift', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 50000,
            'pin_code' => '123456',
            'notes' => 'Morning shift'
        ];
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('create')
            ->with(Mockery::on(function ($payload) use ($userId) {
                return $payload['user_id'] === $userId &&
                       $payload['status'] === CashierShift::STATUS_OPEN &&
                       isset($payload['started_at']) &&
                       $payload['notes'] === 'Morning shift';
            }))
            ->andReturn($this->cashierShiftModelMock);
        
        $result = $this->cashierShiftService->startShift($userId, $data);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
    
    test('successfully gets active shift for user', function () {
        $userId = 'user-1';
        $cashierShift = Mockery::mock(CashierShift::class);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn($cashierShift);
        
        $result = $this->cashierShiftService->getActiveShiftForUser($userId);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
    
    test('returns null when no active shift', function () {
        $userId = 'user-1';
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $result = $this->cashierShiftService->getActiveShiftForUser($userId);
        
        expect($result)->toBeNull();
    });
});

// ==================== NEGATIVE PATH ====================

describe('Negative Path - Exception Handling', function () {
    test('prevents double opening', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 50000,
            'pin_code' => '123456'
        ];
        
        $user = mockUserWithPin('hashed_pin');
        $activeShift = Mockery::mock(CashierShift::class);
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn($activeShift);
        
        expect(fn() => $this->cashierShiftService->startShift($userId, $data))
            ->toThrow(ConflictHttpException::class, 'You already have an active shift session. Please close it before starting a new one.');
    });
    
    test('rejects start with invalid PIN', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 50000,
            'pin_code' => '999999'
        ];
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('999999', 'hashed_pin')
            ->andReturn(false);
        
        expect(fn() => $this->cashierShiftService->startShift($userId, $data))
            ->toThrow(AuthorizationException::class, 'Invalid PIN code. Access denied.');
    });
    
    test('logs error on start failure', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 50000,
            'pin_code' => '123456'
        ];
        
        $user = mockUserWithPin('hashed_pin');
        $exception = new Exception('Database connection failed');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('create')
            ->andThrow($exception);
        
        Log::shouldReceive('error')
            ->once()
            ->with("Failed to start shift for user {$userId}: Database connection failed");
        
        expect(fn() => $this->cashierShiftService->startShift($userId, $data))
            ->toThrow(Exception::class, 'Database connection failed');
    });
});

// ==================== COMBINED EDGE CASES ====================

describe('Combined Edge Cases', function () {
    test('handles null notes in start shift', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 50000,
            'pin_code' => '123456',
            'notes' => null
        ];
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('create')
            ->with(Mockery::on(function ($payload) {
                return $payload['notes'] === null;
            }))
            ->andReturn($this->cashierShiftModelMock);
        
        $result = $this->cashierShiftService->startShift($userId, $data);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
    
    test('handles empty notes in start shift', function () {
        $userId = 'user-1';
        $data = [
            'shift_id' => 1,
            'opening_balance' => 50000,
            'pin_code' => '123456',
            'notes' => ''
        ];
        
        $user = mockUserWithPin('hashed_pin');
        
        $this->userRepositoryMock
            ->shouldReceive('findById')
            ->with($userId)
            ->andReturn($user);
        
        Hash::shouldReceive('check')
            ->with('123456', 'hashed_pin')
            ->andReturn(true);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('findOpenShiftByUser')
            ->with($userId)
            ->andReturn(null);
        
        $this->cashierShiftRepositoryMock
            ->shouldReceive('create')
            ->with(Mockery::on(function ($payload) {
                return $payload['notes'] === '';
            }))
            ->andReturn($this->cashierShiftModelMock);
        
        $result = $this->cashierShiftService->startShift($userId, $data);
        
        expect($result)->toBeInstanceOf(CashierShift::class);
    });
});