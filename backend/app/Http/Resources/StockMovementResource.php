<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'raw_material_id' => $this->raw_material_id,
            'user_id'         => $this->user_id,
            'movement_type'   => $this->movement_type,
            
            'quantity'        => (float) $this->quantity,
            'balance_before'  => (float) $this->balance_before,
            'balance_after'   => (float) $this->balance_after,
            
            'reason'          => $this->reason,
            'reference_id'    => $this->reference_id,
            
            'created_at'      => $this->created_at?->toIso8601String(),
            'created_at_human'=> $this->created_at?->diffForHumans(),

            'raw_material'    => new RawMaterialResource($this->whenLoaded('rawMaterial')),
            
            'user'            => $this->whenLoaded('user', function () {
                return [
                    'id'   => $this->user->id,
                    'name' => $this->user->name,
                    'role' => $this->user->role,
                ];
            }),
        ];
    }
}