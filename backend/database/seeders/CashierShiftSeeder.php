<?php

namespace Database\Seeders;

use App\Models\CashierShift;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class CashierShiftSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get users by role
        $cashier = User::where('role', 'cashier')->first();
        $manager = User::where('role', 'manager')->first();
        
        if (!$cashier) {
            $this->command->error('Cashier user not found. Run UserSeeder first.');
            return;
        }

        if (!$manager) {
            $this->command->error('Manager user not found. Run UserSeeder first.');
            return;
        }

        // Get shifts
        $morningShift = Shift::where('name', 'Morning Shift')->first();
        $eveningShift = Shift::where('name', 'Evening Shift')->first();
        $nightShift = Shift::where('name', 'Night Shift')->first();

        if (!$morningShift || !$eveningShift || !$nightShift) {
            $this->command->error('Shifts not found. Run ShiftSeeder first.');
            return;
        }

        // ==========================================
        // 1. OPEN SHIFT (Today - Still Active)
        // ==========================================
        CashierShift::create([
            'user_id'         => $cashier->id,
            'shift_id'        => $morningShift->id,
            'opening_balance' => 500000,
            'status'          => CashierShift::STATUS_OPEN,
            'started_at'      => Carbon::now()->subHours(3),
            'notes'           => 'Morning shift started normally',
        ]);
        $this->command->info('Open shift created for cashier.');

        // ==========================================
        // 2. CLOSED SHIFT (Yesterday - Normal Close)
        // ==========================================
        $yesterdayShift = CashierShift::create([
            'user_id'          => $cashier->id,
            'shift_id'         => $morningShift->id,
            'opening_balance'  => 500000,
            'closing_balance'  => 1250000,
            'expected_balance' => 1250000,
            'variance'         => 0,
            'status'           => CashierShift::STATUS_CLOSED,
            'started_at'       => Carbon::yesterday()->setTime(8, 0, 0),
            'ended_at'         => Carbon::yesterday()->setTime(16, 0, 0),
            'notes'            => 'Shift closed normally',
        ]);
        $this->command->info('Closed shift (yesterday) created.');

        // ==========================================
        // 3. CLOSED SHIFT (2 Days Ago - With Variance)
        // ==========================================
        $varianceShift = CashierShift::create([
            'user_id'          => $cashier->id,
            'shift_id'         => $eveningShift->id,
            'opening_balance'  => 500000,
            'closing_balance'  => 1480000,
            'expected_balance' => 1500000,
            'variance'         => -20000,
            'status'           => CashierShift::STATUS_CLOSED,
            'started_at'       => Carbon::now()->subDays(2)->setTime(16, 0, 0),
            'ended_at'         => Carbon::now()->subDays(2)->setTime(23, 59, 59),
            'notes'           => 'Cash shortage Rp 20.000',
        ]);
        $this->command->info('Closed shift (2 days ago) with variance created.');

        // ==========================================
        // 4. CLOSED SHIFT (3 Days Ago - Force Closed)
        // ==========================================
        $forceClosedShift = CashierShift::create([
            'user_id'          => $cashier->id,
            'closed_by_user_id' => $manager->id,
            'shift_id'         => $nightShift->id,
            'opening_balance'  => 500000,
            'closing_balance'  => 500000,
            'expected_balance' => 500000,
            'variance'         => 0,
            'status'           => CashierShift::STATUS_CLOSED,
            'started_at'       => Carbon::now()->subDays(3)->setTime(0, 0, 0),
            'ended_at'         => Carbon::now()->subDays(3)->setTime(4, 30, 0),
            'notes'           => 'FORCE CLOSED BY MANAGER: Cashier left without closing shift',
        ]);
        $this->command->info('Force closed shift (3 days ago) created.');

        // ==========================================
        // 5. CLOSED SHIFT (5 Days Ago - Normal)
        // ==========================================
        $oldShift = CashierShift::create([
            'user_id'          => $cashier->id,
            'shift_id'         => $morningShift->id,
            'opening_balance'  => 500000,
            'closing_balance'  => 980000,
            'expected_balance' => 980000,
            'variance'         => 0,
            'status'           => CashierShift::STATUS_CLOSED,
            'started_at'       => Carbon::now()->subDays(5)->setTime(8, 0, 0),
            'ended_at'         => Carbon::now()->subDays(5)->setTime(16, 0, 0),
            'notes'           => null,
        ]);
        $this->command->info('Closed shift (5 days ago) created.');

        // ==========================================
        // 6. CLOSED SHIFT (8 Days Ago - Outside 7 Days Filter)
        // ==========================================
        $oldShift2 = CashierShift::create([
            'user_id'          => $cashier->id,
            'shift_id'         => $eveningShift->id,
            'opening_balance'  => 500000,
            'closing_balance'  => 1500000,
            'expected_balance' => 1450000,
            'variance'         => 50000,
            'status'           => CashierShift::STATUS_CLOSED,
            'started_at'       => Carbon::now()->subDays(8)->setTime(16, 0, 0),
            'ended_at'         => Carbon::now()->subDays(8)->setTime(23, 59, 59),
            'notes'           => 'Cash overage Rp 50.000',
        ]);
        $this->command->info('Closed shift (8 days ago) created - outside 7 days default filter.');

        $this->command->info('Cashier shift seeding process completed.');
        $this->command->info('Total: 1 open shift, 5 closed shifts (4 within 7 days, 1 outside).');
    }
}