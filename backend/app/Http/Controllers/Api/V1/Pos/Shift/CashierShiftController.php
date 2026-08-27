<?php

namespace App\Http\Controllers\Api\V1\Pos\Shift;

use App\Http\Controllers\Controller;
use App\Http\Requests\Shift\CloseShiftRequest;
use App\Http\Requests\Shift\HandoverShiftRequest;
use App\Http\Requests\Shift\StartShiftRequest;
use App\Http\Resources\CashierShiftResource;
use App\Services\CashierShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CashierShiftController extends Controller
{
    /**
     * Inject the CashierShiftService.
     *
     * @param CashierShiftService $cashierShiftService
     */
    public function __construct(
        protected CashierShiftService $cashierShiftService
    ) {}

    /**
     * Check and retrieve the current active shift session for the logged-in user.
     * Used for Fault-Tolerance when the POS app is refreshed.
     *
     * @return JsonResponse
     */
    public function current(): JsonResponse
    {
        $userId = Auth::id(); // Retrieves logged in user's UUID
        $shift = $this->cashierShiftService->getActiveShiftForUser($userId);

        if (!$shift) {
            return response()->json([
                'message' => 'No active shift session found.',
                'data'    => null
            ], Response::HTTP_OK);
        }

        return response()->json([
            'message' => 'Active shift session retrieved successfully.',
            'data'    => CashierShiftResource::make($shift)
        ], Response::HTTP_OK);
    }

    /**
     * Start a new POS shift session.
     *
     * @param StartShiftRequest $request
     * @return JsonResponse
     */
    public function start(StartShiftRequest $request): JsonResponse
    {
        $userId = Auth::id();
        $shift = $this->cashierShiftService->startShift($userId, $request->validated());

        return response()->json([
            'message' => 'Shift session started successfully.',
            'data'    => CashierShiftResource::make($shift)
        ], Response::HTTP_CREATED);
    }

    /**
     * End and close the current POS shift session securely.
     *
     * @param CloseShiftRequest $request
     * @param int $id (The Cashier Shift Session ID)
     * @return JsonResponse
     */
    public function close(CloseShiftRequest $request, int $id): JsonResponse
    {
        $userId = Auth::id();
        $shift = $this->cashierShiftService->closeShift($id, $userId, $request->validated());

        return response()->json([
            'message' => 'Shift session closed successfully.',
            'data'    => CashierShiftResource::make($shift)
        ], Response::HTTP_OK);
    }

    /**
     * Handover the active shift to another cashier (Emergency Switch).
     *
     * @param CloseShiftRequest $request
     * @param int $id (The Cashier Shift Session ID)
     * @return JsonResponse
     */
    public function handover(HandoverShiftRequest $request, int $id): JsonResponse
    {
        $userId = Auth::id();
        $shift = $this->cashierShiftService->handoverShift($id, $userId, $request->validated());

        return response()->json([
            'message' => 'Shift session handed over successfully.',
            'data'    => CashierShiftResource::make($shift)
        ], Response::HTTP_OK);
    }
}