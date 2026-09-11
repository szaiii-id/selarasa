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
use Exception;

class InventoryService
{
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

        $material = $this->getMaterialById($id);

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
     * Delete a raw material.
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
        return $this->movementRepository->getAll($filters, $perPage);
    }

    /**
     * Process a stock movement strictly inside a database transaction with Pessimistic Locking.
     */
    public function processStockMovement(
        int $materialId, 
        string $userId, 
        string $type, 
        float $quantity, 
        string $reason, 
        ?string $referenceId = null
    ): StockMovement {
        try {
            return DB::transaction(function () use ($materialId, $userId, $type, $quantity, $reason, $referenceId) {
                // 1. Lock the row for update to prevent concurrent race conditions
                $material = RawMaterial::where('id', $materialId)->lockForUpdate()->first();

                if (!$material) {
                    throw new ModelNotFoundException("Raw material ID {$materialId} not found.");
                }

                // 2. Normalize Quantity Sign
                $type = strtoupper($type);
                $absQuantity = abs($quantity);

                $normalizedQuantity = match ($type) {
                    'OUT'   => -$absQuantity,
                    'IN'    => $absQuantity,
                    // ADJUSTMENT takes the raw +/- value
                    default => $quantity, 
                };

                $balanceBefore = (float) $material->current_stock;
                // Round to 2 decimals to prevent floating-point drift
                $balanceAfter = round($balanceBefore + $normalizedQuantity, 2); 

                // 3. Business Guard: No Negative Stock
                if ($balanceAfter < 0) {
                    throw new InsufficientStockException("Insufficient stock. Available: {$balanceBefore}, Requested deduction: {$absQuantity}");
                }

                // 4. Insert into stock_movements (Audit Trail)
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

                // 5. Update the actual current_stock on raw_materials table via Eloquent Model
                // This ensures any model observers or casts are properly triggered
                $material->current_stock = $balanceAfter;
                $material->save();

                return $movement;
            });
        } catch (InsufficientStockException | ModelNotFoundException $e) {
            throw $e;
        } catch (Exception $e) {
            Log::error("Failed to process stock movement for Material ID {$materialId}: " . $e->getMessage());
            throw $e;
        }
    }
}