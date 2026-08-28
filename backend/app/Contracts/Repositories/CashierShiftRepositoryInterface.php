<?php

namespace App\Contracts\Repositories;

use App\Models\CashierShift;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

interface CashierShiftRepositoryInterface
{
    /**
     * Find an open shift session for a specific user.
     *
     * @param string $userId (UUID)
     * @return CashierShift|null
     */
    public function findOpenShiftByUser(string $userId): ?CashierShift;

    /**
     * Find any currently open shift by its ID.
     *
     * @param int $id
     * @return CashierShift|null
     */
    public function findOpenShiftById(int $id): ?CashierShift;

    /**
     * Get paginated shift history with optional filters.
     *
     * @param int $perPage
     * @param array $filters
     * @return LengthAwarePaginator
     */
    public function paginateHistory(int $perPage = 15, array $filters = []): LengthAwarePaginator;

    /**
     * Start/Open a new shift session.
     *
     * @param array $data
     * @return CashierShift
     */
    public function create(array $data): CashierShift;

    /**
     * Close or update an existing shift session.
     *
     * @param CashierShift $cashierShift
     * @param array $data
     * @return bool
     */
    public function update(CashierShift $cashierShift, array $data): bool;

    /**
     * Create a new handover record for a shift session.
     *
     * @param array $data
     * @return void
     */
    public function createHandoverRecord(array $data): void;

    /**
     * Find an open shift by its ID and lock it for update.
     *
     * @param int $id
     * @return CashierShift|null
     */
    public function findOpenShiftByIdWithLock(int $id): ?CashierShift;
}