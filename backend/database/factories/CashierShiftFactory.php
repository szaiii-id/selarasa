<?php

namespace Database\Factories;

use App\Models\CashierShift;
use App\Models\Shift;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CashierShift>
 */
class CashierShiftFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = CashierShift::class;

    /**
     * Define the model's default state.
     * Default state adalah shift yang baru saja "dibuka" (Start Shift).
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            // Jika ID tidak di-passing saat dipanggil, Factory akan otomatis membuat User dan Shift baru
            'user_id'           => User::factory(),
            'shift_id'          => Shift::factory(),
            
            'opening_balance'   => 500000.00, // Modal laci standar 500 ribu
            'expected_balance'  => null,
            'closing_balance'   => null,
            'variance'          => null,
            
            'status'            => CashierShift::STATUS_OPEN,
            'started_at'        => now(),
            'ended_at'          => null,
            'closed_by_user_id' => null,
            
            'notes'             => $this->faker->optional()->sentence(),
        ];
    }

    /**
     * State helper: Sesi shift yang sudah ditutup normal oleh Kasir (Balanced).
     *
     * Cara pakai: CashierShift::factory()->closed()->create();
     */
    public function closed(): static
    {
        return $this->state(function (array $attributes) {
            // Simulasi ada transaksi masuk sebesar 1 juta
            $expected = $attributes['opening_balance'] + 1000000.00; 
            
            return [
                'status'           => CashierShift::STATUS_CLOSED,
                'expected_balance' => $expected,
                'closing_balance'  => $expected, // Balanced (fisik = sistem)
                'variance'         => 0,
                'ended_at'         => now()->addHours(8),
            ];
        });
    }

    /**
     * State helper: Sesi shift yang ditutup tapi memiliki selisih (Minus/Plus).
     *
     * Cara pakai: CashierShift::factory()->withVariance(-5000)->create();
     */
    public function withVariance(float $amount = -5000.00): static
    {
        return $this->state(function (array $attributes) use ($amount) {
            $expected = $attributes['opening_balance'] + 1000000.00;
            $closing  = $expected + $amount;

            return [
                'status'           => CashierShift::STATUS_CLOSED,
                'expected_balance' => $expected,
                'closing_balance'  => $closing,
                'variance'         => $amount,
                'ended_at'         => now()->addHours(8),
            ];
        });
    }

    /**
     * State helper: Sesi shift yang ditutup PAKSA oleh Manajer (Force Close).
     *
     * Cara pakai: CashierShift::factory()->forceClosed()->create();
     */
    public function forceClosed(): static
    {
        return $this->state(function (array $attributes) {
            $expected = $attributes['opening_balance'] + 500000.00;

            return [
                'status'            => CashierShift::STATUS_CLOSED,
                'expected_balance'  => $expected,
                'closing_balance'   => $expected,
                'variance'          => 0,
                'ended_at'          => now()->addHours(4), // Tutup lebih cepat dari normal
                // Otomatis membuat user dengan role manajer sebagai pelaku
                'closed_by_user_id' => User::factory()->state(['role' => 'manager']), 
                'notes'             => 'FORCE CLOSED BY MANAGER: Device crash.',
            ];
        });
    }
}