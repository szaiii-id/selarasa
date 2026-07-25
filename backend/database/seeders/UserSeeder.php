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
        $adminExists = User::where('role', 'admin')->exists();

        if (!$adminExists) {
            User::create([
                'name' => 'Super Admin SelaRasa',
                'username' => 'admin',
                'password' => Hash::make('selarasa01'), 
                'pin_code' => '123456',
                'role' => 'admin',
                'is_active' => true,
            ]);
            
            $this->command->info('created admin account successfully');
        } else {
            $this->command->warn('admin account already exists, skipping creation');
        }

                
        $this->command->info('employees account created successfully');
    }
}
