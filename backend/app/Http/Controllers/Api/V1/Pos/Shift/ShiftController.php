<?php

namespace App\Http\Controllers\Api\V1\Pos\Shift;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShiftResource;
use App\Services\ShiftService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ShiftController extends Controller
{
    /**
     * Inject the shared ShiftService.
     */
    public function __construct(
        protected ShiftService $shiftService
    ) {}

    /**
     * Get all active master shifts for POS dropdown.
     */
    public function active(): AnonymousResourceCollection
    {
        $shifts = $this->shiftService->getActiveShifts();

        return ShiftResource::collection($shifts);
    }
}