<?php

use App\Contracts\Repositories\RawMaterialCategoryRepositoryInterface;
use App\Models\RawMaterialCategory;
use App\Services\RawMaterialCategoryService;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    $this->categoryRepository = Mockery::mock(RawMaterialCategoryRepositoryInterface::class);
    $this->categoryService = new RawMaterialCategoryService($this->categoryRepository);
    
    // Mock DB transaction
    DB::shouldReceive('transaction')
        ->andReturnUsing(function ($callback) {
            return $callback();
        })
        ->byDefault();
});

afterEach(function () {
    Mockery::close();
});

// ==========================================
// 1. HAPPY & NEGATIVE PATH (Unit Level)
// ==========================================

describe('Happy Path Tests', function () {
    it('returns a paginated list of categories', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with(['status' => 'active'], 15)
            ->andReturn($paginator);

        $result = $this->categoryService->getPaginatedCategories(15, ['status' => 'active']);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('returns category by ID when found', function () {
        $categoryId = 1;
        $expectedCategory = new RawMaterialCategory([
            'id' => $categoryId,
            'name' => 'Bahan Pokok',
            'description' => 'Kategori bahan pokok'
        ]);
        $expectedCategory->id = $categoryId;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($expectedCategory);

        $result = $this->categoryService->getCategoryById($categoryId);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->id)->toBe($categoryId)
            ->and($result->name)->toBe('Bahan Pokok');
    });

    it('creates category successfully', function () {
        $data = [
            'name' => 'Bumbu Dapur',
            'description' => 'Kategori untuk bumbu dapur'
        ];
        
        $categoryMock = new RawMaterialCategory($data);
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with($data)
            ->andReturn($categoryMock);

        $result = $this->categoryService->createCategory($data);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->name)->toBe('Bumbu Dapur')
            ->and($result->description)->toBe('Kategori untuk bumbu dapur');
    });

    it('successfully updates category', function () {
        $categoryId = 1;
        $data = ['name' => 'Bahan Pokok Updated'];
        
        $existingCategory = new RawMaterialCategory([
            'id' => $categoryId,
            'name' => 'Bahan Pokok'
        ]);
        $existingCategory->id = $categoryId;

        $updatedCategory = new RawMaterialCategory([
            'id' => $categoryId,
            'name' => 'Bahan Pokok Updated'
        ]);
        $updatedCategory->id = $categoryId;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($existingCategory);
        
        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->with($categoryId, $data)
            ->andReturn(true);
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($updatedCategory);

        $result = $this->categoryService->updateCategory($categoryId, $data);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->name)->toBe('Bahan Pokok Updated');
    });

    it('successfully deletes category without relations', function () {
        $categoryId = 1;
        $existingCategory = new RawMaterialCategory(['id' => $categoryId]);
        $existingCategory->id = $categoryId;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($existingCategory);
        
        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->with($categoryId)
            ->andReturn(true);

        $result = $this->categoryService->deleteCategory($categoryId);
        
        expect($result)->toBeTrue();
    });

    it('returns all categories with caching (Cache Miss)', function () {
        // Use Eloquent Collection instead of Support Collection
        $categories = new EloquentCollection([
            new RawMaterialCategory(['id' => 1, 'name' => 'Bahan Pokok']),
            new RawMaterialCategory(['id' => 2, 'name' => 'Bumbu Dapur']),
        ]);

        Cache::shouldReceive('remember')
            ->once()
            ->with('raw_material_categories:all', 86400, Mockery::type('Closure'))
            ->andReturnUsing(function($key, $ttl, $closure) use ($categories) {
                return $closure();
            });

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->andReturn($categories);

        $result = $this->categoryService->getAllCategories();
        
        expect($result)->toBeInstanceOf(EloquentCollection::class)
            ->and($result)->toHaveCount(2);
    });

    it('returns all categories from cache (Cache Hit)', function () {
        $cachedData = [
            ['id' => 1, 'name' => 'Bahan Pokok'],
            ['id' => 2, 'name' => 'Bumbu Dapur'],
        ];

        Cache::shouldReceive('remember')
            ->once()
            ->with('raw_material_categories:all', 86400, Mockery::type('Closure'))
            ->andReturn($cachedData);

        $this->categoryRepository->shouldNotReceive('getAll');

        $result = $this->categoryService->getAllCategories();
        
        expect($result)->toBeInstanceOf(EloquentCollection::class)
            ->and($result)->toHaveCount(2)
            ->and($result[0]->name)->toBe('Bahan Pokok')
            ->and($result[1]->name)->toBe('Bumbu Dapur');
    });
});

