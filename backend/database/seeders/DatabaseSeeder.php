<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
      $this->call([
          UserSeeder::class,
      ]);  

        /**
        * K6 load testing dummy accounts are only needed in the
        * dedicated testing environment, never in local/production.
        */
        if (app()->environment('testing')) {
            $this->call([
                K6LoadTestSeeder::class,
            ]);
        }
    }

}
