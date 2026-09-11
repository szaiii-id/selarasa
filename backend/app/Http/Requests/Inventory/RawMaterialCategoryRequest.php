<?php

namespace App\Http\Requests\Inventory;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RawMaterialCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $categoryId = $this->route('category');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                // Guard Soft Deletes: Abaikan nama kategori yang sudah dihapus
                Rule::unique('raw_material_categories', 'name')
                    ->ignore($categoryId)
                    ->whereNull('deleted_at'),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'The category name is required.',
            'name.string'   => 'The category name must be a valid string.',
            'name.max'      => 'The category name must not exceed 100 characters.',
            'name.unique'   => 'This category name already exists. Please choose another name.',
            
            'description.max' => 'The description is too long (maximum is 500 characters).',
        ];
    }
}