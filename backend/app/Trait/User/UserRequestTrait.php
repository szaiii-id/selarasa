<?php

namespace App\Trait\User;

trait UserRequestTrait
{
    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name'      => 'Full Name',
            'username'  => 'Username',
            'password'  => 'Password',
            'pin_code'  => 'PIN Code',
            'role'      => 'User Role',
            'is_active' => 'Active Status',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required'     => 'The full name field is required.',
            'name.max'          => 'The full name must not exceed 255 characters.',
            
            'username.required' => 'The username field is required.',
            'username.unique'   => 'This username is already taken. Please choose another.',
            
            'password.required' => 'The password field is required for new users.',
            
            'pin_code.size'     => 'The PIN code must be exactly 6 digits.',
            'pin_code.regex'    => 'The PIN code must contain only numbers.',

            'role.required'     => 'The user role field is required.',
            'role.in'           => 'The selected user role is invalid.',

            'is_active.boolean' => 'The active status must be true or false.',
        ];
    }
}
