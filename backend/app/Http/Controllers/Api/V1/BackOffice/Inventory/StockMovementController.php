<?php

namespace App\Http\Controllers\Api\V1\BackOffice\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\StockMovementRequest;
use App\Http\Resources\StockMovementResource;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class StockMovementController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        
        $perPage = $validated['per_page'] ?? 15;
        $filters = $request->only(['raw_material_id', 'movement_type', 'user_id', 'start_date', 'end_date']);
        
        $movements = $this->inventoryService->getPaginatedMovements($perPage, $filters);

        return StockMovementResource::collection($movements);
    }

    public function store(StockMovementRequest $request): JsonResponse
    {
        $validated = $request->validated();
        
        $userId = $request->user()->id;

        $movement = $this->inventoryService->processStockMovement(
            materialId: $validated['raw_material_id'],
            userId: $userId,
            type: $validated['movement_type'],
            quantity: (float) $validated['quantity'],
            reason: $validated['reason'],
            referenceId: $validated['reference_id'] ?? null
        );

        $movement->load(['rawMaterial.category', 'user']);

        return response()->json([
            'message' => 'Stock movement recorded successfully.',
            'data'    => new StockMovementResource($movement),
        ], Response::HTTP_CREATED);
    }
}