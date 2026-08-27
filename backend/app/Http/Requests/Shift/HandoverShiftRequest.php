<?php

namespace App\Http\Requests\Shift;

use Illuminate\Foundation\Http\FormRequest;

class HandoverShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to_user_id'      => ['required', 'uuid', 'exists:users,id', 'different:pin_code'],
            'to_user_pin'     => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'pin_code'        => ['required', 'string', 'size:6', 'regex:/^[0-9]+$/'], 
            'amount_counted'  => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'to_user_id.required'  => 'Please select the cashier who will receive this shift.',
            'to_user_pin.required' => 'The receiving cashier must enter their PIN to confirm.',
        ];
    }
}