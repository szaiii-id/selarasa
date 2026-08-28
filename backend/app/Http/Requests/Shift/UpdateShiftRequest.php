<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Mendapatkan ID dari parameter route (misal: api/shifts/{shift})
        $shiftId = $this->route('shift');

        return [
            'name'       => ['required', 'string', 'max:100', Rule::unique('shifts')->ignore($shiftId)],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time'   => ['required', 'date_format:H:i', 'different:start_time'],
            'is_active'  => ['nullable', 'boolean'],
        ];
    }
}