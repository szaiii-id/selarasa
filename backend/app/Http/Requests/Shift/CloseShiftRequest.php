<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class CloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'expected_balance' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'closing_balance'  => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'pin_code'         => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'notes'            => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'closing_balance.required' => 'Please enter the physical cash amount in the drawer.',
            'pin_code.required'        => 'PIN code is required to authorize the shift closure.',
        ];
    }
}