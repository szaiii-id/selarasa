<?php

namespace Database\Seeders;

use App\Models\Shift;
use Illuminate\Database\Seeder;

class ShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $shifts = [
            [
                'name'       => 'Morning Shift',
                'start_time' => '08:00',
                'end_time'   => '16:00',
                'is_active'  => true,
            ],
            [
                'name'       => 'Evening Shift',
                'start_time' => '16:00',
                'end_time'   => '00:00',
                'is_active'  => true,
            ],
            [
                'name'       => 'Night Shift',
                'start_time' => '00:00',
                'end_time'   => '08:00',
                'is_active'  => true,
            ],
            [
                'name'       => 'Weekend Special',
                'start_time' => '10:00',
                'end_time'   => '18:00',
                'is_active'  => false,
            ],
        ];

        foreach ($shifts as $shiftData) {
            $shiftExists = Shift::where('name', $shiftData['name'])->exists();

            if (!$shiftExists) {
                Shift::create($shiftData);
                $this->command->info("Shift '{$shiftData['name']}' created successfully.");
            } else {
                $this->command->warn("Shift '{$shiftData['name']}' already exists, skipping creation.");
            }
        }

        $this->command->info('Shift seeding process completed.');
    }
}