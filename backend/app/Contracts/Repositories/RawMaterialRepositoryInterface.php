<?php

namespace App\Contracts\Repositories;

use App\Models\RawMaterial;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface RawMaterialRepositoryInterface
{
    /**
     * Get all raw materials with optional filtering and relations.
     *
     * @param array $filters
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(array $filters = [], ?int $perPage = null): Collection|LengthAwarePaginator;

    /**
     * Find a raw material by its ID.
     *
     * @param int $id
     * @return RawMaterial|null
     */
    public function findById(int $id): ?RawMaterial;

    /**
     * Find a raw material by its SKU.
     *
     * @param string $sku
     * @return RawMaterial|null
     */
    public function findBySku(string $sku): ?RawMaterial;

    /**
     * Create a new raw material.
     *
     * @param array $data
     * @return RawMaterial
     */
    public function create(array $data): RawMaterial;

    /**
     * Update an existing raw material.
     *
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool;

    /**
     * Delete a raw material.
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool;

    /**
     * Get raw materials that are at or below their minimum stock level.
     *
     * @return Collection
     */
    public function getLowStockMaterials(): Collection;
}