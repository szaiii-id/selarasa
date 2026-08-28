<?php

namespace App\Repositories;

use App\Contracts\Repositories\ShiftRepositoryInterface;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Collection;

class ShiftRepository implements ShiftRepositoryInterface
{
    /**
     * Get all master shifts.
     *
     * @return Collection
     */
    public function getAll(): Collection
    {
        return Shift::orderBy('start_time')->get();
    }

    /**
     * Get all active shifts (for POS auto-suggestion).
     *
     * @return Collection
     */
    public function getActiveShifts(): Collection
    {
        return Shift::active()->orderBy('start_time')->get();
    }

    /**
     * Find a shift by its ID.
     *
     * @param int $id
     * @return Shift|null
     */
    public function findById(int $id): ?Shift
    {
        return Shift::find($id);
    }

    /**
     * Create a new master shift.
     *
     * @param array $data
     * @return Shift
     */
    public function create(array $data): Shift
    {
        return Shift::create($data);
    }

    /**
     * Update an existing shift.
     *
     * @param Shift $shift
     * @param array $data
     * @return bool
     */
    public function update(Shift $shift, array $data): bool
    {
        return $shift->update($data);
    }

    /**
     * Delete a shift.
     *
     * @param Shift $shift
     * @return bool
     */
    public function delete(Shift $shift): bool
    {
        return $shift->delete();
    }
}