<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class ForceCloseShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()->role, ['admin', 'manager'], true);
    }

    public function rules(): array
    {
        return [
            'expected_balance' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'closing_balance'  => ['nullable', 'numeric', 'min:0', 'max:999999999999.99'],
            'notes'            => ['required', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'notes.required' => 'Please provide a reason for force closing this shift (e.g. device crash, cashier unreachable).',
        ];
    }
}