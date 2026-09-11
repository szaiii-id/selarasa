<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'raw_material_id' => [
                'required', 
                'integer', 
                // Guard Soft Deletes: Tidak boleh memodifikasi stok bahan yang sudah dihapus
                Rule::exists('raw_materials', 'id')->whereNull('deleted_at')
            ],
            'movement_type'   => ['required', 'string', Rule::in(['IN', 'OUT', 'ADJUSTMENT'])],
            'quantity'        => ['required', 'numeric', 'not_in:0'], 
            'reason'          => ['required', 'string', 'max:255'],
            'reference_id'    => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'raw_material_id.required' => 'You must select a raw material to adjust.',
            'raw_material_id.exists'   => 'The selected raw material is invalid or has been deleted.',
            
            'movement_type.required' => 'The movement type is required.',
            'movement_type.in'       => 'The movement type must be specifically IN, OUT, or ADJUSTMENT.',
            
            'quantity.required' => 'The quantity amount is required.',
            'quantity.numeric'  => 'The quantity must be a valid number.',
            'quantity.not_in'   => 'The quantity cannot be exactly zero. Please specify a positive or negative amount.',
            
            'reason.required' => 'You must provide a reason for this stock movement (e.g., Supplier Delivery, Spillage, Opname).',
            'reason.max'      => 'The reason is too long (maximum 255 characters).',
        ];
    }
}