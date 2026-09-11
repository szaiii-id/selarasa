<?php

namespace Database\Factories;

use App\Models\StockMovement;
use App\Models\RawMaterial;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(['IN', 'OUT', 'ADJUSTMENT']);
        
        $balanceBefore = $this->faker->randomFloat(2, 50, 500);
        $quantity = $this->faker->randomFloat(2, 5, 50);

        // Menyesuaikan logika tanda (+/-) sesuai dengan arsitektur bisnis kita
        if ($type === 'OUT') {
            $quantity = -abs($quantity);
        } elseif ($type === 'IN') {
            $quantity = abs($quantity);
        }

        // Hitung balance after yang masuk akal
        $balanceAfter = round($balanceBefore + $quantity, 2);

        return [
            // Otomatis membuat Raw Material jika tidak di-supply
            'raw_material_id' => RawMaterial::factory(),
            
            // Otomatis membuat User (sebagai staf gudang) jika tidak di-supply
            'user_id'         => User::factory(),
            
            'movement_type'   => $type,
            'quantity'        => $quantity,
            'balance_before'  => $balanceBefore,
            'balance_after'   => $balanceAfter,
            'reason'          => $this->faker->sentence(),
            'reference_id'    => 'REF-' . $this->faker->unique()->randomNumber(5, true),
        ];
    }

    /**
     * State specifically for Stock IN
     */
    public function typeIn(): static
    {
        return $this->state(function (array $attributes) {
            $quantity = $this->faker->randomFloat(2, 10, 100);
            $balanceBefore = $attributes['balance_before'] ?? 100;
            return [
                'movement_type'  => 'IN',
                'quantity'       => $quantity,
                'balance_before' => $balanceBefore,
                'balance_after'  => round($balanceBefore + $quantity, 2),
            ];
        });
    }

    /**
     * State specifically for Stock OUT
     */
    public function typeOut(): static
    {
        return $this->state(function (array $attributes) {
            $quantity = -abs($this->faker->randomFloat(2, 10, 50));
            $balanceBefore = $attributes['balance_before'] ?? 100;
            return [
                'movement_type'  => 'OUT',
                'quantity'       => $quantity,
                'balance_before' => $balanceBefore,
                'balance_after'  => round($balanceBefore + $quantity, 2),
            ];
        });
    }
}