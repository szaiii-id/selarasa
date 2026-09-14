<?php

namespace Database\Factories;

use App\Models\RawMaterial;
use App\Models\RawMaterialCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class RawMaterialFactory extends Factory
{
    protected $model = RawMaterial::class;

    public function definition(): array
    {
        return [
            'category_id'   => RawMaterialCategory::factory(),
            
            'sku'           => strtoupper($this->faker->unique()->bothify('RM-####-????')),
            
            'name'          => ucfirst($this->faker->words(3, true)),
            'unit'          => $this->faker->randomElement(['gr', 'ml', 'pcs', 'kg']),
            
            'current_stock' => 0, 
            
            'minimum_stock' => $this->faker->randomFloat(2, 5, 50),
            'is_active'     => true,
        ];
    }

    /**
     * Indicate that the raw material is inactive.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }

    /**
     * Indicate that the raw material is out of stock / low stock.
     */
    public function lowStock(): static
    {
        return $this->state(fn (array $attributes) => [
            'current_stock' => 5, 
            'minimum_stock' => 10, 
        ]);
    }
}