<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RawMaterialResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @param Request $request
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $currentStock = (float) $this->current_stock;
        $minimumStock = (float) $this->minimum_stock;

        return [
            'id'            => $this->id,
            'category_id'   => $this->category_id,
            'sku'           => $this->sku,
            'name'          => $this->name,
            'unit'          => $this->unit,
            'current_stock' => $currentStock,
            'minimum_stock' => $minimumStock,
            'is_active'     => $this->is_active,
            
            'is_low_stock'  => $currentStock <= $minimumStock,

            'category'      => new RawMaterialCategoryResource($this->whenLoaded('category')),
            
            'created_at'    => $this->created_at?->toIso8601String(),
            'updated_at'    => $this->updated_at?->toIso8601String(),
        ];
    }
}