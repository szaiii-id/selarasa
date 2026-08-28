<?php

namespace App\Http\Controllers\Api\V1\BackOffice\Shift;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shift\StoreShiftRequest;
use App\Http\Requests\Shift\UpdateShiftRequest;
use App\Http\Resources\ShiftResource;
use App\Services\ShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

class ShiftController extends Controller
{
    /**
     * Inject the ShiftService.
     *
     * @param ShiftService $shiftService
     */
    public function __construct(
        protected ShiftService $shiftService
    ) {}

    /**
     * Display a listing of all master shifts.
     *
     * @return AnonymousResourceCollection
     */
    public function index(): AnonymousResourceCollection
    {
        $shifts = $this->shiftService->getAllShifts();

        return ShiftResource::collection($shifts);
    }

    /**
     * Display a listing of only active shifts (for Dropdowns).
     *
     * @return AnonymousResourceCollection
     */
    public function active(): AnonymousResourceCollection
    {
        $shifts = $this->shiftService->getActiveShifts();

        return ShiftResource::collection($shifts);
    }

    /**
     * Store a newly created master shift in storage.
     *
     * @param StoreShiftRequest $request
     * @return JsonResponse
     */
    public function store(StoreShiftRequest $request): JsonResponse
    {
        $shift = $this->shiftService->createShift($request->validated());

        return response()->json([
            'message' => 'Shift schedule created successfully.',
            'data'    => ShiftResource::make($shift)
        ], Response::HTTP_CREATED);
    }

    /**
     * Update the specified master shift in storage.
     *
     * @param UpdateShiftRequest $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(UpdateShiftRequest $request, int $id): JsonResponse
    {
        $shift = $this->shiftService->updateShift($id, $request->validated());

        return response()->json([
            'message' => 'Shift schedule updated successfully.',
            'data'    => ShiftResource::make($shift)
        ], Response::HTTP_OK);
    }

    /**
     * Remove the specified master shift from storage.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        $this->shiftService->deleteShift($id);

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}