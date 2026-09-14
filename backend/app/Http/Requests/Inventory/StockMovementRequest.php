<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class StockMovementRequest extends FormRequest
{
    /**
     * Whitelist movement types — single source of truth.
     */
    protected const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalize input BEFORE validation runs.
     * - Trim whitespace on string fields.
     * - Uppercase movement_type so 'in' / 'In' / 'IN' all valid.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'movement_type' => $this->input('movement_type')
                ? strtoupper(trim($this->input('movement_type')))
                : $this->input('movement_type'),

            'reason' => $this->input('reason') !== null
                ? trim($this->input('reason'))
                : $this->input('reason'),

            'reference_id' => $this->input('reference_id') !== null
                ? trim($this->input('reference_id'))
                : $this->input('reference_id'),
        ]);
    }

    public function rules(): array
    {
        $type = $this->input('movement_type');
        $isAdjustment = $type === 'ADJUSTMENT';

        return [
            'raw_material_id' => [
                'required',
                'integer',
                // Guard Soft Deletes: tidak boleh memodifikasi bahan yang sudah dihapus
                // Guard Active: hanya bahan aktif yang boleh dimutasi (sesuai PRD)
                Rule::exists('raw_materials', 'id')
                    ->whereNull('deleted_at')
                    ->where('is_active', true),
            ],

            'movement_type' => [
                'required',
                Rule::in(self::MOVEMENT_TYPES),
            ],

            'quantity' => [
                'required',
                'numeric',
                // ADJUSTMENT: signed delta → boleh negatif, asal tidak nol
                // IN / OUT   : delta positif di input, service akan normalize ke negatif untuk OUT
                $isAdjustment
                    ? 'not_in:0'
                    : 'gt:0',
            ],

            'reason' => [
                'required',
                'string',
                'min:3',
                'max:255',
                // Tolak whitespace-only (mis. "   ") yang lolos dari `required`
                'not_regex:/^\s*$/',
            ],

            'reference_id' => [
                'nullable',
                'string',
                'max:100',
            ],
        ];
    }

    /**
     * Custom messages untuk validator.
     */
    public function messages(): array
    {
        return [
            // raw_material_id
            'raw_material_id.required' => 'You must select a raw material to adjust.',
            'raw_material_id.integer'  => 'The raw material ID must be a valid number.',
            'raw_material_id.exists'   => 'The selected raw material is invalid, inactive, or has been deleted.',

            // movement_type
            'movement_type.required' => 'The movement type is required.',
            'movement_type.in'       => 'The movement type must be IN, OUT, or ADJUSTMENT.',

            // quantity
            'quantity.required' => 'The quantity amount is required.',
            'quantity.numeric'  => 'The quantity must be a valid number.',
            'quantity.not_in'   => 'The adjustment quantity cannot be zero. Specify a positive or negative delta.',
            'quantity.gt'       => 'The quantity must be greater than zero.',

            // reason
            'reason.required'   => 'You must provide a reason for this stock movement (e.g., Supplier Delivery, Spillage, Opname).',
            'reason.string'     => 'The reason must be a valid text.',
            'reason.min'        => 'The reason must be at least 3 characters long.',
            'reason.max'        => 'The reason is too long (maximum 255 characters).',
            'reason.not_regex'  => 'The reason cannot be empty or whitespace only.',

            // reference_id
            'reference_id.string' => 'The reference ID must be a valid text.',
            'reference_id.max'    => 'The reference ID is too long (maximum 100 characters).',
        ];
    }

    /**
     * Override default failed validation behavior to return consistent JSON.
     * (Opsional — hapus kalau sudah ada global exception handler.)
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'message' => 'The given data was invalid.',
                'errors'  => $validator->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY)
        );
    }
}