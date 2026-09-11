<?php

namespace App\Contracts\Repositories;

use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

interface StockMovementRepositoryInterface
{
    /**
     * Get all stock movements with optional filtering (date, type, etc.).
     *
     * @param array $filters
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(array $filters = [], ?int $perPage = null): Collection|LengthAwarePaginator;

    /**
     * Get stock movements for a specific raw material.
     *
     * @param int $rawMaterialId
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getByRawMaterialId(int $rawMaterialId, ?int $perPage = null): Collection|LengthAwarePaginator;

    /**
     * Find a stock movement by its ID.
     *
     * @param int $id
     * @return StockMovement|null
     */
    public function findById(int $id): ?StockMovement;

    /**
     * Record a new stock movement (In, Out, Adjustment).
     * Note: Update or Delete is intentionally omitted to maintain audit trail integrity.
     *
     * @param array $data
     * @return StockMovement
     */
    public function create(array $data): StockMovement;
}