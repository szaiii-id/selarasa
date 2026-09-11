<?php

namespace App\Http\Controllers\Api\V1\BackOffice\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\RawMaterialRequest;
use App\Http\Resources\RawMaterialResource;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class RawMaterialController extends Controller
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        // Guard DoS: Batasi maksimal paginasi hingga 100 item per request
        $perPage = min((int) $request->query('per_page', 15), 100);
        $filters = $request->only(['keyword', 'category_id', 'is_active']);
        
        $materials = $this->inventoryService->getPaginatedMaterials($perPage, $filters);

        return RawMaterialResource::collection($materials);
    }

    public function store(RawMaterialRequest $request): JsonResponse
    {
        $material = $this->inventoryService->createMaterial($request->validated());
        $material->load('category');

        return response()->json([
            'message' => 'Raw material registered successfully. Current stock is 0.',
            'data'    => new RawMaterialResource($material),
        ], Response::HTTP_CREATED);
    }

    public function show(int $id): JsonResponse
    {
        // Menggunakan Service untuk menjaga konsistensi arsitektur
        $material = $this->inventoryService->getMaterialById($id);
        $material->load('category');
        
        return response()->json([
            'data' => new RawMaterialResource($material),
        ], Response::HTTP_OK);
    }

    public function update(RawMaterialRequest $request, int $id): JsonResponse
    {
        $material = $this->inventoryService->updateMaterial($id, $request->validated());
        $material->load('category');

        return response()->json([
            'message' => 'Raw material profile updated successfully.',
            'data'    => new RawMaterialResource($material),
        ], Response::HTTP_OK);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->inventoryService->deleteMaterial($id);

        return response()->json([
            'message' => 'Raw material deleted successfully.',
        ], Response::HTTP_OK);
    }
}