<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CashierShiftResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'               => $this->id,
            
            'user_id'          => $this->user_id,
            'shift_id'         => $this->shift_id,
            
            'opening_balance'  => (float) $this->opening_balance,
            'closing_balance'  => $this->closing_balance !== null ? (float) $this->closing_balance : null,
            'expected_balance' => $this->expected_balance !== null ? (float) $this->expected_balance : null,
            'variance'         => $this->variance !== null ? (float) $this->variance : null,
            
            'status'           => $this->status,
            'notes'            => $this->notes,
            
            'started_at'       => $this->started_at?->toIso8601String(),
            'ended_at'         => $this->ended_at?->toIso8601String(),
            
            // ---------------------------------------------------------
            // Conditional Relationships (Loaded only if eager loaded)
            // ---------------------------------------------------------
            
            'user'  => new UserResource($this->whenLoaded('user')),
            'shift' => new ShiftResource($this->whenLoaded('shift')),
            'closed_by_user' => new UserResource($this->whenLoaded('closedByUser')),
        ];
    }
}