<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CashierShiftResource extends JsonResource
{
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
            
            'user'             => new UserResource($this->whenLoaded('user')),
            'shift'            => new ShiftResource($this->whenLoaded('shift')),
            'closed_by_user'   => new UserResource($this->whenLoaded('closedByUser')),
            
            'handovers'        => $this->whenLoaded('handovers', function () {
                return $this->handovers->map(function ($handover) {
                    return [
                        'id' => $handover->id,
                        'amount_counted' => (float) $handover->amount_counted,
                        'notes' => $handover->notes,
                        'created_at' => $handover->created_at?->toIso8601String(),
                        'from_user' => [
                            'id' => $handover->fromUser?->id,
                            'name' => $handover->fromUser?->name,
                        ],
                        'to_user' => [
                            'id' => $handover->toUser?->id,
                            'name' => $handover->toUser?->name,
                        ],
                    ];
                });
            }),
        ];
    }
}