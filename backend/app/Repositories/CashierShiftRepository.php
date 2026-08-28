<?php

namespace App\Repositories;

use App\Contracts\Repositories\CashierShiftRepositoryInterface;
use App\Models\CashierShift;
use App\Models\CashierShiftHandover;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class CashierShiftRepository implements CashierShiftRepositoryInterface
{
    /**
     * Find an open shift session for a specific user.
     *
     * @param string $userId
     * @return CashierShift|null
     */
    public function findOpenShiftByUser(string $userId): ?CashierShift
    {
        return CashierShift::forUser($userId)
            ->open()
            ->latest('started_at')
            ->first();
    }

    /**
     * Find any currently open shift by its ID.
     *
     * @param int $id
     * @return CashierShift|null
     */
    public function findOpenShiftById(int $id): ?CashierShift
    {
        return CashierShift::open()->find($id);
    }

    /**
     * Get paginated shift history with optional filters.
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function paginateHistory(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        $query = CashierShift::with(['user', 'shift', 'closedByUser']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['date'])) {
            $query->whereDate('started_at', $filters['date']);
        } elseif (empty($filters['date_from']) && empty($filters['date_to'])) {
            $query->where('started_at', '>=', now()->subDays(7));
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('started_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('started_at', '<=', $filters['date_to']);
        }

        return $query->latest('started_at')->paginate($perPage);
    }

    /**
     * Start/Open a new shift session.
     *
     * @param array $data
     * @return CashierShift
     */
    public function create(array $data): CashierShift
    {
        return CashierShift::create($data);
    }

    /**
     * Close or update an existing shift session.
     *
     * @param CashierShift $cashierShift
     * @param array $data
     * @return bool
     */
    public function update(CashierShift $cashierShift, array $data): bool
    {
        return $cashierShift->update($data);
    }

    /**
     * Create a new handover record for a shift session.
     *
     * @param array $data
     * @return void
     */
    public function createHandoverRecord(array $data): void
    {
        CashierShiftHandover::create($data);
    }

    /**
     * Find an open shift by its ID and lock it for update.
     *
     * @param int $id
     * @return CashierShift|null
     */
    public function findOpenShiftByIdWithLock(int $id): ?CashierShift
    {
        return CashierShift::where('id', $id)->lockForUpdate()->first();
    }
}