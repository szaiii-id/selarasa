<?php

namespace Database\Seeders;

use App\Models\CashierShift;
use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class K6LoadTestSeeder extends Seeder
{
    /**
     * Run the database seeds for k6 load testing.
     */
    public function run(): void
    {
        $this->command->info('🚀 Starting K6 Load Test Data Preparation...');

        // Matikan Query Log agar RAM tidak habis saat bulk insert puluhan ribu data
        DB::disableQueryLog();

        $hashedPassword = Hash::make('password_testing_123');
        $hashedPin = Hash::make('123456');

        // ==========================================
        // 1. BUAT MASTER SHIFT DATA
        // ==========================================
        $this->command->info('⏳ Creating Master Shifts...');
        $shifts = [
            ['id' => 1, 'name' => 'Morning Shift', 'start_time' => '08:00:00', 'end_time' => '16:00:00', 'is_active' => true],
            ['id' => 2, 'name' => 'Evening Shift', 'start_time' => '16:00:00', 'end_time' => '23:59:00', 'is_active' => true],
            ['id' => 3, 'name' => 'Night Shift', 'start_time' => '00:00:00', 'end_time' => '07:59:00', 'is_active' => true],
        ];

        foreach ($shifts as $shift) {
            Shift::updateOrCreate(['id' => $shift['id']], $shift);
        }

        // ==========================================
        // 2. BUAT AKUN MANAGERS (UUID Range: 1 - 20)
        // ==========================================
        $this->command->info('⏳ Creating 20 Manager Accounts...');
        $managerIds = [];
        for ($i = 1; $i <= 20; $i++) {
            $uuid = sprintf('00000000-0000-4000-8000-%012d', $i);
            
            $user = User::updateOrCreate(
                ['username' => "manager_test_{$i}"],
                [
                    'id'        => $uuid,
                    'name'      => "K6 Manager {$i}",
                    'password'  => $hashedPassword,
                    'pin_code'  => $hashedPin,
                    'role'      => 'manager',
                    'is_active' => true,
                ]
            );
            $managerIds[] = $user->id;
        }

        // ==========================================
        // 3. BUAT AKUN CASHIERS (UUID Range: 1001 - 1200)
        // ==========================================
        $this->command->info('⏳ Creating 200 Cashier Accounts...');
        $cashierIds = [];
        for ($i = 1; $i <= 200; $i++) {
            // Offset 1000 agar tidak bentrok dengan ID manajer
            $uuid = sprintf('00000000-0000-4000-8000-%012d', 1000 + $i);
            
            $user = User::updateOrCreate(
                ['username' => "cashier_test_{$i}"],
                [
                    'id'        => $uuid,
                    'name'      => "K6 Cashier {$i}",
                    'password'  => $hashedPassword,
                    'pin_code'  => $hashedPin,
                    'role'      => 'cashier',
                    'is_active' => true,
                ]
            );
            $cashierIds[] = $user->id;
        }

        // Buat 1 Akun Khusus untuk Race Condition Test
        User::updateOrCreate(
            ['username' => "cashier_race_test"],
            [
                'id'        => '00000000-0000-0000-0000-999999999999',
                'name'      => "K6 Race Condition Cashier",
                'password'  => $hashedPassword,
                'pin_code'  => $hashedPin,
                'role'      => 'cashier',
                'is_active' => true,
            ]
        );

        // ==========================================
        // 4. BUAT OPEN SHIFTS (Hanging Sessions) UNTUK TEST FORCE CLOSE
        // ==========================================
        $this->command->info('⏳ Creating 50 Hanging Open Shifts (For Force Close test)...');
        for ($i = 151; $i <= 200; $i++) {
            CashierShift::firstOrCreate([
                'user_id' => $cashierIds[$i - 1],
                'status'  => CashierShift::STATUS_OPEN,
            ], [
                'shift_id'        => 1, // Morning Shift
                'opening_balance' => 100000,
                'started_at'      => Carbon::now()->subHours(rand(1, 10)),
            ]);
        }

        // ==========================================
        // 5. BULK INSERT DUMMY HISTORY (STRESS TEST REPORTING)
        // ==========================================
        $totalDummyHistory = 10000;
        $chunkSize = 1000;
        
        $this->command->info("⏳ Injecting {$totalDummyHistory} Closed Shift History Records for Backoffice Stress Test...");
        
        $dummyData = [];
        $now = Carbon::now();

        for ($i = 1; $i <= $totalDummyHistory; $i++) {
            $expected = 100000 + rand(50000, 500000);
            $variance = rand(-20000, 20000);
            $closing = $expected + $variance;
            
            $startedAt = (clone $now)->subDays(rand(1, 60))->subHours(rand(8, 15));
            $endedAt = (clone $startedAt)->addHours(rand(6, 9));

            // Perbaikan: Hapus baris ID karena cashier_shifts memakai auto-increment (BigInt)
            $dummyData[] = [
                'user_id'          => $cashierIds[array_rand($cashierIds)],
                'shift_id'         => rand(1, 3),
                'opening_balance'  => 100000,
                'expected_balance' => $expected,
                'closing_balance'  => $closing,
                'variance'         => $variance,
                'status'           => CashierShift::STATUS_CLOSED,
                'started_at'       => $startedAt->toDateTimeString(),
                'ended_at'         => $endedAt->toDateTimeString(),
                'notes'            => 'K6 Dummy History Data ' . $i,
                'created_at'       => $endedAt->toDateTimeString(),
                'updated_at'       => $endedAt->toDateTimeString(),
            ];

            if ($i % $chunkSize === 0) {
                DB::table('cashier_shifts')->insert($dummyData);
                $dummyData = [];
                $this->command->info("   -> Inserted {$i} records...");
            }
        }

        if (!empty($dummyData)) {
            DB::table('cashier_shifts')->insert($dummyData);
        }

        $this->command->info('✅ K6 Load Test Data Seeding Completed Successfully!');
    }
}