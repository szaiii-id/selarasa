<?php

namespace App\Http\Requests\User;

use App\Trait\User\UserRequestTrait;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    use UserRequestTrait;

    public function authorize(): bool
    {
        return in_array($this->user()->role, ['admin', 'manager'], true);
    }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:255'],
            'username'  => ['required', 'string', 'max:255', Rule::unique('users', 'username')],
            'password'  => ['required', 'string', Password::min(8)->letters()->numbers()],
            'pin_code'  => ['nullable', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'role'      => ['required', 'string', Rule::in(['admin', 'manager', 'inventory', 'cashier'])],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Add after validation hooks.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $currentUser = $this->user();
            
            if ($this->input('role') === 'admin' && $currentUser->role !== 'admin') {
                $validator->errors()->add(
                    'role', 
                    'Only administrators can create users with the admin role.'
                );
            }
        });
    }
}