describe('Negative Path Tests', function () {
    it('throws ModelNotFoundException when category not found', function () {
        $categoryId = 999;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn(null);

        expect(fn() => $this->categoryService->getCategoryById($categoryId))
            ->toThrow(ModelNotFoundException::class, "Raw material category with ID {$categoryId} not found.");
    });

    it('throws ModelNotFoundException when updating non-existent category', function () {
        $categoryId = 999;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn(null);

        expect(fn() => $this->categoryService->updateCategory($categoryId, ['name' => 'Test']))
            ->toThrow(ModelNotFoundException::class, "Raw material category with ID {$categoryId} not found.");
    });

    it('throws ModelNotFoundException when deleting non-existent category', function () {
        $categoryId = 999;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn(null);

        expect(fn() => $this->categoryService->deleteCategory($categoryId))
            ->toThrow(ModelNotFoundException::class, "Raw material category with ID {$categoryId} not found.");
    });

    it('logs error and rethrows when create category fails', function () {
        $data = ['name' => 'Test Category'];
        $exception = new Exception('Database connection failed');
        
        Log::shouldReceive('error')
            ->once()
            ->with('Failed to create raw material category: Database connection failed');
        
        $this->categoryRepository
            ->shouldReceive('create')
            ->with($data)
            ->andThrow($exception);

        expect(fn() => $this->categoryService->createCategory($data))
            ->toThrow(Exception::class, 'Database connection failed');
    });

    it('logs error and rethrows when update category fails', function () {
        $categoryId = 1;
        $data = ['name' => 'Updated Name'];
        $existingCategory = new RawMaterialCategory(['id' => $categoryId]);
        $existingCategory->id = $categoryId;
        $exception = new Exception('Update failed');
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($existingCategory);
        
        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->andThrow($exception);
        
        Log::shouldReceive('error')
            ->once()
            ->with("Failed to update raw material category ID {$categoryId}: Update failed");

        expect(fn() => $this->categoryService->updateCategory($categoryId, $data))
            ->toThrow(Exception::class, 'Update failed');
    });

    it('throws ConflictHttpException when deleting category with related materials', function () {
        $categoryId = 1;
        $existingCategory = new RawMaterialCategory(['id' => $categoryId]);
        $existingCategory->id = $categoryId;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($existingCategory);

        $queryException = new QueryException(
            'postgres',
            'DELETE FROM raw_material_categories WHERE id = ?',
            [$categoryId],
            new Exception('Foreign key violation')
        );
        
        // Set the SQLSTATE code to 23503 (FK violation)
        $reflection = new ReflectionClass($queryException);
        $codeProperty = $reflection->getProperty('code');
        $codeProperty->setAccessible(true);
        $codeProperty->setValue($queryException, '23503');

        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->with($categoryId)
            ->andThrow($queryException);
        
        // Use Mockery::type to match any string since the message includes SQL details
        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::on(function($message) {
                return str_contains($message, 'Database error while deleting category ID 1');
            }));

        expect(fn() => $this->categoryService->deleteCategory($categoryId))
            ->toThrow(ConflictHttpException::class, 'Cannot delete this category because it contains existing raw materials.');
    });

    it('rethrows generic QueryException when not FK violation', function () {
        $categoryId = 1;
        $existingCategory = new RawMaterialCategory(['id' => $categoryId]);
        $existingCategory->id = $categoryId;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn($existingCategory);

        $queryException = new QueryException(
            'postgres',
            'DELETE FROM raw_material_categories WHERE id = ?',
            [$categoryId],
            new Exception('Generic database error')
        );

        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->with($categoryId)
            ->andThrow($queryException);
        
        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::type('string'));

        expect(fn() => $this->categoryService->deleteCategory($categoryId))
            ->toThrow(QueryException::class);
    });
});

