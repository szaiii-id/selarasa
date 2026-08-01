<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class K6LoadTestSeeder extends Seeder
{
    /**
     * Run the database seeds for k6 load testing.
     */
    public function run(): void
    {
        $this->command->info('Creating 30 Back Office test users for k6 Load Testing...');

        $hashedPassword = Hash::make('password_testing_123');

        for ($i = 1; $i <= 30; $i++) {
            User::updateOrCreate(
                ['username' => "user_test_{$i}"], 
                [
                    'name'      => "K6 Load Test User {$i}",
                    'password'  => $hashedPassword,
                    'pin_code'  => str_pad((string) $i, 6, '0', STR_PAD_LEFT), 
                    'role'      => 'admin', 
                    'is_active' => true,
                ]
            );
        }

        $this->command->info('30 k6 Back Office test users created successfully!');
    }
}