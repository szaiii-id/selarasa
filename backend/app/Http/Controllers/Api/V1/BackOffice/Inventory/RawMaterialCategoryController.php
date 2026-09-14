<?php

namespace App\Http\Controllers\Api\V1\BackOffice\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Requests\Inventory\RawMaterialCategoryRequest;
use App\Http\Resources\RawMaterialCategoryResource;
use App\Services\RawMaterialCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response; 

class RawMaterialCategoryController extends Controller
{
    public function __construct(
        protected RawMaterialCategoryService $categoryService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        if ($request->query('all') === 'true') {
            $categories = $this->categoryService->getAllCategories();
            return RawMaterialCategoryResource::collection($categories);
        }

        // Guard DoS: Validasi eksplisit mencegah bypass nilai negatif (Silent DoS) atau string (TypeError)
        $validated = $request->validate([
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'keyword'  => ['sometimes', 'string', 'nullable'],
        ]);
        
        $perPage = $validated['per_page'] ?? 15;
        $filters = $request->only(['keyword']);
        
        $categories = $this->categoryService->getPaginatedCategories($perPage, $filters);

        return RawMaterialCategoryResource::collection($categories);
    }

    public function store(RawMaterialCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->createCategory($request->validated());

        return response()->json([
            'message' => 'Raw material category created successfully.',
            'data'    => new RawMaterialCategoryResource($category),
        ], Response::HTTP_CREATED); 
    }

    public function show(int $id): JsonResponse
    {
        // Menggunakan Service untuk menjaga konsistensi arsitektur
        $category = $this->categoryService->getCategoryById($id);
        
        return response()->json([
            'data' => new RawMaterialCategoryResource($category),
        ], Response::HTTP_OK); 
    }

    public function update(RawMaterialCategoryRequest $request, int $id): JsonResponse
    {
        $category = $this->categoryService->updateCategory($id, $request->validated());

        return response()->json([
            'message' => 'Raw material category updated successfully.',
            'data'    => new RawMaterialCategoryResource($category),
        ], Response::HTTP_OK);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->categoryService->deleteCategory($id);

        return response()->json([
            'message' => 'Raw material category deleted successfully.',
        ], Response::HTTP_OK); 
    }
}