// ==========================================
// 2. EQUIVALENCE PARTITIONING (Unit Level)
// ==========================================

describe('Equivalence Partitioning Tests', function () {
    it('accepts empty filters array for pagination', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], 15)
            ->andReturn($paginator);
        
        $result = $this->categoryService->getPaginatedCategories();
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('accepts complex filters array', function () {
        $filters = [
            'search' => 'bahan',
            'sort_by' => 'name',
            'sort_order' => 'asc',
        ];
        
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with($filters, 20)
            ->andReturn($paginator);
        
        $result = $this->categoryService->getPaginatedCategories(20, $filters);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles empty data array for create', function () {
        $data = [];
        
        $categoryMock = new RawMaterialCategory();
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with($data)
            ->andReturn($categoryMock);

        $result = $this->categoryService->createCategory($data);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class);
    });

    it('handles null values in data array', function () {
        $data = ['name' => null, 'description' => null];
        
        $categoryMock = new RawMaterialCategory($data);
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with($data)
            ->andReturn($categoryMock);

        $result = $this->categoryService->createCategory($data);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->name)->toBeNull()
            ->and($result->description)->toBeNull();
    });
});

// ==========================================
// 3. BOUNDARY VALUE ANALYSIS (Unit Level)
// ==========================================

describe('Boundary Value Analysis Tests', function () {
    test('cache TTL is exactly 86400 seconds (24 hours)', function () {
        $reflection = new ReflectionClass(RawMaterialCategoryService::class);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)
            ->toBe(86400)
            ->toBeInt();
    });
    
    test('cache TTL is within acceptable boundary range', function () {
        $reflection = new ReflectionClass(RawMaterialCategoryService::class);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)
            ->toBeGreaterThanOrEqual(3600)
            ->toBeLessThanOrEqual(604800);
    });
    
    test('cache TTL is positive and non-zero', function () {
        $reflection = new ReflectionClass(RawMaterialCategoryService::class);
        $cacheTtl = $reflection->getConstant('CACHE_TTL');
        
        expect($cacheTtl)
            ->toBeGreaterThan(0)
            ->not->toBeNull();
    });

    it('handles perPage = 0 gracefully', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], 0)
            ->andReturn($paginator);
        
        $result = $this->categoryService->getPaginatedCategories(0);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles perPage = 1 (minimum meaningful value)', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], 1)
            ->andReturn($paginator);
        
        $result = $this->categoryService->getPaginatedCategories(1);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles perPage = PHP_INT_MAX gracefully', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);
        
        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], PHP_INT_MAX)
            ->andReturn($paginator);
        
        $result = $this->categoryService->getPaginatedCategories(PHP_INT_MAX);
        
        expect($result)->toBeInstanceOf(LengthAwarePaginator::class);
    });
});

// ==========================================
// 4. EDGE CASES & CORNER CASES (Unit Level)
// ==========================================

describe('Edge Cases & Corner Cases Tests', function () {
    it('handles category ID at boundary zero', function () {
        $categoryId = 0;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn(null);

        expect(fn() => $this->categoryService->getCategoryById($categoryId))
            ->toThrow(ModelNotFoundException::class, "Raw material category with ID {$categoryId} not found.");
    });

    it('handles negative category ID', function () {
        $categoryId = -5;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn(null);

        expect(fn() => $this->categoryService->getCategoryById($categoryId))
            ->toThrow(ModelNotFoundException::class, "Raw material category with ID {$categoryId} not found.");
    });

    it('handles PHP_INT_MAX as category ID', function () {
        $categoryId = PHP_INT_MAX;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with($categoryId)
            ->andReturn(null);

        expect(fn() => $this->categoryService->getCategoryById($categoryId))
            ->toThrow(ModelNotFoundException::class, "Raw material category with ID {$categoryId} not found.");
    });

    it('handles update with empty data array', function () {
        $categoryId = 1;
        $data = [];
        
        $existingCategory = new RawMaterialCategory([
            'id' => $categoryId,
            'name' => 'Original Name'
        ]);
        $existingCategory->id = $categoryId;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->twice()
            ->with($categoryId)
            ->andReturn($existingCategory);
        
        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->with($categoryId, [])
            ->andReturn(true);

        $result = $this->categoryService->updateCategory($categoryId, $data);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->name)->toBe('Original Name');
    });

    it('handles very large data array for create', function () {
        $largeData = array_fill(0, 100, 'test_data');
        
        $categoryMock = new RawMaterialCategory();
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with($largeData)
            ->andReturn($categoryMock);

        $result = $this->categoryService->createCategory($largeData);
        
        expect($result)->toBeInstanceOf(RawMaterialCategory::class);
    });
});

