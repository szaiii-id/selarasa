<?php

namespace App\Contracts\Repositories;

use App\Models\RawMaterialCategory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface RawMaterialCategoryRepositoryInterface
{
    /**
     * Get all raw material categories with optional filtering.
     *
     * @param array $filters
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(array $filters = [], ?int $perPage = null): Collection|LengthAwarePaginator;

    /**
     * Find a raw material category by its ID.
     *
     * @param int $id
     * @return RawMaterialCategory|null
     */
    public function findById(int $id): ?RawMaterialCategory;

    /**
     * Create a new raw material category.
     *
     * @param array $data
     * @return RawMaterialCategory
     */
    public function create(array $data): RawMaterialCategory;

    /**
     * Update an existing raw material category.
     *
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete a raw material category.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool;
}