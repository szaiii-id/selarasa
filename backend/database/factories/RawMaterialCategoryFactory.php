<?php

namespace Database\Factories;

use App\Models\RawMaterialCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

class RawMaterialCategoryFactory extends Factory
{
    protected $model = RawMaterialCategory::class;

    public function definition(): array
    {
        return [
            'name'        => ucfirst($this->faker->unique()->words(2, true)),
            'description' => $this->faker->sentence(),
        ];
    }
}