// ==========================================
// 5. DATABASE TRANSACTION TESTS (Unit Level)
// ==========================================

describe('Database Transaction Tests', function () {
    it('wraps category creation in transaction', function () {
        $transactionCalled = false;
        
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) use (&$transactionCalled) {
                $transactionCalled = true;
                return $closure();
            });
        
        $categoryMock = new RawMaterialCategory(['name' => 'Test']);
        
        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->andReturn($categoryMock);

        $this->categoryService->createCategory(['name' => 'Test']);
        
        expect($transactionCalled)->toBeTrue();
    });

    it('wraps category update in transaction', function () {
        $transactionCalled = false;
        
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function($closure) use (&$transactionCalled) {
                $transactionCalled = true;
                return $closure();
            });
        
        $categoryId = 1;
        $existingCategory = new RawMaterialCategory(['id' => $categoryId]);
        $existingCategory->id = $categoryId;
        
        $this->categoryRepository
            ->shouldReceive('findById')
            ->twice()
            ->with($categoryId)
            ->andReturn($existingCategory);
        
        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->andReturn(true);

        $this->categoryService->updateCategory($categoryId, ['name' => 'Updated']);
        
        expect($transactionCalled)->toBeTrue();
    });

    it('logs error when transaction fails during creation', function () {
        $expectedException = new Exception('Transaction failed');
        
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andThrow($expectedException);
        
        Log::shouldReceive('error')
            ->once()
            ->with('Failed to create raw material category: Transaction failed');
        
        $this->categoryService->createCategory(['name' => 'Test']);
    })->throws(Exception::class, 'Transaction failed');
});

// ==========================================
// 6. CACHE BEHAVIOR TESTS (Unit Level)
// ==========================================

describe('Cache Behavior Tests', function () {
    it('uses correct cache key', function () {
        // Use Eloquent Collection
        $categories = new EloquentCollection([
            new RawMaterialCategory(['id' => 1, 'name' => 'Test']),
        ]);

        Cache::shouldReceive('remember')
            ->once()
            ->with('raw_material_categories:all', 86400, Mockery::type('Closure'))
            ->andReturnUsing(function($key, $ttl, $closure) use ($categories) {
                return $closure();
            });

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->andReturn($categories);

        $this->categoryService->getAllCategories();
        
        expect(true)->toBeTrue();
    });

    it('rehydrates cached data into Eloquent Collection', function () {
        $cachedData = [
            ['id' => 1, 'name' => 'Bahan Pokok', 'description' => 'Test'],
        ];

        Cache::shouldReceive('remember')
            ->once()
            ->andReturn($cachedData);

        $result = $this->categoryService->getAllCategories();
        
        expect($result)->toBeInstanceOf(EloquentCollection::class)
            ->and($result[0])->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result[0]->name)->toBe('Bahan Pokok')
            ->and($result[0]->description)->toBe('Test');
    });

    it('handles empty cached data', function () {
        $cachedData = [];

        Cache::shouldReceive('remember')
            ->once()
            ->andReturn($cachedData);

        $result = $this->categoryService->getAllCategories();
        
        expect($result)->toBeInstanceOf(EloquentCollection::class)
            ->and($result)->toHaveCount(0)
            ->and($result->isEmpty())->toBeTrue();
    });
});