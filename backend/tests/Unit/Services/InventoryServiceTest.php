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

    DB::shouldReceive('transaction')
        ->andReturnUsing(fn ($callback) => $callback())
        ->byDefault();
});

afterEach(function () {
    Mockery::close();
});

// ==========================================
// 1. HAPPY PATH — MATERIAL CATEGORY
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
        $expectedCategory = new RawMaterialCategory([
            'id'          => 1,
            'name'        => 'Bahan Pokok',
            'description' => 'Kategori bahan pokok',
        ]);
        $expectedCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(1)
            ->andReturn($expectedCategory);

        $result = $this->categoryService->getCategoryById(1);

        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->id)->toBe(1)
            ->and($result->name)->toBe('Bahan Pokok');
    });

    it('creates category successfully', function () {
        $data = [
            'name'        => 'Bumbu Dapur',
            'description' => 'Kategori untuk bumbu dapur',
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
        $data = ['name' => 'Bahan Pokok Updated'];

        $existingCategory = new RawMaterialCategory([
            'id'   => 1,
            'name' => 'Bahan Pokok',
        ]);
        $existingCategory->id = 1;

        $updatedCategory = new RawMaterialCategory([
            'id'   => 1,
            'name' => 'Bahan Pokok Updated',
        ]);
        $updatedCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->twice()
            ->with(1)
            ->andReturn($existingCategory, $updatedCategory);

        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->with(1, $data)
            ->andReturn(true);

        $result = $this->categoryService->updateCategory(1, $data);

        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->name)->toBe('Bahan Pokok Updated');
    });

    it('successfully deletes category without relations', function () {
        $existingCategory = new RawMaterialCategory(['id' => 1]);
        $existingCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(1)
            ->andReturn($existingCategory);

        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->with(1)
            ->andReturn(true);

        expect($this->categoryService->deleteCategory(1))->toBeTrue();
    });
});

// ==========================================
// 2. NEGATIVE PATH — MATERIAL CATEGORY
// ==========================================

describe('Negative Path Tests', function () {

    it('throws ModelNotFoundException when category not found', function () {
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(999)
            ->andReturn(null);

        expect(fn () => $this->categoryService->getCategoryById(999))
            ->toThrow(ModelNotFoundException::class, 'Raw material category with ID 999 not found.');
    });

    it('throws ModelNotFoundException when updating non-existent category', function () {
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(999)
            ->andReturn(null);

        expect(fn () => $this->categoryService->updateCategory(999, ['name' => 'Test']))
            ->toThrow(ModelNotFoundException::class, 'Raw material category with ID 999 not found.');
    });

    it('throws ModelNotFoundException when deleting non-existent category', function () {
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(999)
            ->andReturn(null);

        expect(fn () => $this->categoryService->deleteCategory(999))
            ->toThrow(ModelNotFoundException::class, 'Raw material category with ID 999 not found.');
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

        expect(fn () => $this->categoryService->createCategory($data))
            ->toThrow(Exception::class, 'Database connection failed');
    });

    it('logs error and rethrows when update category fails', function () {
        $existingCategory = new RawMaterialCategory(['id' => 1]);
        $existingCategory->id = 1;
        $exception = new Exception('Update failed');

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(1)
            ->andReturn($existingCategory);

        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->andThrow($exception);

        Log::shouldReceive('error')
            ->once()
            ->with('Failed to update raw material category ID 1: Update failed');

        expect(fn () => $this->categoryService->updateCategory(1, ['name' => 'X']))
            ->toThrow(Exception::class, 'Update failed');
    });

    it('does NOT log when update fails because category not found (404)', function () {
        Log::shouldReceive('error')->never();

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(999)
            ->andReturn(null);

        expect(fn () => $this->categoryService->updateCategory(999, ['name' => 'X']))
            ->toThrow(ModelNotFoundException::class);
    });

    it('throws ConflictHttpException when deleting category with related materials', function () {
        $existingCategory = new RawMaterialCategory(['id' => 1]);
        $existingCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(1)
            ->andReturn($existingCategory);

        $queryException = new QueryException(
            'postgres',
            'DELETE FROM raw_material_categories WHERE id = ?',
            [1],
            new Exception('Foreign key violation')
        );

        $reflection = new ReflectionClass($queryException);
        $codeProperty = $reflection->getProperty('code');
        $codeProperty->setAccessible(true);
        $codeProperty->setValue($queryException, '23503');

        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->with(1)
            ->andThrow($queryException);

        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::on(fn ($message) =>
                str_contains($message, 'Database error while deleting category ID 1')
            ));

        expect(fn () => $this->categoryService->deleteCategory(1))
            ->toThrow(ConflictHttpException::class, 'Cannot delete this category because it contains existing raw materials.');
    });

    it('rethrows generic QueryException when not FK violation', function () {
        $existingCategory = new RawMaterialCategory(['id' => 1]);
        $existingCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(1)
            ->andReturn($existingCategory);

        $queryException = new QueryException(
            'postgres',
            'DELETE FROM raw_material_categories WHERE id = ?',
            [1],
            new Exception('Generic database error')
        );

        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->with(1)
            ->andThrow($queryException);

        Log::shouldReceive('error')
            ->once()
            ->with(Mockery::on(fn ($message) =>
                str_contains($message, 'Database error while deleting category ID 1')
            ));

        expect(fn () => $this->categoryService->deleteCategory(1))
            ->toThrow(QueryException::class);
    });
});

