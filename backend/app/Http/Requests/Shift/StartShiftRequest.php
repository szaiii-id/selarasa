<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class StartShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'shift_id'        => ['required', 'integer', 'exists:shifts,id'],
            'opening_balance' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'pin_code'        => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'shift_id.exists'         => 'The selected shift schedule is invalid or has been removed.',
            'opening_balance.min'     => 'The opening balance cannot be negative.',
            'pin_code.required'       => 'PIN code is required to start a shift.',
        ];
    }
}