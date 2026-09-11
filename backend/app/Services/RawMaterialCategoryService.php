<?php

namespace App\Services;

use App\Contracts\Repositories\RawMaterialCategoryRepositoryInterface;
use App\Models\RawMaterialCategory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Exception;

class RawMaterialCategoryService
{
    /**
     * Define the cache Time-To-Live (TTL) in seconds.
     * 86400 seconds = 24 hours (Master data rarely changes).
     */
    protected const CACHE_TTL = 86400;

    /**
     * Inject the repository via Constructor Property Promotion.
     */
    public function __construct(
        protected RawMaterialCategoryRepositoryInterface $categoryRepository
    ) {}

    /**
     * Get paginated categories (No Cache - Used in Backoffice Datatables).
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function getPaginatedCategories(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        return $this->categoryRepository->getAll($filters, $perPage);
    }

    /**
     * Get all categories with enterprise-grade caching and rehydration.
     * Useful for frontend dropdowns.
     *
     * @return Collection
     */
    public function getAllCategories(): Collection
    {
        $cacheKey = 'raw_material_categories:all';

        /** @var array<int, array<string, mixed>> $cachedData */
        $cachedData = Cache::remember($cacheKey, self::CACHE_TTL, function (): array {
            $categories = $this->categoryRepository->getAll();
            return $categories->map->toArray()->all();
        });

        // Rehydrate Eloquent Collection directly and cleanly
        return RawMaterialCategory::hydrate($cachedData);
    }

    /**
     * Retrieve a category instance securely.
     * Centralized to avoid Controllers hitting the Model directly.
     *
     * @param int $id
     * @return RawMaterialCategory
     * @throws ModelNotFoundException
     */
    public function getCategoryById(int $id): RawMaterialCategory
    {
        $category = $this->categoryRepository->findById($id);

        if (!$category) {
            throw new ModelNotFoundException("Raw material category with ID {$id} not found.");
        }

        return $category;
    }

    /**
     * Create a new raw material category.
     * Cache should be cleared by Observer.
     *
     * @param array $data
     * @return RawMaterialCategory
     * @throws Exception
     */
    public function createCategory(array $data): RawMaterialCategory
    {
        try {
            return DB::transaction(fn () => $this->categoryRepository->create($data));
        } catch (Exception $e) {
            Log::error('Failed to create raw material category: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update an existing raw material category.
     *
     * @param int $id
     * @param array $data
     * @return RawMaterialCategory
     * @throws Exception
     */
    public function updateCategory(int $id, array $data): RawMaterialCategory
    {
        $this->getCategoryById($id); // Ensure it exists before update (avoids logging 404s)

        try {
            return DB::transaction(function () use ($id, $data) {
                $this->categoryRepository->update($id, $data);
                return $this->getCategoryById($id);
            });
        } catch (Exception $e) {
            Log::error("Failed to update raw material category ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete a category. Proactively guards against FK constraints.
     *
     * @param int $id
     * @return bool
     * @throws Exception
     */
    public function deleteCategory(int $id): bool
    {
        $this->getCategoryById($id); // Ensure it exists before delete

        try {
            return $this->categoryRepository->delete($id);
        } catch (QueryException $e) {
            // Log::error is safe here since QueryException indicates a backend conflict
            Log::error("Database error while deleting category ID {$id}: " . $e->getMessage());
            
            // PostgreSQL Foreign Key Violation
            if ($e->getCode() === '23503') {
                throw new ConflictHttpException('Cannot delete this category because it contains existing raw materials.');
            }
            
            throw $e;
        } catch (Exception $e) {
            Log::error("Failed to delete category ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }
}