<?php

namespace App\Http\Controllers\Api\V1\BackOffice\Shift;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shift\ForceCloseShiftRequest;
use App\Http\Resources\CashierShiftResource;
use App\Services\CashierShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CashierShiftController extends Controller
{
    public function __construct(
        protected CashierShiftService $cashierShiftService
    ) {}

    /**
     * Display paginated shift history for auditing (Back Office view).
     */
    public function index(): AnonymousResourceCollection
    {
        $shifts = $this->cashierShiftService->getPaginatedHistory(
            (int) request()->query('per_page', 15),
            request()->except(['page', 'per_page'])
        );

        return CashierShiftResource::collection($shifts);
    }

    public function forceClose(ForceCloseShiftRequest $request, int $id): JsonResponse
    {
        $shift = $this->cashierShiftService->forceClose($id, Auth::id(), $request->validated());

        return response()->json([
            'message' => 'Shift has been forcefully closed by manager.',
            'data'    => CashierShiftResource::make($shift)
        ], Response::HTTP_OK);
    }
}