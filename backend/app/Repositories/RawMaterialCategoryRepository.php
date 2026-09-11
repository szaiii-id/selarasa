<?php

namespace App\Repositories;

use App\Contracts\Repositories\RawMaterialCategoryRepositoryInterface;
use App\Models\RawMaterialCategory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Class RawMaterialCategoryRepository
 *
 * Repository implementation for managing raw material categories data.
 *
 * @package App\Repositories
 */
class RawMaterialCategoryRepository implements RawMaterialCategoryRepositoryInterface
{
    /**
     * RawMaterialCategoryRepository constructor.
     *
     * @param RawMaterialCategory $model
     */
    public function __construct(
        protected RawMaterialCategory $model
    ) {}

    /**
     * Get all raw material categories with optional filtering.
     *
     * @param array $filters Array of filters (e.g., 'keyword').
     * @param int|null $perPage Number of items per page for pagination.
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(array $filters = [], ?int $perPage = null): Collection|LengthAwarePaginator
    {
        $query = $this->model->newQuery();

        // Filter by keyword/name if provided
        if (isset($filters['keyword']) && $filters['keyword'] !== '') {
            $query->search($filters['keyword']);
        }

        $query->latest();

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Find a raw material category by its ID.
     *
     * @param int $id
     * @return RawMaterialCategory|null
     */
    public function findById(int $id): ?RawMaterialCategory
    {
        return $this->model->find($id);
    }

    /**
     * Create a new raw material category.
     *
     * @param array $data Data to create the category.
     * @return RawMaterialCategory
     */
    public function create(array $data): RawMaterialCategory
    {
        return $this->model->create($data);
    }

    /**
     * Update an existing raw material category.
     *
     * @param int $id The ID of the category to update.
     * @param array $data Data to update.
     * @return bool True if update is successful, false otherwise.
     */
    public function update(int $id, array $data): bool
    {
        $category = $this->findById($id);
        
        if (!$category) {
            return false;
        }

        return $category->update($data);
    }

    /**
     * Delete a raw material category (Soft Delete).
     *
     * @param int $id The ID of the category to delete.
     * @return bool True if deletion is successful, false otherwise.
     */
    public function delete(int $id): bool
    {
        $category = $this->findById($id);
        
        if (!$category) {
            return false;
        }

        return $category->delete();
    }
}