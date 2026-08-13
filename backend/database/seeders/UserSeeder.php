<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Daftar akun yang akan disemai (1 akun per role)
        $users = [
            [
                'name'     => 'Super Admin SelaRasa',
                'username' => 'admin',
                'role'     => 'admin',
            ],
            [
                'name'     => 'Manager SelaRasa',
                'username' => 'manager',
                'role'     => 'manager',
            ],
            [
                'name'     => 'Staf Inventory',
                'username' => 'inventory',
                'role'     => 'inventory',
            ],
            [
                'name'     => 'Cashier SelaRasa',
                'username' => 'cashier',
                'role'     => 'cashier',
            ]
        ];

        foreach ($users as $userData) {
            $roleExists = User::where('role', $userData['role'])->exists();

            if (!$roleExists) {
                User::create([
                    'name'      => $userData['name'],
                    'username'  => $userData['username'],
                    'password'  => Hash::make('selarasa01'), 
                    'pin_code'  => '123456',
                    'role'      => $userData['role'],
                    'is_active' => true,
                ]);
                
                $this->command->info("Account with role '{$userData['role']}' created successfully.");
            } else {
                $this->command->warn("Account with role '{$userData['role']}' already exists, skipping creation.");
            }
        }

        $this->command->info('User seeding process completed.');
    }
}