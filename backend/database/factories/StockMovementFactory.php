<?php

namespace Database\Factories;

use App\Models\RawMaterial;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockMovementFactory extends Factory
{
    protected $model = StockMovement::class;

    public function definition(): array
    {
        $type = $this->faker->randomElement(StockMovement::TYPES);

        $balanceBefore = $this->faker->randomFloat(2, 50, 500);
        $rawQuantity   = $this->faker->randomFloat(2, 5, 50);

        // Apply sign according to movement type (delta semantics)
        $quantity = match ($type) {
            'IN'         => abs($rawQuantity),
            'OUT'        => -abs($rawQuantity),
            'ADJUSTMENT' => $this->faker->randomElement([
                abs($rawQuantity),         // positive adjustment
                -abs($rawQuantity),        // negative adjustment
            ]),
        };

        // Guard: never allow negative balance in factory output
        if (round($balanceBefore + $quantity, 2) < 0) {
            $quantity = -$balanceBefore;
        }

        $balanceAfter = round($balanceBefore + $quantity, 2);

        return [
            // Auto-create relations if not supplied
            'raw_material_id' => RawMaterial::factory(),
            'user_id'         => User::factory(),

            'movement_type'   => $type,
            'quantity'        => $quantity,
            'balance_before'  => $balanceBefore,
            'balance_after'   => $balanceAfter,
            'reason'          => $this->faker->sentence(4),
            'reference_id'    => 'REF-' . strtoupper($this->faker->bothify('????-#####')),
        ];
    }

    // ==========================================
    // STATES
    // ==========================================

    /**
     * State: Stock IN only (quantity positive).
     */
    public function typeIn(): static
    {
        return $this->state(function (array $attributes) {
            $quantity      = $this->faker->randomFloat(2, 10, 100);
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
     * State: Stock OUT only (quantity negative).
     * Ensures balance_after never goes below zero.
     */
    public function typeOut(): static
    {
        return $this->state(function (array $attributes) {
            $balanceBefore = $attributes['balance_before'] ?? 100;
            $rawQuantity   = $this->faker->randomFloat(2, 10, 50);

            // Cap quantity so balance_after >= 0
            $quantity = -min($rawQuantity, $balanceBefore);

            return [
                'movement_type'  => 'OUT',
                'quantity'       => $quantity,
                'balance_before' => $balanceBefore,
                'balance_after'  => round($balanceBefore + $quantity, 2),
            ];
        });
    }

    /**
     * State: ADJUSTMENT (signed delta).
     *
     * @param float|null $delta  Explicit delta. If null, random (can be +/-).
     */
    public function typeAdjustment(?float $delta = null): static
    {
        return $this->state(function (array $attributes) use ($delta) {
            $balanceBefore = $attributes['balance_before'] ?? 100;

            if ($delta === null) {
                // Random signed delta, never zero (respects quantity.not_in:0)
                do {
                    $delta = $this->faker->randomFloat(2, -50, 50);
                } while ($delta === 0.0);
            }

            // Guard: never allow negative balance
            if (round($balanceBefore + $delta, 2) < 0) {
                $delta = -$balanceBefore;
            }

            return [
                'movement_type'  => 'ADJUSTMENT',
                'quantity'       => $delta,
                'balance_before' => $balanceBefore,
                'balance_after'  => round($balanceBefore + $delta, 2),
            ];
        });
    }
}