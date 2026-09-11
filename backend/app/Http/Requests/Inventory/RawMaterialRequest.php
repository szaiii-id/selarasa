<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RawMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $materialId = $this->route('material');

        return [
            'category_id'   => [
                'required', 
                'integer', 
                // Guard Soft Deletes: Pastikan kategori yang diplih benar-benar aktif/belum dihapus
                Rule::exists('raw_material_categories', 'id')->whereNull('deleted_at')
            ],
            'sku'           => [
                'required', 
                'string', 
                'max:50',
                // Guard Soft Deletes: Abaikan SKU dari material yang sudah dihapus di masa lalu
                Rule::unique('raw_materials', 'sku')
                    ->ignore($materialId)
                    ->whereNull('deleted_at'),
            ],
            'name'          => ['required', 'string', 'max:150'],
            'unit'          => ['required', 'string', 'max:20'],
            'minimum_stock' => ['required', 'numeric', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'category_id.required' => 'Please select a raw material category.',
            'category_id.exists'   => 'The selected category does not exist or has been deleted.',
            
            'sku.required' => 'The SKU (Stock Keeping Unit) is required.',
            'sku.unique'   => 'This SKU is already assigned to another active material.',
            'sku.max'      => 'The SKU must not exceed 50 characters.',
            
            'name.required' => 'The raw material name is required.',
            
            'unit.required' => 'The unit of measurement (e.g., gr, ml, pcs) is required.',
            
            'minimum_stock.required' => 'The minimum stock alert level is required.',
            'minimum_stock.numeric'  => 'The minimum stock must be a valid number.',
            'minimum_stock.min'      => 'The minimum stock cannot be less than zero.',
        ];
    }
}