// ==========================================
// 3. EQUIVALENCE PARTITIONING
// ==========================================

describe('Equivalence Partitioning Tests', function () {

    it('accepts empty filters array for pagination', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], 15)
            ->andReturn($paginator);

        expect($this->categoryService->getPaginatedCategories())
            ->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('accepts complex filters array', function () {
        $filters = [
            'keyword'    => 'bahan',
            'sort_by'    => 'name',
            'sort_order' => 'asc',
        ];
        $paginator = Mockery::mock(LengthAwarePaginator::class);

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with($filters, 20)
            ->andReturn($paginator);

        expect($this->categoryService->getPaginatedCategories(20, $filters))
            ->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles empty data array for create', function () {
        $categoryMock = new RawMaterialCategory();
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with([])
            ->andReturn($categoryMock);

        expect($this->categoryService->createCategory([]))
            ->toBeInstanceOf(RawMaterialCategory::class);
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
// 4. BOUNDARY VALUE ANALYSIS
// ==========================================

describe('Boundary Value Analysis Tests', function () {

    test('cache TTL is exactly 86400 seconds (24 hours)', function () {
        $reflection = new ReflectionClass(RawMaterialCategoryService::class);

        expect($reflection->getConstant('CACHE_TTL'))
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

    it('handles perPage = 1 (minimum meaningful value)', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], 1)
            ->andReturn($paginator);

        expect($this->categoryService->getPaginatedCategories(1))
            ->toBeInstanceOf(LengthAwarePaginator::class);
    });

    it('handles perPage = PHP_INT_MAX gracefully', function () {
        $paginator = Mockery::mock(LengthAwarePaginator::class);

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->with([], PHP_INT_MAX)
            ->andReturn($paginator);

        expect($this->categoryService->getPaginatedCategories(PHP_INT_MAX))
            ->toBeInstanceOf(LengthAwarePaginator::class);
    });
});

// ==========================================
// 5. EDGE CASES & CORNER CASES
// ==========================================

describe('Edge Cases & Corner Cases Tests', function () {

    it('handles category ID at boundary zero', function () {
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(0)
            ->andReturn(null);

        expect(fn () => $this->categoryService->getCategoryById(0))
            ->toThrow(ModelNotFoundException::class, 'Raw material category with ID 0 not found.');
    });

    it('handles negative category ID', function () {
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(-5)
            ->andReturn(null);

        expect(fn () => $this->categoryService->getCategoryById(-5))
            ->toThrow(ModelNotFoundException::class, 'Raw material category with ID -5 not found.');
    });

    it('handles PHP_INT_MAX as category ID', function () {
        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(PHP_INT_MAX)
            ->andReturn(null);

        expect(fn () => $this->categoryService->getCategoryById(PHP_INT_MAX))
            ->toThrow(ModelNotFoundException::class, 'Raw material category with ID ' . PHP_INT_MAX . ' not found.');
    });

    it('handles update with empty data array', function () {
        $existingCategory = new RawMaterialCategory([
            'id'   => 1,
            'name' => 'Original Name',
        ]);
        $existingCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->twice()
            ->with(1)
            ->andReturn($existingCategory);

        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->with(1, [])
            ->andReturn(true);

        $result = $this->categoryService->updateCategory(1, []);

        expect($result)->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result->name)->toBe('Original Name');
    });

    it('handles very long string in name field', function () {
        $longName = str_repeat('A', 5000);
        $data = ['name' => $longName];

        $categoryMock = new RawMaterialCategory($data);
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with($data)
            ->andReturn($categoryMock);

        $result = $this->categoryService->createCategory($data);

        expect($result->name)->toBe($longName);
    });

    it('handles unicode characters in category name', function () {
        $data = ['name' => 'Bumbu Dapur 日本語 🍳'];

        $categoryMock = new RawMaterialCategory($data);
        $categoryMock->id = 1;

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->with($data)
            ->andReturn($categoryMock);

        expect($this->categoryService->createCategory($data)->name)
            ->toBe('Bumbu Dapur 日本語 🍳');
    });
});

// ==========================================
// 6. DATABASE TRANSACTION TESTS
// ==========================================

describe('Database Transaction Tests', function () {

    it('wraps category creation in transaction', function () {
        $called = false;

        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function ($closure) use (&$called) {
                $called = true;
                return $closure();
            });

        $categoryMock = new RawMaterialCategory(['name' => 'Test']);

        $this->categoryRepository
            ->shouldReceive('create')
            ->once()
            ->andReturn($categoryMock);

        $this->categoryService->createCategory(['name' => 'Test']);

        expect($called)->toBeTrue();
    });

    it('wraps category update in transaction', function () {
        $called = false;

        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andReturnUsing(function ($closure) use (&$called) {
                $called = true;
                return $closure();
            });

        $existingCategory = new RawMaterialCategory(['id' => 1]);
        $existingCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->twice()
            ->with(1)
            ->andReturn($existingCategory);

        $this->categoryRepository
            ->shouldReceive('update')
            ->once()
            ->andReturn(true);

        $this->categoryService->updateCategory(1, ['name' => 'Updated']);

        expect($called)->toBeTrue();
    });

    it('logs error when transaction fails during creation', function () {
        DB::shouldReceive('transaction')
            ->once()
            ->with(Mockery::type('Closure'))
            ->andThrow(new Exception('Transaction failed'));

        Log::shouldReceive('error')
            ->once()
            ->with('Failed to create raw material category: Transaction failed');

        expect(fn () => $this->categoryService->createCategory(['name' => 'Test']))
            ->toThrow(Exception::class, 'Transaction failed');
    });

    it('does NOT wrap delete in transaction (sesuai service)', function () {
        $existingCategory = new RawMaterialCategory(['id' => 1]);
        $existingCategory->id = 1;

        $this->categoryRepository
            ->shouldReceive('findById')
            ->once()
            ->with(1)
            ->andReturn($existingCategory);

        $this->categoryRepository
            ->shouldReceive('delete')
            ->once()
            ->andReturn(true);

        DB::shouldReceive('transaction')->never();

        expect($this->categoryService->deleteCategory(1))->toBeTrue();
    });
});

