<?php

namespace App\Repositories;

use App\Contracts\Repositories\StockMovementRepositoryInterface;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Class StockMovementRepository
 *
 * Repository implementation for managing stock movement audit trails.
 *
 * @package App\Repositories
 */
class StockMovementRepository implements StockMovementRepositoryInterface
{
    /**
     * StockMovementRepository constructor.
     *
     * @param StockMovement $model
     */
    public function __construct(
        protected StockMovement $model
    ) {}

    /**
     * Get all stock movements with optional filtering.
     *
     * @param array $filters Filters (raw_material_id, movement_type, user_id (UUID), date range).
     * @param int|null $perPage Number of items per page for pagination.
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(array $filters = [], ?int $perPage = null): Collection|LengthAwarePaginator
    {
        // Load relations to avoid N+1 issues
        $query = $this->model->with(['rawMaterial', 'user']);

        if (isset($filters['raw_material_id'])) {
            $query->where('raw_material_id', $filters['raw_material_id']);
        }

        if (isset($filters['movement_type'])) {
            $query->ofType($filters['movement_type']);
        }

        // Filter by user_id (UUID format string)
        if (isset($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (isset($filters['start_date']) && isset($filters['end_date'])) {
            $query->whereBetween('created_at', [$filters['start_date'], $filters['end_date']]);
        }

        $query->recent();

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Get stock movements for a specific raw material.
     *
     * @param int $rawMaterialId
     * @param int|null $perPage
     * @return Collection|LengthAwarePaginator
     */
    public function getByRawMaterialId(int $rawMaterialId, ?int $perPage = null): Collection|LengthAwarePaginator
    {
        $query = $this->model->with('user')
            ->where('raw_material_id', $rawMaterialId)
            ->recent();

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Find a stock movement by its ID.
     *
     * @param int $id
     * @return StockMovement|null
     */
    public function findById(int $id): ?StockMovement
    {
        return $this->model->with(['rawMaterial', 'user'])->find($id);
    }

    /**
     * Record a new stock movement (In, Out, Adjustment).
     *
     * @param array $data Data for creating a stock movement log.
     * @return StockMovement
     */
    public function create(array $data): StockMovement
    {
        return $this->model->create($data);
    }
}