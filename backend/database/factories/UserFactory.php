<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id'             => Str::uuid()->toString(),
            'name'           => fake()->name(),
            'username'       => fake()->unique()->userName(),
            // static::$password will no longer throw an error now
            'password'       => static::$password ??= Hash::make('selarasa01'),
            'pin_code'       => fake()->numerify('######'), 
            'role'           => 'cashier',
            'is_active'      => true,
            'remember_token' => Str::random(10),
        ];
    }

}