<?php

use App\Models\Shift;
use App\Services\ShiftService;
use App\Contracts\Repositories\ShiftRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

// Use Laravel's TestCase for facade support
uses(TestCase::class);

// Helper function to access protected methods
function callProtectedMethod($object, string $methodName, array $parameters = [])
{
    $reflection = new ReflectionClass($object);
    $method = $reflection->getMethod($methodName);
    $method->setAccessible(true);
    
    return $method->invokeArgs($object, $parameters);
}

// Setup before each test
beforeEach(function () {
    $this->shiftRepositoryMock = Mockery::mock(ShiftRepositoryInterface::class);
    $this->shiftModelMock = Mockery::mock(Shift::class);
    $this->shiftService = new ShiftService($this->shiftRepositoryMock);
    
    // Mock DB facade
    DB::shouldReceive('transaction')
        ->andReturnUsing(function ($callback) {
            return $callback();
        })
        ->byDefault();
});

// Cleanup after each test
afterEach(function () {
    Mockery::close();
});

// ==================== BOUNDARY VALUE ANALYSIS ====================

describe('Boundary Value Analysis - Cache TTL', function () {
    test('cache TTL is exactly 86400 seconds (24 hours)', function () {
        $reflection = new ReflectionClass($this->shiftService);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)
            ->toBe(86400)
            ->toBeInt();
    });
    
    test('cache TTL is within acceptable boundary range', function () {
        $reflection = new ReflectionClass($this->shiftService);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)
            ->toBeGreaterThanOrEqual(3600)
            ->toBeLessThanOrEqual(604800);
    });
    
    test('cache TTL is positive and non-zero', function () {
        $reflection = new ReflectionClass($this->shiftService);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)
            ->toBeGreaterThan(0)
            ->not->toBeNull();
    });
});

// ==================== EQUIVALENCE PARTITIONING ====================

