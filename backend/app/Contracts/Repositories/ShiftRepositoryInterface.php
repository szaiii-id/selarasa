<?php

namespace App\Contracts\Repositories;

use App\Models\Shift;
use Illuminate\Database\Eloquent\Collection;

interface ShiftRepositoryInterface
{
    /**
     * Get all master shifts.
     *
     * @return Collection
     */
    public function getAll(): Collection;

    /**
     * Get all active shifts (for POS auto-suggestion).
     *
     * @return Collection
     */
    public function getActiveShifts(): Collection;

    /**
     * Find a shift by its ID.
     *
     * @param int $id
     * @return Shift|null
     */
    public function findById(int $id): ?Shift;

    /**
     * Create a new master shift.
     *
     * @param array $data
     * @return Shift
     */
    public function create(array $data): Shift;

    /**
     * Update an existing shift.
     *
     * @param Shift $shift
     * @param array $data
     * @return bool
     */
    public function update(Shift $shift, array $data): bool;

    /**
     * Delete a shift.
     *
     * @param Shift $shift
     * @return bool
     */
    public function delete(Shift $shift): bool;
}