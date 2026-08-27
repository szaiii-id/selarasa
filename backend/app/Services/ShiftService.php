<?php

namespace App\Services;

use App\Contracts\Repositories\ShiftRepositoryInterface;
use App\Models\Shift;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Exception;

class ShiftService
{
    /**
     * Define the cache Time-To-Live (TTL) in seconds.
     * 86400 seconds = 24 hours (Master data rarely changes).
     */
    protected const CACHE_TTL = 86400;

    /**
     * Inject the ShiftRepositoryInterface.
     *
     * @param ShiftRepositoryInterface $shiftRepository
     */
    public function __construct(
        protected ShiftRepositoryInterface $shiftRepository
    ) {}

/**
     * Get all master shifts with enterprise-grade caching and rehydration.
     *
     * @return Collection
     */
    public function getAllShifts(): Collection
    {
        $cacheKey = 'shifts:all';

        /** @var array<int, array<string, mixed>> $cachedShiftsData */
        $cachedShiftsData = Cache::remember($cacheKey, self::CACHE_TTL, function (): array {
            $shifts = $this->shiftRepository->getAll();
            return $shifts->map->toArray()->all();
        });

        // Gunakan constructor Eloquent Collection secara langsung
        $rehydratedShifts = array_map(function (array $shiftData): Shift {
            $shift = new Shift();
            $shift->setRawAttributes($shiftData, true);
            $shift->exists = true;
            $shift->wasRecentlyCreated = false;
            return $shift;
        }, $cachedShiftsData);

        return new Collection($rehydratedShifts);
    }

    /**
     * Get all active shifts (useful for dropdowns) with safe caching.
     *
     * @return Collection
     */
    public function getActiveShifts(): Collection
    {
        $cacheKey = 'shifts:active';

        /** @var array<int, array<string, mixed>> $cachedShiftsData */
        $cachedShiftsData = Cache::remember($cacheKey, self::CACHE_TTL, function (): array {
            $shifts = $this->shiftRepository->getActiveShifts();
            return $shifts->map->toArray()->all();
        });

        $rehydratedShifts = array_map(function (array $shiftData): Shift {
            $shift = new Shift();
            $shift->setRawAttributes($shiftData, true);
            $shift->exists = true;
            $shift->wasRecentlyCreated = false;
            return $shift;
        }, $cachedShiftsData);

        return new Collection($rehydratedShifts);
    }
    
    /**
     * Retrieve a fresh shift instance directly from the database.
     * CRITICAL: Used specifically for mutations to prevent race conditions.
     *
     * @param int $id
     * @return Shift
     * @throws ModelNotFoundException
     */
    protected function getFreshShift(int $id): Shift
    {
        $shift = $this->shiftRepository->findById($id);

        if (!$shift) {
            throw new ModelNotFoundException("Shift schedule with ID {$id} not found.");
        }

        return $shift;
    }

    /**
     * Create a new master shift schedule.
     * Cache is automatically cleared by ShiftObserver.
     *
     * @param array $data
     * @return Shift
     * @throws Exception
     */
    public function createShift(array $data): Shift
    {
        try {
            return DB::transaction(fn () => $this->shiftRepository->create($data));
        } catch (Exception $e) {
            Log::error('Failed to create shift schedule: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Update an existing shift schedule.
     * Cache is automatically cleared by ShiftObserver.
     *
     * @param int $id
     * @param array $data
     * @return Shift
     * @throws Exception
     */
    public function updateShift(int $id, array $data): Shift
    {
        $shift = $this->getFreshShift($id);

        try {
            return DB::transaction(function () use ($shift, $data) {
                $this->shiftRepository->update($shift, $data);
                return $this->getFreshShift($shift->id);
            });
        } catch (Exception $e) {
            Log::error("Failed to update shift schedule ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete a master shift schedule.
     * Cache is automatically cleared by ShiftObserver.
     *
     * @param int $id
     * @return bool
     * @throws Exception
     */
    public function deleteShift(int $id): bool
    {
        $shift = $this->getFreshShift($id);

        try {
            return $this->shiftRepository->delete($shift);
        } catch (QueryException $e) {
            Log::error("Database error while deleting shift ID {$id}: " . $e->getMessage());
            
            if ($e->getCode() === '23503') {
                throw new ConflictHttpException('Cannot delete this shift schedule because it is associated with existing cashier session records. Consider deactivating it instead.');
            }
            
            throw $e;
        } catch (Exception $e) {
            Log::error("Failed to delete shift schedule ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }
}