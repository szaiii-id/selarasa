<?php

namespace App\Repositories;

use App\Contracts\Repositories\RawMaterialRepositoryInterface;
use App\Models\RawMaterial;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Class RawMaterialRepository
 *
 * Repository implementation for managing raw materials data.
 *
 * @package App\Repositories
 */
class RawMaterialRepository implements RawMaterialRepositoryInterface
{
    /**
     * RawMaterialRepository constructor.
     *
     * @param RawMaterial $model
     */
    public function __construct(
        protected RawMaterial $model
    ) {}

    /**
     * Get all raw materials with optional filtering and relations.
     *
     * @param array $filters Filters (search, category_id, is_active, is_low_stock).
     * @param int|null $perPage Number of items per page for pagination.
     * @return Collection|LengthAwarePaginator
     */
    public function getAll(array $filters = [], ?int $perPage = null): Collection|LengthAwarePaginator
    {
        // Always load category relation to prevent N+1 query problem
        $query = $this->model->with('category');

        // Search filter — matches name or SKU
        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'ilike', "%{$filters['search']}%")
                  ->orWhere('sku', 'ilike', "%{$filters['search']}%");
            });
        }

        // Category filter
        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        // Active filter — handles boolean as string ("true" / "false") or boolean
        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // Low stock filter — current_stock <= minimum_stock
        if (!empty($filters['is_low_stock'])) {
            $query->whereColumn('current_stock', '<=', 'minimum_stock');
        }

        // Out of stock (stok = 0)
        if (!empty($filters['is_out_of_stock'])) {
            $query->where('current_stock', '=', 0);
        }

        $query->latest();

        if ($perPage) {
            return $query->paginate($perPage);
        }

        return $query->get();
    }

    /**
     * Find a raw material by its ID.
     *
     * @param int $id
     * @return RawMaterial|null
     */
    public function findById(int $id): ?RawMaterial
    {
        return $this->model->with('category')->find($id);
    }

    /**
     * Find a raw material by its SKU.
     *
     * @param string $sku
     * @return RawMaterial|null
     */
    public function findBySku(string $sku): ?RawMaterial
    {
        return $this->model->with('category')->where('sku', $sku)->first();
    }

    /**
     * Create a new raw material.
     *
     * @param array $data
     * @return RawMaterial
     */
    public function create(array $data): RawMaterial
    {
        return $this->model->create($data);
    }

    /**
     * Update an existing raw material.
     *
     * @param int $id
     * @param array $data
     * @return bool
     */
    public function update(int $id, array $data): bool
    {
        $material = $this->findById($id);

        if (!$material) {
            return false;
        }

        return $material->update($data);
    }

    /**
     * Delete a raw material (Soft Delete).
     *
     * @param int $id
     * @return bool
     */
    public function delete(int $id): bool
    {
        $material = $this->findById($id);

        if (!$material) {
            return false;
        }

        return $material->delete();
    }

    /**
     * Get raw materials that are at or below their minimum stock level.
     *
     * @return Collection
     */
    public function getLowStockMaterials(): Collection
    {
        return $this->model->with('category')
            ->active()
            ->lowStock()
            ->latest()
            ->get();
    }
}