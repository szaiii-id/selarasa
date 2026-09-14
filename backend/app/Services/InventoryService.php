<?php

namespace App\Services;

use App\Contracts\Repositories\RawMaterialRepositoryInterface;
use App\Contracts\Repositories\StockMovementRepositoryInterface;
use App\Exceptions\InsufficientStockException;
use App\Models\RawMaterial;
use App\Models\StockMovement;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;
use Exception;

class InventoryService
{
    /**
     * Whitelist movement types.
     * Single source of truth — dipakai untuk validasi di service layer
     * sebagai defensive guard (di samping validasi di FormRequest).
     */
    protected const VALID_MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'];

    /**
     * Inject the repositories.
     */
    public function __construct(
        protected RawMaterialRepositoryInterface $materialRepository,
        protected StockMovementRepositoryInterface $movementRepository
    ) {}

    // ==========================================
    // RAW MATERIAL MASTER MANAGEMENT
    // ==========================================

    public function getPaginatedMaterials(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        // Defensive: ensure perPage is at least 1
        // (prevent Collection return from repository when perPage = 0)
        $perPage = max(1, $perPage);

        return $this->materialRepository->getAll($filters, $perPage);
    }

    /**
     * Get a raw material by ID securely.
     * Centralized to avoid Controllers hitting the Model directly.
     *
     * @throws ModelNotFoundException
     */
    public function getMaterialById(int $id): RawMaterial
    {
        $material = $this->materialRepository->findById($id);

        if (!$material) {
            throw new ModelNotFoundException("Raw material with ID {$id} not found.");
        }

        return $material;
    }

    public function createMaterial(array $data): RawMaterial
    {
        // current_stock must always be 0 on creation. Use Stock In for initial balance.
        $data['current_stock'] = 0;

        try {
            return DB::transaction(fn () => $this->materialRepository->create($data));
        } catch (Exception $e) {
            Log::error('Failed to create raw material: ' . $e->getMessage());
            throw $e;
        }
    }