// ==========================================
// 7. CACHE BEHAVIOR TESTS
// ==========================================

describe('Cache Behavior Tests', function () {

    it('returns all categories with cache miss (closure executed, then hydrate)', function () {
        $categories = new EloquentCollection([
            new RawMaterialCategory(['id' => 1, 'name' => 'Bahan Pokok', 'description' => 'A']),
            new RawMaterialCategory(['id' => 2, 'name' => 'Bumbu Dapur', 'description' => 'B']),
        ]);

        Cache::shouldReceive('remember')
            ->once()
            ->with('raw_material_categories:all', 86400, Mockery::type('Closure'))
            ->andReturnUsing(fn ($key, $ttl, $closure) => $closure());

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->andReturn($categories);

        $result = $this->categoryService->getAllCategories();

        expect($result)->toBeInstanceOf(EloquentCollection::class)
            ->and($result)->toHaveCount(2)
            ->and($result[0])->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result[0]->name)->toBe('Bahan Pokok')
            ->and($result[1]->name)->toBe('Bumbu Dapur');
    });

    it('returns all categories from cache hit (repository NOT called)', function () {
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
            ->and($result[0])->toBeInstanceOf(RawMaterialCategory::class)
            ->and($result[0]->name)->toBe('Bahan Pokok')
            ->and($result[1]->name)->toBe('Bumbu Dapur');
    });

    it('uses correct cache key', function () {
        $categories = new EloquentCollection([
            new RawMaterialCategory(['id' => 1, 'name' => 'Test']),
        ]);

        Cache::shouldReceive('remember')
            ->once()
            ->with('raw_material_categories:all', 86400, Mockery::type('Closure'))
            ->andReturnUsing(fn ($key, $ttl, $closure) => $closure());

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
        Cache::shouldReceive('remember')
            ->once()
            ->andReturn([]);

        $result = $this->categoryService->getAllCategories();

        expect($result)->toBeInstanceOf(EloquentCollection::class)
            ->and($result)->toHaveCount(0)
            ->and($result->isEmpty())->toBeTrue();
    });

    it('service does NOT call Cache::forget (delegated to observer)', function () {
        // Observer bertanggung jawab invalidate cache.
        // Service hanya baca/tulis cache via remember().
        Cache::shouldReceive('forget')->never();

        $categories = new EloquentCollection([
            new RawMaterialCategory(['id' => 1, 'name' => 'Test']),
        ]);

        Cache::shouldReceive('remember')
            ->once()
            ->andReturnUsing(fn ($key, $ttl, $closure) => $closure());

        $this->categoryRepository
            ->shouldReceive('getAll')
            ->once()
            ->andReturn($categories);

        $this->categoryService->getAllCategories();

        expect(true)->toBeTrue();
    });
});