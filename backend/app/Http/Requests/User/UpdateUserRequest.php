<?php

namespace App\Http\Requests\User;

use App\Trait\User\UserRequestTrait;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use UserRequestTrait;

    public function authorize(): bool
    {
        return in_array($this->user()->role, ['admin', 'manager'], true);
    }

    public function rules(): array
    {
        $userId = $this->route('user');

        return [
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'username'  => [
                'sometimes', 
                'required', 
                'string', 
                'max:255', 
                Rule::unique('users', 'username')->ignore($userId)
            ],
            'password'  => ['nullable', 'string', Password::min(8)->letters()->numbers()],
            'pin_code'  => ['nullable', 'string', 'size:6', 'regex:/^[0-9]+$/'],
            'role'      => ['sometimes', 'required', 'string', Rule::in(['admin', 'manager', 'inventory', 'cashier'])],
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
            
            // Prevent privilege escalation via update
            if ($this->has('role') && $this->input('role') === 'admin' && $currentUser->role !== 'admin') {
                $validator->errors()->add(
                    'role', 
                    'Only administrators can assign the admin role.'
                );
            }
        });
    }
}