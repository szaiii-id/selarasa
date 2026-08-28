<?php

namespace Database\Factories;

use App\Models\Shift;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Shift>
 */
class ShiftFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Shift::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startHour = $this->faker->numberBetween(0, 11);
        
        $endHour = $this->faker->numberBetween(12, 23);

        return [
            'name'       => ucfirst($this->faker->unique()->word()) . ' Shift', 
            
            'start_time' => sprintf('%02d:00:00', $startHour),
            'end_time'   => sprintf('%02d:00:00', $endHour),
            
            'is_active'  => true, 
        ];
    }

    /**
     * State helper: Indicate that the shift is inactive.
     * 
     * Cara pakai di test: Shift::factory()->inactive()->create();
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}