    public function updateMaterial(int $id, array $data): RawMaterial
    {
        // Security Guard: Prevent direct modification of current_stock through Master update
        unset($data['current_stock']);

        // Ensure material exists before update (throws ModelNotFoundException if not)
        $this->getMaterialById($id);

        try {
            return DB::transaction(function () use ($id, $data) {
                $this->materialRepository->update($id, $data);
                return $this->getMaterialById($id);
            });
        } catch (Exception $e) {
            Log::error("Failed to update raw material ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Delete a raw material (Soft Delete).
     */
    public function deleteMaterial(int $id): bool
    {
        // Ensure it exists before deleting
        $this->getMaterialById($id);

        try {
            return $this->materialRepository->delete($id);
        } catch (Exception $e) {
            Log::error("Failed to delete raw material ID {$id}: " . $e->getMessage());
            throw $e;
        }
    }

    // ==========================================
    // STOCK MOVEMENT (CORE BUSINESS LOGIC)
    // ==========================================

    public function getPaginatedMovements(int $perPage = 15, array $filters = []): LengthAwarePaginator
    {
        // Defensive: ensure perPage is at least 1
        // (prevent Collection return from repository when perPage = 0)
        $perPage = max(1, $perPage);

        return $this->movementRepository->getAll($filters, $perPage);
    }

    /**
     * Process a stock movement strictly inside a database transaction with Pessimistic Locking.
     *
     * Interpretation:
     * - IN         : quantity is positive delta (abs applied)  → stock += |qty|
     * - OUT        : quantity is negative delta (abs applied) → stock -= |qty|
     * - ADJUSTMENT : quantity is SIGNED delta (as-is)         → stock += qty
     *
     * Signed delta semantics ensure:
     * - Immutable audit trail (quantity = "what happened")
     * - Idempotent-safe (replay produces same result)
     * - Race-condition safe (lockForUpdate + delta)
     *
     * @throws InvalidArgumentException
     * @throws ModelNotFoundException
     * @throws InsufficientStockException
     */
    public function processStockMovement(
        int $materialId,
        string $userId,
        string $type,
        float $quantity,
        string $reason,
        ?string $referenceId = null
    ): StockMovement {
        // ==========================================
        // 0. DEFENSIVE VALIDATION (before transaction)
        // ==========================================
        $type = strtoupper(trim($type));

        if (!in_array($type, self::VALID_MOVEMENT_TYPES, true)) {
            throw new InvalidArgumentException(
                "Invalid movement type: '{$type}'. Allowed: " . implode(', ', self::VALID_MOVEMENT_TYPES)
            );
        }

        if ($quantity === 0.0) {
            throw new InvalidArgumentException(
                "Quantity cannot be zero. A movement must change the stock level."
            );
        }

        if (trim($userId) === '') {
            throw new InvalidArgumentException(
                "User ID is required to record a stock movement."
            );
        }

        try {
            return DB::transaction(function () use ($materialId, $userId, $type, $quantity, $reason, $referenceId) {
                // ==========================================
                // 1. LOCK ROW (pessimistic locking)
                // ==========================================
                $material = RawMaterial::where('id', $materialId)
                    ->lockForUpdate()
                    ->first();

                if (!$material) {
                    throw new ModelNotFoundException("Raw material ID {$materialId} not found.");
                }

                // ==========================================
                // 2. GUARD: INACTIVE MATERIAL
                // ==========================================
                if (!$material->is_active) {
                    throw new InvalidArgumentException(
                        "Cannot process stock movement: material '{$material->name}' (SKU: {$material->sku}) is inactive. " .
                        "Reactivate the material first if you need to adjust its stock."
                    );
                }

                // ==========================================
                // 3. NORMALIZE QUANTITY SIGN (delta semantics)
                // ==========================================
                $absQuantity = abs($quantity);

                $normalizedQuantity = match ($type) {
                    'IN'         => $absQuantity,       // always positive
                    'OUT'        => -$absQuantity,      // always negative
                    'ADJUSTMENT' => $quantity,          // signed as-is (raw delta)
                };

                $balanceBefore = (float) $material->current_stock;

                // Round to 2 decimals to prevent floating-point drift
                $balanceAfter = round($balanceBefore + $normalizedQuantity, 2);

                // ==========================================
                // 4. BUSINESS GUARD: NO NEGATIVE STOCK
                // ==========================================
                if ($balanceAfter < 0) {
                    throw new InsufficientStockException(
                        "Insufficient stock for '{$material->name}'. " .
                        "Available: {$balanceBefore} {$material->unit}, " .
                        "Requested change: {$normalizedQuantity} {$material->unit}, " .
                        "Result would be: {$balanceAfter} {$material->unit}."
                    );
                }

                // ==========================================
                // 5. INSERT MOVEMENT (immutable audit trail)
                // ==========================================
                $movement = $this->movementRepository->create([
                    'raw_material_id' => $material->id,
                    'user_id'         => $userId,
                    'movement_type'   => $type,
                    'quantity'        => $normalizedQuantity,
                    'balance_before'  => $balanceBefore,
                    'balance_after'   => $balanceAfter,
                    'reason'          => $reason,
                    'reference_id'    => $referenceId,
                ]);

                // ==========================================
                // 6. UPDATE MATERIAL STOCK
                // ==========================================
                // Via Eloquent so observers, casts, and events are properly triggered
                $material->current_stock = $balanceAfter;
                $material->save();

                return $movement;
            });
        } catch (InsufficientStockException | ModelNotFoundException | InvalidArgumentException $e) {
            // Business exceptions — rethrow tanpa log error (bukan system failure)
            throw $e;
        } catch (Exception $e) {
            Log::error("Failed to process stock movement", [
                'material_id'  => $materialId,
                'user_id'      => $userId,
                'type'         => $type,
                'quantity'     => $quantity,
                'reference_id' => $referenceId,
                'error'        => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}