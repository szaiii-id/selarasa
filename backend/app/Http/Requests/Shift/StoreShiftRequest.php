<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class StoreShiftRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * We return true here because authorization is typically handled by Middleware/Policies.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:100', 'unique:shifts,name'],
            'start_time' => ['required', 'date_format:H:i'], // Ensures format like 08:00
            'end_time'   => ['required', 'date_format:H:i', 'different:start_time'],
            'is_active'  => ['nullable', 'boolean'],
        ];
    }

    /**
     * Custom messages for specific validation errors.
     */
    public function messages(): array
    {
        return [
            'end_time.different' => 'The end time must be different from the start time.',
            'name.unique'        => 'A shift with this name already exists.',
        ];
    }
}