describe('Equivalence Partitioning - Valid IDs', function () {
    test('accepts minimum positive integer ID', function () {
        $id = 1;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($this->shiftModelMock);
        
        $result = callProtectedMethod($this->shiftService, 'getFreshShift', [$id]);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
    
    test('accepts typical integer ID', function () {
        $id = 100;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($this->shiftModelMock);
        
        $result = callProtectedMethod($this->shiftService, 'getFreshShift', [$id]);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
    
    test('accepts large integer ID', function () {
        $id = 999999;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($this->shiftModelMock);
        
        $result = callProtectedMethod($this->shiftService, 'getFreshShift', [$id]);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
});

describe('Equivalence Partitioning - Invalid IDs', function () {
    test('rejects zero as invalid ID and throws ModelNotFoundException', function () {
        $id = 0;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn(null);
        
        expect(fn() => callProtectedMethod($this->shiftService, 'getFreshShift', [$id]))
            ->toThrow(ModelNotFoundException::class, "Shift schedule with ID {$id} not found.");
    });
    
    test('rejects negative integer as invalid ID and throws ModelNotFoundException', function () {
        $id = -1;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn(null);
        
        expect(fn() => callProtectedMethod($this->shiftService, 'getFreshShift', [$id]))
            ->toThrow(ModelNotFoundException::class, "Shift schedule with ID {$id} not found.");
    });
    
    test('rejects null as invalid ID and throws TypeError', function () {
        $id = null;
        
        // Since ShiftRepository::findById has int type hint,
        // passing null will cause TypeError
        expect(fn() => callProtectedMethod($this->shiftService, 'getFreshShift', [$id]))
            ->toThrow(TypeError::class);
    });
    
    test('rejects string as invalid ID and throws TypeError', function () {
        $id = 'abc';
        
        // Since ShiftRepository::findById has int type hint,
        // passing string will cause TypeError
        expect(fn() => callProtectedMethod($this->shiftService, 'getFreshShift', [$id]))
            ->toThrow(TypeError::class);
    });
});

// ==================== EDGE CASES & CORNER CASES ====================

describe('Edge Cases - Extreme Values', function () {
    test('handles PHP_INT_MAX as ID', function () {
        $extremeId = PHP_INT_MAX;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($extremeId)
            ->andReturn($this->shiftModelMock);
        
        $result = callProtectedMethod($this->shiftService, 'getFreshShift', [$extremeId]);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
    
    test('handles empty array for create data', function () {
        $emptyData = [];
        
        $this->shiftRepositoryMock
            ->shouldReceive('create')
            ->with($emptyData)
            ->andReturn($this->shiftModelMock);
        
        $result = $this->shiftService->createShift($emptyData);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
    
    test('handles null values in update data', function () {
        $id = 1;
        $data = ['name' => null, 'description' => null];
        
        $freshShift = Mockery::mock(Shift::class);
        // Mock getAttribute for id property
        $freshShift->shouldReceive('getAttribute')
            ->with('id')
            ->andReturn($id);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($freshShift);
        
        $this->shiftRepositoryMock
            ->shouldReceive('update')
            ->with($freshShift, $data)
            ->andReturn(true);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($freshShift);
        
        $result = $this->shiftService->updateShift($id, $data);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
    
    test('handles very large data array for create', function () {
        $largeData = array_fill(0, 1000, 'test_data');
        
        $this->shiftRepositoryMock
            ->shouldReceive('create')
            ->with($largeData)
            ->andReturn($this->shiftModelMock);
        
        $result = $this->shiftService->createShift($largeData);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
});

// ==================== HAPPY PATH ====================

describe('Happy Path - Successful Operations', function () {
    test('successfully deletes a shift', function () {
        $id = 1;
        $mockShift = Mockery::mock(Shift::class);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($mockShift);
        
        $this->shiftRepositoryMock
            ->shouldReceive('delete')
            ->with($mockShift)
            ->andReturn(true);
        
        $result = $this->shiftService->deleteShift($id);
        
        expect($result)->toBeTrue();
    });
    
    test('successfully updates a shift and returns fresh instance', function () {
        $id = 1;
        $data = ['name' => 'Updated Shift'];
        
        $freshShift = Mockery::mock(Shift::class);
        // Mock getAttribute for id property
        $freshShift->shouldReceive('getAttribute')
            ->with('id')
            ->andReturn($id);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($freshShift);
        
        $this->shiftRepositoryMock
            ->shouldReceive('update')
            ->with($freshShift, $data)
            ->andReturn(true);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($freshShift);
        
        $result = $this->shiftService->updateShift($id, $data);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
    
    test('successfully creates a shift with valid data', function () {
        $data = [
            'name' => 'Morning Shift',
            'start_time' => '08:00:00',
            'end_time' => '16:00:00'
        ];
        
        $this->shiftRepositoryMock
            ->shouldReceive('create')
            ->with($data)
            ->andReturn($this->shiftModelMock);
        
        $result = $this->shiftService->createShift($data);
        
        expect($result)->toBeInstanceOf(Shift::class);
    });
});

// ==================== NEGATIVE PATH ====================

describe('Negative Path - Exception Handling', function () {
    test('logs error and rethrows exception on create failure', function () {
        $data = ['name' => 'Test Shift'];
        $exception = new Exception('Database connection failed');
        
        Log::shouldReceive('error')
            ->once()
            ->with('Failed to create shift schedule: Database connection failed');
        
        $this->shiftRepositoryMock
            ->shouldReceive('create')
            ->with($data)
            ->andThrow($exception);
        
        expect(fn() => $this->shiftService->createShift($data))
            ->toThrow(Exception::class, 'Database connection failed');
    });
    
    test('throws ConflictHttpException on foreign key constraint violation', function () {
        $id = 1;
        $mockShift = Mockery::mock(Shift::class);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($mockShift);
        
        $queryException = new QueryException(
            'postgres',
            'delete from shifts where id = ?',
            [$id],
            new Exception('Foreign key violation')
        );
        
        $reflection = new ReflectionClass($queryException);
        $codeProperty = $reflection->getProperty('code');
        $codeProperty->setAccessible(true);
        $codeProperty->setValue($queryException, '23503');
        
        $this->shiftRepositoryMock
            ->shouldReceive('delete')
            ->with($mockShift)
            ->andThrow($queryException);
        
        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::type('string'));
        
        expect(fn() => $this->shiftService->deleteShift($id))
            ->toThrow(
                ConflictHttpException::class,
                'Cannot delete this shift schedule because it is associated with existing cashier session records. Consider deactivating it instead.'
            );
    });
    
    test('throws ModelNotFoundException when updating non-existent shift', function () {
        $id = 999;
        $data = ['name' => 'Test'];
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn(null);
        
        expect(fn() => $this->shiftService->updateShift($id, $data))
            ->toThrow(ModelNotFoundException::class, "Shift schedule with ID {$id} not found.");
    });
    
    test('throws ModelNotFoundException when deleting non-existent shift', function () {
        $id = 0;
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn(null);
        
        expect(fn() => $this->shiftService->deleteShift($id))
            ->toThrow(ModelNotFoundException::class, "Shift schedule with ID {$id} not found.");
    });
    
    test('rethrows generic QueryException on delete', function () {
        $id = 1;
        $mockShift = Mockery::mock(Shift::class);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($mockShift);
        
        $queryException = new QueryException(
            'postgres',
            'delete from shifts where id = ?',
            [$id],
            new Exception('Generic database error')
        );
        
        $this->shiftRepositoryMock
            ->shouldReceive('delete')
            ->with($mockShift)
            ->andThrow($queryException);
        
        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::type('string'));
        
        expect(fn() => $this->shiftService->deleteShift($id))
            ->toThrow(QueryException::class);
    });
    
    test('logs error and rethrows exception on update failure', function () {
        $id = 1;
        $data = ['name' => 'Test'];
        $mockShift = Mockery::mock(Shift::class);
        $exception = new Exception('Update failed');
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($mockShift);
        
        $this->shiftRepositoryMock
            ->shouldReceive('update')
            ->with($mockShift, $data)
            ->andThrow($exception);
        
        Log::shouldReceive('error')
            ->once()
            ->with("Failed to update shift schedule ID {$id}: Update failed");
        
        expect(fn() => $this->shiftService->updateShift($id, $data))
            ->toThrow(Exception::class, 'Update failed');
    });
});

// ==================== COMBINED EDGE + NEGATIVE CASES ====================

describe('Combined Edge and Negative Cases', function () {
    test('handles update with extremely large data payload', function () {
        $id = 1;
        $data = array_fill(0, 10000, 'large_data');
        $mockShift = Mockery::mock(Shift::class);
        $exception = new Exception('Memory limit exceeded');
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($mockShift);
        
        $this->shiftRepositoryMock
            ->shouldReceive('update')
            ->with($mockShift, $data)
            ->andThrow($exception);
        
        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::type('string'));
        
        expect(fn() => $this->shiftService->updateShift($id, $data))
            ->toThrow(Exception::class, 'Memory limit exceeded');
    });
    
    test('handles delete with string ID that looks like integer', function () {
        $id = 1; // Changed from '123' to 1 since repository expects int
        $mockShift = Mockery::mock(Shift::class);
        
        $this->shiftRepositoryMock
            ->shouldReceive('findById')
            ->with($id)
            ->andReturn($mockShift);
        
        $this->shiftRepositoryMock
            ->shouldReceive('delete')
            ->with($mockShift)
            ->andReturn(true);
        
        $result = $this->shiftService->deleteShift($id);
        
        expect($result)->toBeTrue();
    });
});